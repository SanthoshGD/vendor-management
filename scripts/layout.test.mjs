// Layout regressions the screenshot exposed: horizontal overflow, truncated
// tab labels, and a wall of equal-weight primary buttons.
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const js = await readFile('/tmp/ss/dist/assets/index.js','utf8');
const css = await readFile('/tmp/ss/dist/assets/index.css','utf8');
const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body><div id="root"></div></body></html>`,
  { runScripts:'outside-only', pretendToBeVisual:true, url:'https://x.test/' });
const { window } = dom;
window.scrollTo=()=>{}; window.confirm=()=>true;
window.Element.prototype.scrollIntoView=()=>{}; window.console.error=()=>{};
window.eval(js); await new Promise(r=>setTimeout(r,900));
const doc=window.document, q=s=>[...doc.querySelectorAll(s)], t=()=>doc.body.textContent;
const byText=(s,n)=>q(s).find(e=>(e.textContent||'').toLowerCase().includes(n.toLowerCase()));
const click=async(e,ms=300)=>{if(!e)return false;e.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,ms));return true;};
let pass=0,fail=0; const ok=(l,c)=>{ if(c){pass++;console.log('  ok  '+l);}else{fail++;console.log('FAIL  '+l);} };

await click(byText('.sidebar-link','Vendor queue'));
await click(byText('.worklist-row','Guangzhou'),450);

console.log('\n— structure reads in one order —');
ok('identity row present', !!doc.querySelector('.rw-identity'));
ok('primary-flow stepper present', !!doc.querySelector('.rw-stepper'));
ok('stepper shows all four stages of the brief flow', q('.rw-stepper li').length === 4);
ok('exactly one verdict band', q('.rw-verdict').length === 1);
ok('master queue present', !!doc.querySelector('.review-queue'));
ok('detail pane present', !!doc.querySelector('.rw-detail'));
ok('no leftover three-tab rail', q('.rail-tabs').length === 0);

console.log('\n— no truncated labels —');
const heads = q('.queue-group-head strong').map(e=>e.textContent.trim());
ok('queue group labels are full words', heads.every(h=>!h.includes('…') && !/\.\.\.$/.test(h)) && heads.length>0);
ok('labels are real language, not codes', heads.some(h=>/Needs a decision|Worth a glance|Full evidence pack/.test(h)));

console.log('\n— one primary action per context (Hick + Von Restorff) —');
const verdictPrimaries = q('.rw-verdict .button.primary');
ok('verdict band carries exactly one primary button', verdictPrimaries.length === 1);
ok('rare decisions are behind an overflow menu', !!doc.querySelector('.rw-more'));
ok('reject is not competing at top level', !byText('.rw-verdict-actions > button','Reject'));
await click(doc.querySelector('.rw-more .icon-button'),200);
ok('overflow menu opens with the rare decisions', /Reject application/i.test(t()) && /Escalate to supervisor/i.test(t()));
await click(doc.querySelector('.rw-more .icon-button'),150);
const detailPrimaries = q('.detail-actions .button.primary');
ok('detail pane carries at most one primary button', detailPrimaries.length <= 1);

console.log('\n— master/detail actually drives the pane —');
const rows = q('.queue-row');
ok('queue lists selectable items', rows.length > 1);
const firstTitle = doc.querySelector('.detail-head h2')?.textContent;
await click(rows[1],300);
ok('selecting a different row changes the detail pane', doc.querySelector('.detail-head h2')?.textContent !== firstTitle);
ok('detail pane explains what / why / evidence / suggestion',
  /Why this matters/i.test(t()) && /The evidence/i.test(t()) && /What the agent suggests/i.test(t()));
ok('the clause is shown inline, not behind a modal', !!doc.querySelector('.detail-clause'));

console.log('\n— extracted-data panel no longer shouts on every row —');
await click(byText('.queue-group-head','Full evidence pack'),300);
// the Mandarin business licence is the multi-field document
await click(byText('.queue-row','LICENSE · '),400);
const fieldCards = q('.field-card');
ok(`multi-field document opened (${fieldCards.length} fields)`, fieldCards.length >= 5);
const primaries = q('.field-card .button.primary');
ok(`only the active field offers actions (${primaries.length} primary button for ${fieldCards.length} fields)`, primaries.length === 1);
ok('inactive fields explain how to act on them', /Select to review/i.test(t()));

console.log('\n— chat is a drawer, not a third column —');
ok('chat is not in the layout by default', !doc.querySelector('.vendor-chat'));
await click(byText('.rw-identity button','Ask the pack'),300);
ok('opens as an overlay drawer', !!doc.querySelector('.rw-drawer'));
await click(doc.querySelector('.rw-drawer-close'),250);
ok('closes cleanly', !doc.querySelector('.rw-drawer'));

console.log('\n— no fixed track can force horizontal overflow —');
const grids = ['.rw-body','.detail-split'];
for (const g of grids) {
  const el = doc.querySelector(g);
  if (!el) continue;
  const cols = window.getComputedStyle(el).gridTemplateColumns;
  ok(`${g} uses only flexible/minmax(0) tracks — got "${cols}"`, /minmax\(0/.test(cols) || cols === '1fr' || cols === 'none' || cols === '');
}
ok('workspace clips rather than scrolls sideways',
  window.getComputedStyle(doc.querySelector('.review-workspace')).overflow === 'hidden');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
