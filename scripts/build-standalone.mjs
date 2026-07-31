import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(projectDir, 'dist');
const sourceHtml = await readFile(resolve(distDir, 'index.html'), 'utf8');

const stylesheetMatch = sourceHtml.match(/<link rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
const scriptMatch = sourceHtml.match(/<script type="module"[^>]+src="([^"]+)"[^>]*><\/script>/);

if (!stylesheetMatch || !scriptMatch) {
  throw new Error('Could not locate the production CSS and JavaScript assets.');
}

const assetPath = (value) => resolve(distDir, value.replace(/^\/+/, ''));
const css = (await readFile(assetPath(stylesheetMatch[1]), 'utf8')).replace(
  /@import\s+(?:url\([^)]*\)|["'][^"']+["'])\s*;?/g,
  '',
);
const javascript = await readFile(assetPath(scriptMatch[1]), 'utf8');

const portableHtml = sourceHtml
  .replace(/\s*<link rel="icon"[^>]*>/, '')
  .replace(/\s*<meta property="og:image"[^>]*>/, '')
  .replace(/\s*<meta name="twitter:image"[^>]*>/, '')
  .replace(stylesheetMatch[0], () => `<style>${css}</style>`)
  .replace(scriptMatch[0], '')
  .replace(
    '</body>',
    () =>
      `<noscript><p style="font-family:system-ui;padding:24px">JavaScript is required to run this interactive prototype.</p></noscript><script>${javascript.replaceAll('</script>', '<\\/script>')}</script></body>`,
  );

const outputName = basename(process.argv[2] || 'StyleSphere-Nexus.html');
const shareOutput = resolve(projectDir, '..', outputName);

await writeFile(shareOutput, portableHtml, 'utf8');

console.log(`Standalone prototype created: ${shareOutput}`);
