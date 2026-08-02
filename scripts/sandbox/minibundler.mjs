// ---------------------------------------------------------------------------
// Sandbox-only bundler for the shareable standalone HTML.
//
// Why this exists: the repo's own `pnpm build:share` (vite 8 / rolldown) cannot
// run in this Linux sandbox - the installed native binaries are Windows builds,
// and the sandbox network truncates any download over ~4.7 MB, so esbuild and
// esbuild-wasm cannot be fetched intact either. Sucrase (pure JS, 3 MB) can be,
// so JSX transformation is solved; module graph resolution is done here.
//
// What it produces is exactly what vite would hand to
// `scripts/build-standalone.mjs`: `dist/assets/index.js` and
// `dist/assets/index.css`. Nothing downstream needs to know it was built here.
//
// Design: every module - the app's own ESM files and the vendor CJS bundles -
// is compiled to a CommonJS factory and registered in one tiny runtime. Going
// through CJS for everything means one resolution path and one interop rule,
// instead of two half-working ones that disagree at the boundary.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { transform } from 'sucrase';

const ROOT = process.argv[2] || '/tmp/b2';
const ENTRY = resolve(ROOT, 'src/main.jsx');
const NM = resolve(ROOT, 'node_modules');

// Bare specifiers are mapped explicitly rather than by walking package.json
// `exports`. The set is small and fixed, and being explicit means a resolution
// mistake shows up as a missing file at build time, not as a subtly wrong
// module at runtime.
const BARE = {
  react: `${NM}/react/index.js`,
  'react/jsx-runtime': `${NM}/react/jsx-runtime.js`,
  'react-dom': `${NM}/react-dom/index.js`,
  'react-dom/client': `${NM}/react-dom/client.js`,
  scheduler: `${NM}/scheduler/index.js`,
  // Produced by slim-lucide.mjs - the same helpers plus only the icons this
  // app imports. See that script for why the full CJS bundle can't be shaken.
  'lucide-react': `${NM}/lucide-slim/index.js`,
};

const cssChunks = [];
const modules = new Map(); // id -> compiled factory source
const EXT = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx'];

function resolveSpec(spec, fromFile) {
  if (BARE[spec]) return BARE[spec];
  if (spec.startsWith('.') || spec.startsWith('/')) {
    const base = spec.startsWith('/') ? spec : resolve(dirname(fromFile), spec);
    for (const ext of EXT) {
      const candidate = base + ext;
      if (existsSync(candidate) && extname(candidate)) return candidate;
    }
    throw new Error(`Cannot resolve ${spec} from ${fromFile}`);
  }
  // Fall back to a plain node_modules lookup so an unlisted dependency fails
  // loudly here rather than producing a bundle with a hole in it.
  const pkgMain = join(NM, spec, 'package.json');
  if (existsSync(pkgMain)) {
    const pkg = JSON.parse(readFileSync(pkgMain, 'utf8'));
    return resolve(join(NM, spec), pkg.main || 'index.js');
  }
  throw new Error(`Unresolved bare import: ${spec} (from ${fromFile})`);
}

// Assets referenced from JS become data URIs, matching what the vite config
// does for the small images this app ships.
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function load(file) {
  if (modules.has(file)) return;
  modules.set(file, null); // reserve first, so a cycle does not recurse forever

  const ext = extname(file);

  if (ext === '.css') {
    cssChunks.push(readFileSync(file, 'utf8'));
    modules.set(file, 'function(){}');
    return;
  }

  if (MIME[ext]) {
    const b64 = readFileSync(file).toString('base64');
    modules.set(file, `function(module){module.exports=${JSON.stringify(`data:${MIME[ext]};base64,${b64}`)}}`);
    return;
  }

  const source = readFileSync(file, 'utf8');
  const isVendorCjs = file.includes('/node_modules/');

  let code;
  if (isVendorCjs) {
    // Vendor bundles are already CommonJS; they only need their own
    // `require()` calls rewired, which the runtime below handles.
    code = source;
  } else {
    const out = transform(source, {
      transforms: ['jsx', 'imports'],
      jsxRuntime: 'automatic',
      filePath: file,
      production: true,
    });
    code = out.code;
  }

  // Collect every dependency this module asks for and compile it too.
  const deps = new Map();
  const requireRe = /require\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  let match;
  while ((match = requireRe.exec(code))) {
    const spec = match[1];
    if (deps.has(spec)) continue;
    // React's entry points require both the development and production builds
    // behind a runtime `if (process.env.NODE_ENV ...)`. A static scan sees both,
    // which would double the bundle with code that can never execute here.
    if (/\.development\./.test(spec)) {
      deps.set(spec, null);
      continue;
    }
    let target;
    try {
      target = resolveSpec(spec, file);
    } catch (error) {
      if (isVendorCjs) continue; // optional/dev-only requires inside vendor code
      throw error;
    }
    deps.set(spec, target);
    load(target);
  }

  const map = JSON.stringify(Object.fromEntries([...deps].filter(([, target]) => target)));
  modules.set(file, `function(module,exports,__req){var require=function(s){return __req(${map}[s]||s)};\n${code}\n}`);
}

load(ENTRY);

const registry = [...modules.entries()]
  .map(([id, factory]) => `${JSON.stringify(id)}:${factory}`)
  .join(',\n');

// React's CJS entry branches on `process.env.NODE_ENV` at require time, so the
// bundle has to supply one. Declaring it inside the IIFE keeps it off `window`.
const bundle = `(function(){
var process={env:{NODE_ENV:"production"}};
var __defs={${registry}};
var __cache={};
function __req(id){
  if(__cache[id])return __cache[id].exports;
  var m=__cache[id]={exports:{}};
  var f=__defs[id];
  if(!f)throw new Error('Module not found: '+id);
  f(m,m.exports,__req);
  return m.exports;
}
__req(${JSON.stringify(ENTRY)});
})();`;

mkdirSync(join(ROOT, 'dist/assets'), { recursive: true });
writeFileSync(join(ROOT, 'dist/assets/index.js'), bundle);
writeFileSync(join(ROOT, 'dist/assets/index.css'), cssChunks.join('\n'));

console.log(`modules: ${modules.size}`);
console.log(`js: ${(bundle.length / 1024).toFixed(0)} KB`);
console.log(`css: ${(cssChunks.join('\n').length / 1024).toFixed(0)} KB`);
