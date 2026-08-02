// Direct assertions on the governance layer - the brief's sealed acceptance
// criteria, tested at the engine level rather than through the DOM.
import { canPerform, evaluateVendor, buildChaserThreads, triageVendor } from './src/agents/agentEngine.js';
import { DEFAULT_AGENT_CONFIG, AGENT_CATALOG, FORBIDDEN_ACTIONS } from './src/agents/agentCatalog.js';
import { INITIAL_VENDORS } from './src/data/mockData.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log('  ok  ' + l); } else { fail++; console.log('FAIL  ' + l); } };
const cfg = DEFAULT_AGENT_CONFIG();

console.log('\n- criterion 3: AI never approves -');
for (const [actionId, label] of FORBIDDEN_ACTIONS) {
  const anyAgentAllowed = AGENT_CATALOG.some((a) => canPerform(cfg, a.id, actionId, 'Compliance Manager').allowed);
  ok(`no agent can "${label}"`, !anyAgentAllowed);
}
ok('forbidden actions absent from every allowlist',
  AGENT_CATALOG.every((a) => a.actions.every((act) => !FORBIDDEN_ACTIONS.some(([id]) => id === act.id))));

console.log('\n- permission inheritance -');
ok('a Supplier-relations owner cannot let an agent escalate',
  !canPerform(cfg, 'chaser', 'escalate_contact', 'Supplier relations').allowed);
ok('a Compliance Manager owner can',
  canPerform(cfg, 'chaser', 'escalate_contact', 'Compliance Manager').allowed);
ok('refusal states a reason', !!canPerform(cfg, 'chaser', 'escalate_contact', 'Supplier relations').reason);

console.log('\n- human-in-the-loop gate -');
ok('suggest-only agents queue rather than execute',
  canPerform(cfg, 'compliance', 'score_readiness', 'Compliance Manager').requiresApproval === true);
ok('approval-required actions queue',
  canPerform(cfg, 'intake', 'route_application', 'Compliance Manager').requiresApproval === true);
ok('low-risk allowlisted actions run autonomously',
  canPerform(cfg, 'chaser', 'send_followup', 'Compliance Manager').requiresApproval === false);

console.log('\n- disabling a skill really changes the output -');
const silkRoad = INITIAL_VENDORS.find((v) => v.id === 'VEN-8842');
const full = evaluateVendor(silkRoad, { allVendors: INITIAL_VENDORS, config: cfg });
const off = structuredClone(cfg);
off.agents.find((a) => a.id === 'verification').skills.find((s) => s.id === 'cross-doc').enabled = false;
const reduced = evaluateVendor(silkRoad, { allVendors: INITIAL_VENDORS, config: off });
ok('identical entity names raise no cross-doc noise at all', (() => {
  const dhaka = INITIAL_VENDORS.find((v) => v.id === 'VEN-9104');
  return !evaluateVendor(dhaka, { allVendors: INITIAL_VENDORS, config: cfg })
    .findings.some((f) => f.kind === 'cross_doc');
})());
ok('cross-doc findings disappear when the skill is off',
  full.findings.some((f) => f.kind === 'cross_doc') && !reduced.findings.some((f) => f.kind === 'cross_doc'));

console.log('\n- cross-document engine -');
const silk = INITIAL_VENDORS.find((v) => v.id === 'VEN-8842');
const silkA = evaluateVendor(silk, { allVendors: INITIAL_VENDORS, config: cfg });
const legalForm = silkA.findings.find((f) => f.kind === 'cross_doc');
ok('"Co., Ltd." vs "Ltd." is treated as a legal-form variance, not a conflict', legalForm?.tier === 'green');
ok('and it says so in plain language', /legal form/i.test(legalForm?.title || ''));

console.log('\n- intake: duplicate detection -');
const pearl = INITIAL_VENDORS.find((v) => v.id === 'VEN-2208');
const pearlA = evaluateVendor(pearl, { allVendors: INITIAL_VENDORS, config: cfg });
const dup = pearlA.findings.find((f) => f.kind === 'duplicate');
ok('same tax number across two applicants is flagged', !!dup);
ok('flagged as blocking', dup?.tier === 'red');
ok('cites PROC-2.4', dup?.clause?.id === 'PROC-2.4');
ok('names the other supplier record', /VEN-3312/.test(dup?.detail || ''));

console.log('\n- compliance thresholds -');
ok('$1M liability cover breaches the $2M floor', pearlA.findings.some((f) => f.kind === 'threshold' && f.clause?.id === 'INS-3.1'));

console.log('\n- activation gate -');
ok('incomplete pack cannot activate', pearlA.gates.canActivate === false);
ok('and mandatory-docs gate is the reason', pearlA.gates.mandatoryDocsComplete === false);
const active = INITIAL_VENDORS.find((v) => v.id === 'VEN-4491');
const activeA = evaluateVendor({ ...active, missingCount: 0, docs: '5/5' }, { allVendors: INITIAL_VENDORS, config: cfg });
ok('a fully approved, complete supplier passes the gate', activeA.gates.canActivate === true);
ok('recommendation is never an approval verb',
  ['HOLD', 'RECOMMEND_WITH_NOTES', 'RECOMMEND_APPROVAL'].includes(pearlA.recommendation));

console.log('\n- chaser: localisation & ladder -');
const zh = buildChaserThreads(INITIAL_VENDORS.find((v) => v.id === 'VEN-3312'), { config: cfg })[0];
ok('Guangzhou supplier is chased in Mandarin', zh.languageName === 'Mandarin');
ok('message body is actually non-Latin', /[一-鿿]/.test(zh.steps[0].body));
ok('English copy retained for the audit trail', /StyleSphere/.test(zh.steps[0].english));
ok('ladder is request → follow-up → escalate → handoff', zh.steps.map((s) => s.kind).join(',') === 'request,followup,escalate,handoff');
ok('stops after three attempts rather than sending a fourth', zh.steps.filter((s) => s.kind !== 'handoff').length === 3);
const bn = buildChaserThreads(INITIAL_VENDORS.find((v) => v.id === 'VEN-9104'), { config: cfg })[0];
ok('Dhaka supplier is chased in Bengali', bn.languageName === 'Bengali');
ok('disabling the localise skill falls back to English', (() => {
  const c = structuredClone(cfg);
  c.agents.find((a) => a.id === 'chaser').skills.find((s) => s.id === 'localise').enabled = false;
  return buildChaserThreads(INITIAL_VENDORS.find((v) => v.id === 'VEN-3312'), { config: c })[0].languageName === 'English';
})());
ok('switching the Chaser off removes all threads', (() => {
  const c = structuredClone(cfg);
  c.agents.find((a) => a.id === 'chaser').enabled = false;
  return buildChaserThreads(INITIAL_VENDORS.find((v) => v.id === 'VEN-3312'), { config: c }).length === 0;
})());

console.log('\n- triage bands -');
const t = triageVendor({ ...pearl, missingCount: 2, finalStatus: null }, pearlA, buildChaserThreads(pearl, { config: cfg }));
ok('a supplier with a blocking non-missing finding lands in "decide"', t.band === 'decide');
ok('and the row explains what it is waiting on', !!t.waitingOn);

console.log('\n- determinism -');
const a1 = JSON.stringify(evaluateVendor(silk, { allVendors: INITIAL_VENDORS, config: cfg }).findings.map((f) => [f.id, f.tier]));
const a2 = JSON.stringify(evaluateVendor(silk, { allVendors: INITIAL_VENDORS, config: cfg }).findings.map((f) => [f.id, f.tier]));
ok('the same input produces the same findings', a1 === a2);
ok('chase timelines do not churn between calls',
  JSON.stringify(buildChaserThreads(pearl, { config: cfg })) === JSON.stringify(buildChaserThreads(pearl, { config: cfg })));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
