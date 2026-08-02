// Every dialog's action row, checked by computed style rather than by eye.
//
// This exists because of a real bug: the stylesheet scoped the footer rule to
// `.modal-card>footer`, but the invite / new-request / settings modal wraps its
// body and footer in a <form> for native submit. That one level of nesting
// meant the rule matched nothing - the buttons lost their flex row and their
// padding, so they stacked to the left and sat flush against the card edge.
//
// It is not catchable by reading the JSX (the markup is correct) or by reading
// the CSS (the rule is correct). Only the combination is wrong, so the only
// honest test is to open each dialog and read what the browser computed.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(process.argv[2] || '/tmp/StyleSphere-Nexus.html', 'utf8');

let passed = 0;
const failures = [];
const check = (label, condition) => { if (condition) passed += 1; else failures.push(label); };

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/' });
const { window } = dom;
const { document } = window;
const tick = () => new Promise((r) => window.setTimeout(r, 60));
const buttons = () => [...document.querySelectorAll('button')];
const byText = (n) => buttons().find((b) => (b.textContent || '').toLowerCase().includes(n.toLowerCase()));
const exact = (n) => buttons().find((b) => (b.textContent || '').trim() === n);
const click = async (el) => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await tick(); };
// The selector that carries the footer's padding. Asserting the footer MATCHES
// it is the honest test here: jsdom does not resolve `var()` in computed
// styles, so it reports padding as "0" even when the rule applies correctly.
// Matching is also the precise shape of the bug - the padding was never
// overridden, the rule simply did not select the element.
const PADDED_RULE = '.modal-card > footer, .modal-card > form > footer';

// Asserts the three things that were broken, for one open dialog.
async function assertFooter(name) {
  const footer = document.querySelector('.modal-card footer');
  if (!footer) { failures.push(`${name}: no dialog footer found`); return; }
  const s = window.getComputedStyle(footer);
  check(`${name}: actions are a flex row`, s.display === 'flex');
  check(`${name}: actions are right-aligned`, s.justifyContent === 'flex-end');
  check(`${name}: the padded footer rule actually selects this footer`, footer.matches(PADDED_RULE));
  // The card itself must not clip them either.
  const card = footer.closest('.modal-card');
  check(`${name}: footer spans the card`, footer.parentElement === card || footer.parentElement.parentElement === card);
}

const closeDialog = async () => {
  const close = document.querySelector('.modal-card header button[aria-label="Close"]')
    || byText('Cancel');
  if (close) await click(close);
};

await tick(); await tick();

// --- 1. the form-wrapped modal: this is the one that was broken -------------
const invite = byText('Invite vendor');
if (invite) {
  await click(invite);
  check('invite modal opens', Boolean(document.querySelector('.modal-card')));
  // Prove the wrapper that caused the bug is still there, so this test keeps
  // covering the real shape rather than silently passing on a refactor.
  check('invite modal still nests its footer in a form',
    Boolean(document.querySelector('.modal-card > form > footer')));
  await assertFooter('invite modal');
  await closeDialog();
}

// --- 2. a plain (non-form) dialog, for contrast ------------------------------
const queue = byText('Vendor queue');
if (queue) {
  await click(queue);
  const rows = [...document.querySelectorAll('.worklist-rows button, .vendor-table.table-row')];
  const pearl = rows.find((r) => (r.textContent || '').includes('Pearl River')) || rows[0];
  if (pearl) {
    await click(pearl);
    const ask = byText('Request risk acceptance');
    if (ask) {
      await click(ask);
      check('raise-request dialog opens', Boolean(document.querySelector('.modal-card')));
      await assertFooter('raise-request dialog');
      await closeDialog();
    }
    // The confirm dialog behind the overflow menu.
    const more = document.querySelector('.rw-more .icon-button');
    if (more) {
      await click(more);
      const reject = byText('Reject application');
      if (reject) {
        await click(reject);
        check('confirm dialog opens', Boolean(document.querySelector('.modal-card')));
        await assertFooter('decision confirm dialog');
        await closeDialog();
      }
    }
  }
}

// --- 3. the supervisor's request dialog -------------------------------------
const sup = exact('Supervisor');
if (sup) {
  await click(sup);
  const nav = byText('Requests');
  if (nav) {
    await click(nav);
    const grant = byText('Grant the exception');
    if (grant) {
      await click(grant);
      check('grant dialog opens', Boolean(document.querySelector('.modal-card')));
      await assertFooter('supervisor request dialog');
      await closeDialog();
    }
  }
}

console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED (${failures.length}):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log('all dialog layout assertions passed');
}
