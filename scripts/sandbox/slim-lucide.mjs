// Tree-shakes lucide-react by hand.
//
// The installed lucide-react ships only a CommonJS bundle (its ESM entry files
// are missing), and a CJS bundle cannot be tree-shaken by static analysis - so
// naively bundling it drags ~1,600 unused icons into the shareable HTML.
//
// The bundle is unminified and completely regular: every icon is
// `const <Name> = createLucideIcon("<slug>", <nodeVar>)`, and every `<nodeVar>`
// is a standalone `const __iconNode$xx = [...]` array. That regularity is what
// makes a targeted extraction safe here: we keep the shared prelude verbatim,
// then copy only the declarations the app actually imports.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] || '/tmp/b2';
const SRC = join(ROOT, 'src');
const BUNDLE = join(ROOT, 'node_modules/lucide-react/dist/cjs/lucide-react.js');

// --- 1. which icons does the app actually import? ---------------------------
const used = new Set();
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!['.js', '.jsx'].includes(extname(full))) continue;
    const source = readFileSync(full, 'utf8');
    const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
    let m;
    while ((m = re.exec(source))) {
      for (const name of m[1].split(',')) {
        const clean = name.trim().split(/\s+as\s+/)[0].trim();
        if (clean) used.add(clean);
      }
    }
  }
};
walk(SRC);

// --- 2. pull the matching declarations out of the CJS bundle ----------------
const code = readFileSync(BUNDLE, 'utf8');
const firstIcon = code.indexOf('\nconst __iconNode');
const prelude = code.slice(0, firstIcon);

const nodeDecls = [];
const iconDecls = [];
const missing = [];
const seenNodes = new Set();
const seenIcons = new Set();

// Many familiar names (AlertCircle, XCircle, Home…) are deprecated aliases that
// the bundle exports as `exports.AlertCircle = CircleAlert;`. Resolve those to
// the real declaration first, then emit both names.
const aliasOf = (name) => {
  const hit = code.match(new RegExp(`^exports\\.${name} = (\\w+);$`, 'm'));
  return hit && hit[1] !== name ? hit[1] : null;
};

for (const name of [...used].sort()) {
  const real = code.match(new RegExp(`^const ${name} = createLucideIcon\\(`, 'm')) ? name : aliasOf(name);
  if (!real) { missing.push(name); continue; }
  const re = new RegExp(`^const ${real} = createLucideIcon\\((.*?)\\);$`, 'm');
  const hit = code.match(re);
  if (!hit) { missing.push(name); continue; }
  if (!seenIcons.has(real)) { seenIcons.add(real); iconDecls.push(hit[0]); }
  if (real !== name && !seenIcons.has(name)) { seenIcons.add(name); iconDecls.push(`const ${name} = ${real};`); }

  // Dedupe by variable name, not by the extracted text: two icons can share a
  // node array, and comparing slices is a fragile way to notice that.
  const nodeVar = hit[1].split(',').pop().trim();
  if (seenNodes.has(nodeVar)) continue;
  seenNodes.add(nodeVar);
  const start = code.indexOf(`\nconst ${nodeVar} = [`);
  if (start === -1) { missing.push(`${name} (node ${nodeVar})`); continue; }
  // Match brackets rather than looking for a `\n];` terminator: short icons are
  // written on one line, so a line-based terminator overshoots into the next
  // declarations and silently duplicates them.
  const open = code.indexOf('[', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '[') depth += 1;
    else if (code[i] === ']') { depth -= 1; if (depth === 0) { end = i; break; } }
  }
  nodeDecls.push(`${code.slice(start + 1, end + 1)};`);
}

if (missing.length) {
  console.error('Could not extract:', missing.join(', '));
  process.exit(1);
}

const out = [
  prelude,
  ...nodeDecls,
  ...iconDecls,
  ...[...used].sort().map((n) => `exports.${n} = ${n};`),
].join('\n\n');

mkdirSync(join(ROOT, 'node_modules/lucide-slim'), { recursive: true });
writeFileSync(join(ROOT, 'node_modules/lucide-slim/index.js'), out);

console.log(`icons kept: ${used.size} (of ~1600)`);
console.log(`slim lucide: ${(out.length / 1024).toFixed(0)} KB (was ${(code.length / 1024).toFixed(0)} KB)`);
