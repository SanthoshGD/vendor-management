// Engine-level assertions for the operations added in this pass.
import { evaluateVendor, buildChaserThreads } from './src/agents/agentEngine.js';
import { DEFAULT_AGENT_CONFIG } from './src/agents/agentCatalog.js';
import { INITIAL_VENDORS } from './src/data/mockData.js';
let pass=0,fail=0; const ok=(l,c)=>{ if(c){pass++;console.log('  ok  '+l);}else{fail++;console.log('FAIL  '+l);} };
const cfg = DEFAULT_AGENT_CONFIG();
const pearl = INITIAL_VENDORS.find(v=>v.id==='VEN-2208');

console.log('\n— human resolutions close findings —');
const before = evaluateVendor(pearl,{allVendors:INITIAL_VENDORS,config:cfg});
const dup = before.findings.find(f=>f.kind==='duplicate');
const after = evaluateVendor(pearl,{allVendors:INITIAL_VENDORS,config:cfg,
  resolutions:{[dup.id]:{outcome:'accept',label:'Accepted',reason:'same site, merged',by:'Priya Nair',at:'now'}}});
ok('a resolved finding leaves the blocker set', after.blockers.length === before.blockers.length - 1);
ok('and carries its reason for the audit trail', after.findings.find(f=>f.id===dup.id).resolution.reason === 'same site, merged');
ok('resolving every blocker flips the recommendation off HOLD', (() => {
  const res = {}; for (const b of before.blockers) res[b.id]={outcome:'accept',label:'Accepted',reason:'r',by:'x',at:'n'};
  return evaluateVendor(pearl,{allVendors:INITIAL_VENDORS,config:cfg,resolutions:res}).recommendation !== 'HOLD';
})());
ok('but the activation gate still needs the documents', (() => {
  const res = {}; for (const b of before.blockers) res[b.id]={outcome:'accept',label:'A',reason:'r',by:'x',at:'n'};
  return evaluateVendor(pearl,{allVendors:INITIAL_VENDORS,config:cfg,resolutions:res}).gates.mandatoryDocsComplete === false;
})());

console.log('\n— chase ladder actually advances —');
const t0 = buildChaserThreads(pearl,{config:cfg})[0];
const scheduled = t0.steps.find(s=>s.status==='scheduled');
ok('there is a scheduled rung to push', !!scheduled);
const t1 = buildChaserThreads(pearl,{config:cfg,chaseState:{[t0.docId]:{forced:[scheduled.kind]}}})[0];
ok('"send now" marks that rung sent', t1.steps.find(s=>s.kind===scheduled.kind).status === 'sent');
ok('and it is flagged as sent ahead of schedule', t1.steps.find(s=>s.kind===scheduled.kind).sentEarly === true);
const sent = (t) => t.steps.filter(s=>s.status==='sent').length;
ok('the number of sent rungs increases', sent(t1) === sent(t0) + 1);
ok('handoff is not counted as a supplier contact attempt',
  t1.attempts === t1.steps.filter(s=>s.status==='sent' && s.kind!=='handoff').length);
const tp = buildChaserThreads(pearl,{config:cfg,chaseState:{[t0.docId]:{paused:true}}})[0];
ok('pausing stops every rung', tp.steps.every(s=>s.status==='scheduled'));
ok('and the thread reports itself paused', tp.state === 'paused' && tp.paused === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
