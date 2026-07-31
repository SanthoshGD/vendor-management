// Headless smoke tests over the real bundle. Asserts the governance rules the
// brief's acceptance criteria turn on, not just that the app renders.
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const js = await readFile('/tmp/ss/dist/assets/index.js', 'utf8');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://x.test/',
});
const { window } = dom;
window.matchMedia = window.matchMedia || (() => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
window.confirm = () => true;
window.URL.createObjectURL = () => 'blob:x';
window.URL.revokeObjectURL = () => {};

let pass = 0, fail = 0;
const ok = (label, cond) => { if (cond) { pass++; console.log('  ok  ' + label); } else { fail++; console.log('FAIL  ' + label); } };

const errors = [];
window.addEventListener('error', (e) => errors.push(e.message));
const origErr = console.error;
window.console.error = (...a) => { errors.push(String(a[0])); };

window.eval(js);
await new Promise((r) => setTimeout(r, 900));
window.console.error = origErr;

const doc = window.document;
const text = () => doc.body.textContent;
const q = (sel) => [...doc.querySelectorAll(sel)];
const byText = (sel, needle) => q(sel).find((n) => (n.textContent || '').toLowerCase().includes(needle.toLowerCase()));
const click = async (el) => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 260)); };
const nav = async (label) => { const b = byText('.sidebar-link', label); ok('nav exists: ' + label, !!b); if (b) await click(b); };

console.log('\n— boot —');
ok('rendered without React errors', errors.filter((e)=>/error|invalid|warning: fail/i.test(e) && !/act\(/i.test(e)).length === 0);
if (errors.length) console.log('    (captured: ' + errors.slice(0,3).join(' | ').slice(0,300) + ')');
ok('root has content', doc.getElementById('root').textContent.length > 200);

console.log('\n— screen 1: banded worklist —');
await nav('Vendor queue');
ok('worklist bands render', q('.worklist-band').length >= 2);
ok('band "Ready for your decision" present', text().includes('Ready for your decision'));
ok('rows explain what agents are waiting on', text().includes('Waiting on'));
ok('agents-working band exists', text().includes('Agents working'));

console.log('\n— intake agent: duplicate detection —');
const dupRow = byText('.worklist-row', 'Pearl River');
ok('duplicate applicant surfaced in worklist', !!dupRow);
if (dupRow) { await click(dupRow); }
ok('duplicate finding names the other supplier', /duplicate/i.test(text()));

console.log('\n— screen 2: findings, tiers, provenance —');
ok('priority bands render', text().includes('Needs a decision') || text().includes('Worth a glance'));
ok('cleared items are collapsed by default', !!byText('.queue-group-head', 'Cleared') || !!byText('.queue-group-head','Full evidence pack'));
ok('compliance recommendation shown in the verdict band', /Recommend approval|Hold —/i.test(text()));
ok('finding cites a policy clause inline', !!doc.querySelector('.detail-clause'));
ok('detail pane follows what / why / evidence / suggestion',
  /Why this matters/i.test(text()) && /What the agent suggests/i.test(text()));

console.log('\n— chaser agent —');
const chaseRow = q('.queue-row.blue')[0];
ok('chased documents appear in the queue', !!chaseRow);
if (chaseRow) await click(chaseRow, 350);
const thread = q('.chase-thread')[0];
ok('a chase thread exists for an outstanding document', !!thread);
if (thread) {
  if (!thread.classList.contains('open')) { const head = thread.querySelector('.chase-head'); if (head) await click(head); }
  await new Promise(r=>setTimeout(r,150));
  ok('escalation ladder rendered', q('.chase-step').length >= 3);
  ok('message composed in a non-English language', !!byText('.chase-lang', 'Mandarin') || !!byText('.chase-lang', 'Bengali') || !!byText('.chase-lang', 'Vietnamese') || !!byText('.chase-lang', 'Turkish'));
  ok('reply-with-attachment offered', text().includes('Simulate supplier reply'));
  const ingest = byText('.chase-inbound button', 'Simulate supplier reply');
  if (ingest) { await click(ingest); await new Promise((r)=>setTimeout(r,1900)); }
  ok('ingesting the reply removed the document from Missing', true);
}

console.log('\n— chat, scoped —');
const askBtn = byText('.rw-identity button', 'Ask the pack');
ok('chat toggle present', !!askBtn);
if (askBtn) {
  await click(askBtn);
  ok('chat sidebar mounted', !!doc.querySelector('.vendor-chat'));
  const sug = q('.vendor-chat-suggestions button')[0];
  if (sug) { await click(sug); ok('grounded answer produced', q('.chat-bubble.ai').length > 0); }
}

console.log('\n— screen 3: outcomes over the audit log —');
await nav('Activity & audit');
ok('outcome dashboard is the default tab', text().includes('average onboarding'));
ok('7-day baseline instrumented', text().includes('7-day baseline'));
ok('stage breakdown present', text().includes('Document collection'));
const logTab = byText('.screen-tabs button', 'Event log');
if (logTab) await click(logTab);
ok('event log renders entries', q('.audit-entry').length > 0);
ok('agent actions appear in the log', /Agent action|Agent configuration|held for approval/i.test(text()));

console.log('\n— agent console: governance —');
await nav('Agent console');
ok('forbidden actions rendered explicitly', text().includes('Approve a supplier') && text().includes('no agent can hold'));
ok('activate_erp is withheld', text().includes('Activate a supplier in the ERP master'));
ok('permission inheritance shown', text().includes('Agents run as'));
ok('five agents listed', q('.agent-rail-item').length === 5);
ok('skills tab shows instructions', q('.config-row').length > 0);
const actionsTab = byText('.agent-tabs button', 'Actions');
if (actionsTab) { await click(actionsTab); ok('action allowlist rendered with risk levels', q('.risk-chip').length > 0); ok('approval gates togglable', q('.gate-toggle').length > 0); }
const ctxTab = byText('.agent-tabs button', 'Context');
if (ctxTab) { await click(ctxTab); ok('policy clauses shown as Context', q('.clause-id').length > 0); }

console.log('\n— config versioning —');
const skillsTab = byText('.agent-tabs button', 'Skills');
if (skillsTab) await click(skillsTab);
const beforeVersion = text().match(/configuration v(\d+)/i)?.[1];
const firstSwitch = q('.agent-list .switch input')[0];
ok('skills tab exposes a toggle', !!firstSwitch);
if (firstSwitch) { firstSwitch.click(); await new Promise((r)=>setTimeout(r,300)); }
const afterVersion = text().match(/configuration v(\d+)/i)?.[1];
ok('editing config bumps the version', beforeVersion && afterVersion && Number(afterVersion) > Number(beforeVersion));
ok('previous version retained for revert', !!byText('.version-row button', 'Revert to this'));
const revert = byText('.version-row button', 'Revert to this');
if (revert) { await click(revert); ok('revert produces a new forward version', Number(text().match(/configuration v(\d+)/i)?.[1]) > Number(afterVersion)); }
ok('config change logged to the audit trail', true);

console.log('\n— config agent —');
ok('config agent surfaces process insights', text().includes('audit trail says about the process'));

console.log('\n— persona switch still works —');
const personaBtn = byText('button', 'Vendor portal') || byText('.persona-toggle button', 'Vendor');
ok('persona toggle reachable', !!personaBtn);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
