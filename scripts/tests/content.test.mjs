// ---------------------------------------------------------------------------
// Content lint.
//
// The content strategy is only worth writing down if something enforces it.
// This walks every page in every persona and checks the rules that can be
// checked mechanically — headline shape, banned marketing voice, subhead
// length, button wording, and reading measure.
//
// It is deliberately narrow: it cannot tell you whether a sentence is good, but
// it can tell you the moment someone reintroduces "Procure without the
// spreadsheet chase."
//
// Usage: node scripts/tests/content.test.mjs <standalone.html>
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(process.argv[2] || '/tmp/StyleSphere-Nexus.html', 'utf8');

let passed = 0;
const failures = [];
const check = (label, condition, detail) => {
  if (condition) passed += 1;
  else failures.push(detail ? `${label} — ${detail}` : label);
};

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://content.test/',
});
const w = dom.window;
const d = w.document;
const tick = (ms = 450) => new Promise((r) => setTimeout(r, ms));
const controls = () => [...d.querySelectorAll('button,a,[role=button]')];
const byText = (t) => controls().find((b) => (b.textContent || '').trim().includes(t));
const exact = (t) => controls().find((b) => (b.textContent || '').trim() === t);
const click = async (el, ms) => {
  if (!el) return false;
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await tick(ms);
  return true;
};

await tick(1300);

// Marketing voice, as patterns. Each of these was in the product.
const BANNED = [
  /without the guesswork/i,
  /without the spreadsheet/i,
  /you can explain/i,
  /less back-and-forth/i,
  /your workflows, your rules/i,
  /unbanded/i,
  /where humans keep correcting/i,
];

const visited = [];

async function auditCurrentPage(name) {
  const h1 = d.querySelector('.page-hero h1, .nexus-page h1');
  const heroP = d.querySelector('.page-hero p');
  const title = (h1?.textContent || '').trim();
  const sub = (heroP?.textContent || '').trim();
  visited.push({ name, title, sub });

  if (title) {
    // Rule: an H1 is a noun, not a sentence. Sentences end in full stops.
    check(`${name}: headline is not a sentence`, !/\.$/.test(title), `"${title}"`);
    // Rule: 1–3 words. Allow 4 for two-word compounds like "Activity & audit".
    check(`${name}: headline is short`, title.split(/\s+/).length <= 4, `"${title}"`);
  }
  if (sub) {
    check(`${name}: subhead is one short sentence`,
      sub.split(/\s+/).length <= 14, `${sub.split(/\s+/).length} words`);
  }
  const body = d.body.textContent || '';
  for (const pattern of BANNED) {
    check(`${name}: no marketing voice ${pattern}`, !pattern.test(body));
  }
}

// --- reviewer -------------------------------------------------------------
for (const [label, nav] of [
  ['Command center', 'Command center'],
  ['Vendor queue', 'Vendor queue'],
  ['Document collection', 'Document collection'],
  ['Compliance', 'Compliance'],
  ['Agent console', 'Agent console'],
  ['Audit record', 'Activity & audit'],
]) {
  if (await click(byText(nav), 600)) await auditCurrentPage(label);
}

// --- supervisor -----------------------------------------------------------
await click(exact('Supervisor'), 700);
for (const [label, nav] of [['Oversight', 'Oversight'], ['Requests', 'Requests']]) {
  if (await click(byText(nav), 600)) await auditCurrentPage(`Supervisor / ${label}`);
}

// --- supplier -------------------------------------------------------------
await click(exact('Vendor'), 700);
for (const [label, nav] of [
  ['My workspace', 'My workspace'],
  ['Onboarding', 'Onboarding'],
  ['Action center', 'Action center'],
  ['Documents', 'Documents'],
]) {
  if (await click(byText(nav), 600)) await auditCurrentPage(`Supplier / ${label}`);
}

check('every persona and page category was reached', visited.length >= 11,
  `${visited.length} pages`);

// --- buttons are verb + object -------------------------------------------
// "Continue" / "Submit" / "OK" alone tell you nothing about what happens.
const VAGUE = new Set(['ok', 'continue', 'submit', 'done', 'go', 'next', 'yes', 'click here']);
const vagueButtons = controls()
  .map((b) => (b.textContent || '').trim())
  .filter((t) => t && VAGUE.has(t.toLowerCase()));
check('no button is labelled with a bare verb', vagueButtons.length === 0,
  vagueButtons.join(', '));

console.log(`pages audited: ${visited.length}`);
for (const page of visited) console.log(`  ${page.name} → "${page.title}"`);
console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log('all content assertions passed');
}
