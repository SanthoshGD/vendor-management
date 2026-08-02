// End-to-end walk of the brief's primary flow:
//   AI Document Review → Compliance Review → Human Approval → Activated in ERP
// The point of this test is that every step must be reachable by CLICKING,
// not by calling context functions directly.
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const js = await readFile('/tmp/ss/dist/assets/index.js', 'utf8');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://x.test/'
});
const { window } = dom;
window.scrollTo = () => { }; window.confirm = () => true;
window.Element.prototype.scrollIntoView = () => { };
window.console.error = () => { };
window.eval(js);
await new Promise(r => setTimeout(r, 900));

const doc = window.document;
const t = () => doc.body.textContent;
const q = (s) => [...doc.querySelectorAll(s)];
const byText = (s, n) => q(s).find(e => (e.textContent || '').toLowerCase().includes(n.toLowerCase()));
const click = async (e, ms = 280) => { if (!e) return false; e.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, ms)); return true; };
const type = async (el, v) => { const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 120)); };
let pass = 0, fail = 0; const ok = (l, c) => { if (c) { pass++; console.log('  ok  ' + l); } else { fail++; console.log('FAIL  ' + l); } };

const nav = async (l) => click(byText('.sidebar-link', l));

console.log('\n- 1. worklist → open a supplier with blocking findings -');
await nav('Vendor queue');
ok('bulk "Run agents on all open" control exists', !!byText('.page-actions button', 'Run agents on all open'));
await click(byText('.page-actions button', 'Run agents on all open'), 600);
ok('running agents reports recommendations held for approval',
  /held for your approval/i.test(t()));

const target = byText('.worklist-row', 'Pearl River');
ok('duplicate-flagged supplier is in the worklist', !!target);
await click(target, 400);

console.log('\n- 2. AI review: agents ran, blockers present -');
ok('review workspace opened', !!doc.querySelector('.review-workspace'));
ok('"Run agents" is an operation here too', !!byText('.rw-verdict-actions button', 'Run agents'));
// The primary action is "Recommend approval" below the reviewer's delegated
// limit and "Send for approval" above it. Either way it must be blocked while
// findings are open, so assert on the primary button rather than its label.
ok('approval is blocked while findings are open', doc.querySelector('.rw-verdict-actions .button.primary')?.disabled === true);
ok('blocking findings are listed in the queue', q('.queue-row.red').length > 0);

console.log('\n- 3a. clear outstanding documents via the chaser -');
let cg = 0;
while (cg++ < 6) {
  const chaseRow = q('.queue-row.blue')[0];
  if (!chaseRow) break;
  await click(chaseRow, 350);
  const ingest = byText('.chase-inbound button', 'Simulate supplier reply');
  if (!ingest) break;
  await click(ingest, 2000);
}
ok('no documents left outstanding', q('.queue-row.blue').length === 0);

console.log('\n- 3b. resolve every remaining blocking finding with a stated reason -');
let guard = 0;
while (guard++ < 12) {
  const rows = q('.queue-row.red');
  if (!rows.length) break;
  await click(rows[0], 320);
  const btn = byText('.detail-actions button', 'Accept & clear')
    || byText('.detail-actions button', 'Accept the agent')
    || byText('.detail-actions button', 'Settled off-platform')
    || byText('.detail-actions button', 'Received off-platform');
  if (!btn) break;
  await click(btn, 220);
  const ta = doc.querySelector('.modal-card textarea');
  if (ta) {
    const confirmBtn = byText('.modal-card footer button', 'Record decision');
    ok('reason is required before a finding can be closed', confirmBtn?.disabled === true);
    await type(ta, 'Verified against the national registry and the supplier master; same site, single record retained.');
    await click(byText('.modal-card footer button', 'Record decision'), 320);
  }
}
ok('all blocking findings cleared through the UI', q('.queue-row.red').length === 0);
ok('resolution is shown with its reason', /Accepted the agent|Dismissed as a false positive/i.test(t()));


console.log('\n- 5. human approval -');
const approve = byText('.rw-verdict-actions button', 'Recommend approval');
ok('approval unlocked once findings and documents are clear', approve && !approve.disabled);
await click(approve, 250);
const notes = doc.querySelector('.modal-card textarea');
ok('decision requires a rationale', !!notes && byText('.modal-card footer button', 'Confirm')?.disabled === true);
if (notes) { await type(notes, 'Duplicate resolved to a single site record; full evidence pack verified.'); await click(byText('.modal-card footer button', 'Confirm'), 400); }

console.log('\n- 6. ERP activation, the step that was previously unreachable -');
await nav('Vendor queue');
await click(byText('.worklist-row', 'Pearl River'), 400);
const activate = byText('.rw-verdict button', 'Activate in ERP');
ok('activation control is now reachable', !!activate);
ok('gate is satisfied so it is enabled', activate && !activate.disabled);
await click(activate, 400);
ok('supplier is Active in the ERP master', /Active in the ERP supplier master as SUP-/i.test(t()));

console.log('\n- 7. everything landed in the audit trail -');
await nav('Activity & audit');
await click(byText('.screen-tabs button', 'Event log'), 300);
const log = t();
ok('finding resolutions logged', /Agent finding|resolved/i.test(log));
ok('human decision logged', /Decision recorded/i.test(log));
ok('ERP activation logged', /ERP activation|Activated as/i.test(log));
ok('agent actions logged with an actor', /Agent action executed/i.test(log));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
