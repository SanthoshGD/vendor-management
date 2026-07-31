import type { AgentDefinition, AgentConfig } from '../types/agent';

export const AUTONOMY = {
  suggest: {
    id: 'suggest', label: 'Suggest only',
    detail: 'The agent prepares work and proposes it. A human triggers every action.',
  },
  approve: {
    id: 'approve', label: 'Act with approval',
    detail: 'The agent may execute low-risk actions itself; anything higher waits for a named human.',
  },
  autonomous: {
    id: 'autonomous', label: 'Autonomous within allowlist',
    detail: 'The agent executes any action on its allowlist without prompting, and logs every one.',
  },
} as const;

export const FORBIDDEN_ACTIONS = [
  ['approve_vendor', 'Approve a supplier', 'PROC-5.1'],
  ['reject_vendor', 'Reject a supplier', 'PROC-5.1'],
  ['activate_erp', 'Activate a supplier in the ERP master', 'PROC-5.1'],
  ['waive_document', 'Waive a mandatory document', 'PROC-3.3'],
  ['edit_audit_log', 'Alter or delete an audit entry', 'PROC-5.1'],
] as const;

const skill = (id: string, name: string, instruction: string, enabled = true) => ({ id, name, instruction, enabled });
const action = (id: string, label: string, risk: string, requiresApproval: boolean, enabled = true) => ({ id, label, risk, requiresApproval, enabled });

export const AGENT_CATALOG: AgentDefinition[] = [
  {
    id: 'intake',
    name: 'Intake Agent',
    glyph: 'IN',
    tone: 'blue',
    purpose: 'Gathers information and guides an application through the right process before a human ever opens it.',
    autonomy: 'autonomous',
    channels: ['portal', 'email'],
    skills: [
      skill('prefill', 'Pre-fill from the uploaded pack',
        'Read every file the supplier uploads before asking a single question. Extract entity name, registration numbers, addresses and contacts, and only ask for what genuinely cannot be read.'),
      skill('dynamic-checklist', 'Build the checklist dynamically',
        'Derive the mandatory document list from category, country of manufacture and contract value. Never present a fixed twelve-document wall to a supplier who needs six.'),
      skill('duplicate', 'Detect a re-application',
        'Fuzzy-match every new applicant against the supplier master on tax registration, bank account, site address and director names. Surface a suspected duplicate before review begins, never after.'),
    ],
    actions: [
      action('extract_fields', 'Extract fields from an uploaded document', 'low', false),
      action('prefill_profile', 'Pre-fill supplier profile fields', 'low', false),
      action('set_checklist', 'Set the required-document checklist', 'medium', false),
      action('flag_duplicate', 'Flag a suspected duplicate applicant', 'medium', false),
      action('route_application', 'Route the application to a reviewer', 'medium', true),
    ],
    context: ['PROC-2.4', 'PROC-3.3', 'GST-1.2'],
  },
  {
    id: 'chaser',
    name: 'Chaser Agent',
    glyph: 'CH',
    tone: 'amber',
    purpose: 'Drives an incomplete file to a complete one — in the supplier\'s language, in the channel they actually read.',
    autonomy: 'autonomous',
    channels: ['whatsapp', 'email'],
    skills: [
      skill('first-request', 'Make the first request specific',
        'Name the exact document, say why it is needed, cite the clause, and show an example. Never send "documents outstanding".'),
      skill('ladder', 'Follow an escalation ladder',
        'Follow up at 48h, then at 96h copying the supplier\'s manager contact. At 144h stop and hand the thread to a human rather than sending a fourth message.'),
      skill('localise', 'Write in the supplier\'s working language',
        'Compose in the language of the country of manufacture — Mandarin, Vietnamese, Bengali, Turkish, German — with an English copy underneath for the audit trail.'),
      skill('ingest-reply', 'Accept a reply with an attachment',
        'Treat a photo or scan attached to an email or WhatsApp reply as a submission. OCR it, file it against the open request, and close the request. Never require a portal login.'),
      skill('reject-precisely', 'Explain a rejection at page level',
        'If a resubmission fails, say which page and what is wrong — "page 2 is cut off, resend that page only" — never "document rejected".'),
    ],
    actions: [
      action('send_request', 'Send a document request', 'low', false),
      action('send_followup', 'Send a scheduled follow-up', 'low', false),
      action('escalate_contact', 'Copy the supplier\'s manager contact', 'medium', false),
      action('ingest_attachment', 'Ingest an emailed or messaged attachment', 'medium', false),
      action('handoff_human', 'Hand the thread to a human reviewer', 'medium', false),
      action('pause_thread', 'Pause chasing this supplier', 'medium', true),
    ],
    context: ['PROC-3.3', 'REG-9.4', 'SCC-7.4'],
  },
  {
    id: 'verification',
    name: 'Verification Agent',
    glyph: 'VF',
    tone: 'violet',
    purpose: 'Reads the evidence pack as one body of evidence rather than a stack of separate files.',
    autonomy: 'autonomous',
    channels: ['portal'],
    skills: [
      skill('cross-doc', 'Check consistency across documents',
        'Compare the registered entity name, registration numbers and signatories across every document in the pack. Treat legal-form abbreviation (Ltd. / Limited / Co., Ltd.) as an acceptable variance; treat a genuinely different entity as a blocking conflict.'),
      skill('recency', 'Check validity windows',
        'Flag any certificate expiring inside 90 days, any audit older than 18 months, and any insurance lapsing before the contract term ends.'),
      skill('tiering', 'Tier every finding by confidence',
        'Auto-clear at 90% and above. Route 60–89% for review. Route below 60%, and every cross-document conflict, for a reviewer decision.'),
      skill('corroborate', 'Corroborate against an external registry',
        'Where a public registry exists — national tax portal, IEC directory, denied-party lists — check the claimed registration resolves to an active record.'),
    ],
    actions: [
      action('run_extraction', 'Run extraction over a document', 'low', false),
      action('raise_finding', 'Raise a finding for human review', 'low', false),
      action('auto_clear', 'Auto-clear a field at ≥90% confidence', 'medium', false),
      action('query_registry', 'Query an external registry', 'medium', false),
      action('request_reupload', 'Request a legible re-upload', 'medium', false),
    ],
    context: ['PROC-2.1', 'GST-1.2', 'IEC-2.3', 'FIN-4.1', 'PROC-6.2'],
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    glyph: 'CO',
    tone: 'green',
    purpose: 'Assesses readiness against policy and writes a cited recommendation. It cannot decide.',
    autonomy: 'suggest',
    channels: ['portal'],
    skills: [
      skill('assess', 'Assess against the policy pack',
        'Run the completed file against every clause in scope. Produce a readiness recommendation with a citation for each supporting and each opposing finding.'),
      skill('blockers', 'State blockers plainly',
        'List what specifically prevents approval and what would clear it. A reviewer should never have to work out why the recommendation is "hold".'),
      skill('brief', 'Write the reviewer brief',
        'Summarise the supplier in five lines a human can act on: who they are, what is verified, what is open, what the risk is, what you recommend.'),
    ],
    actions: [
      action('score_readiness', 'Score onboarding readiness', 'low', false),
      action('write_recommendation', 'Write a cited recommendation', 'low', false),
      action('propose_escalation', 'Propose escalation to Legal', 'medium', true),
    ],
    context: ['PROC-2.1', 'PROC-3.3', 'PROC-5.1', 'PROC-6.2', 'SCC-7.4', 'REG-9.1', 'REG-9.4', 'INS-3.1'],
  },
  {
    id: 'config',
    name: 'Config Agent',
    glyph: 'CF',
    tone: 'neutral',
    purpose: 'Watches the audit trail and tells the compliance manager where the process itself is failing.',
    autonomy: 'suggest',
    channels: ['portal'],
    skills: [
      skill('override-clusters', 'Cluster human overrides',
        'Group every human correction by field, document type and country. A repeated override in one cluster is an extraction defect, not a reviewer preference.'),
      skill('stage-timing', 'Measure time per stage',
        'Track how long each supplier spends at each stage, split by country and category, and surface the outliers.'),
      skill('propose-change', 'Propose a configuration change',
        'Turn each pattern into a concrete proposal — a prompt to retune, a checklist item to drop, a translation to fix — for a human to accept or dismiss.'),
    ],
    actions: [
      action('read_audit', 'Read the audit trail', 'low', false),
      action('surface_insight', 'Surface a process insight', 'low', false),
      action('propose_config', 'Propose an agent configuration change', 'high', true),
    ],
    context: ['PROC-5.1'],
  },
];

export const AGENTS_BY_ID: Record<string, AgentDefinition> = Object.fromEntries(
  AGENT_CATALOG.map((a) => [a.id, a])
);

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Vendor onboarding executive': ['read', 'review', 'recommend', 'request_docs'],
  'Compliance Manager': ['read', 'review', 'recommend', 'request_docs', 'decide', 'activate', 'configure_agents'],
  'Sourcing manager': ['read', 'review', 'request_docs'],
  'Supplier relations': ['read', 'request_docs'],
};

export const DEFAULT_AGENT_CONFIG = (): AgentConfig => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System default',
  agents: AGENT_CATALOG.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.purpose,
    glyph: agent.glyph,
    tone: agent.tone,
    purpose: agent.purpose,
    autonomy: agent.autonomy,
    channels: [...(agent.channels || [])],
    skills: (agent.skills || []).map((s) => ({ ...s })),
    actions: (agent.actions || []).map((a) => ({ ...a })),
    thresholdLabel: agent.thresholdLabel || '',
    thresholdDefault: agent.thresholdDefault || '',
    enabled: true,
  })),
});
