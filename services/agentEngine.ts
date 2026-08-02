import { DOC_CLAUSE, getClause } from './policyPack';
import { AGENTS_BY_ID, ROLE_PERMISSIONS, FORBIDDEN_ACTIONS } from './agentCatalog';
import type { Vendor } from '../types/vendor';
import type { AuditLogEntry } from '../types/audit';
import type { AgentConfig, TriageAssessment, AssessmentFinding } from '../types/agent';

const FORBIDDEN_IDS = new Set(FORBIDDEN_ACTIONS.map(([id]) => id));

export function agentConfigFor(config: AgentConfig | null | undefined, agentId: string) {
  return config?.agents?.find((a) => a.id === agentId) || null;
}

export function skillEnabled(config: AgentConfig | null | undefined, agentId: string, skillId: string): boolean {
  const entry = agentConfigFor(config, agentId);
  if (!entry?.enabled) return false;
  return entry.skills?.find((s) => s.id === skillId)?.enabled ?? false;
}

export function canPerform(config: AgentConfig | null | undefined, agentId: string, actionId: string, actorRole: string) {
  const definition = AGENTS_BY_ID[agentId];
  if (!definition) return { allowed: false, reason: 'Unknown agent.' };

  if (FORBIDDEN_IDS.has(actionId as any)) {
    return {
      allowed: false, blocked: 'forbidden', clauseId: 'PROC-5.1',
      reason: 'This action is withheld from every agent by policy PROC-5.1 - human approval is mandatory.',
    };
  }

  const entry = agentConfigFor(config, agentId);
  if (!entry?.enabled) return { allowed: false, blocked: 'disabled', reason: `${definition.name} is switched off.` };

  const inAllowlist = (definition.actions || []).find((a) => a.id === actionId);
  if (!inAllowlist) {
    return {
      allowed: false, blocked: 'allowlist',
      reason: `"${actionId}" is not on ${definition.name}'s action allowlist, so it cannot be performed at any autonomy level.`,
    };
  }

  const configured = (entry.actions || []).find((a) => a.id === actionId);
  if (!configured?.enabled) {
    return { allowed: false, blocked: 'disabled-action', reason: `"${inAllowlist.label}" has been disabled for ${definition.name}.` };
  }

  const permissions = ROLE_PERMISSIONS[actorRole] || ROLE_PERMISSIONS['Supplier relations'];
  const riskMap: Record<string, string> = { medium: 'review', high: 'decide' };
  const needs = riskMap[inAllowlist.risk];
  if (needs && !permissions.includes(needs)) {
    return {
      allowed: false, blocked: 'permission',
      reason: `The record owner (${actorRole}) does not hold "${needs}" permission, so the agent running as them cannot either.`,
    };
  }

  const requiresApproval = configured.requiresApproval || entry.autonomy === 'suggest';
  return {
    allowed: true, requiresApproval, label: inAllowlist.label, risk: inAllowlist.risk,
    reason: requiresApproval
      ? `Permitted, but held for human approval (${entry.autonomy === 'suggest' ? 'agent is in suggest-only mode' : 'action is marked approval-required'}).`
      : `Permitted under ${definition.name}'s allowlist at ${entry.autonomy} autonomy.`,
  };
}

const LEGAL_FORMS = /\b(co|company|ltd|limited|pvt|private|inc|corp|corporation|gmbh|ag|a\.?s|as|llc|plc|sdn|bhd|jsc|tnhh|cong ty)\b/g;

const normalizeEntity = (value: any) => String(value || '')
  .toLowerCase()
  .replace(/[.,()'"&]/g, ' ')
  .replace(/[-–-]/g, ' ')
  .replace(LEGAL_FORMS, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenOverlap = (a: string, b: string): number => {
  const left = new Set(normalizeEntity(a).split(' ').filter(Boolean));
  const right = new Set(normalizeEntity(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.max(left.size, right.size);
};

const ENTITY_FIELD_KEYS = new Set(['legal_name', 'account_holder_name', 'signatory_name', 'legal_representative']);

const TIERS: Record<string, number> = { green: 0, amber: 1, red: 2 };
export const tierRank = (tier: string) => TIERS[tier] ?? 0;

const finding = (props: any): AssessmentFinding => ({
  resolved: false,
  blocking: props.tier === 'red',
  clause: getClause(props.clauseId) || null,
  ...props,
});

export function tierForConfidence(confidence: number): 'green' | 'amber' | 'red' {
  if (confidence >= 90) return 'green';
  if (confidence >= 60) return 'amber';
  return 'red';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function readDate(raw: any): Date | null {
  const value = String(raw || '');
  const cjk = value.match(/(\d{4})年\s*(\d{1,2})月/);
  if (cjk) return new Date(Date.UTC(Number(cjk[1]), Number(cjk[2]) - 1, 28));
  const dmy = value.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (dmy) {
    const month = MONTHS.indexOf(dmy[2].toLowerCase());
    if (month >= 0) return new Date(Date.UTC(Number(dmy[3]), month, Number(dmy[1])));
  }
  const my = value.match(/([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (my) {
    const month = MONTHS.indexOf(my[1].toLowerCase());
    if (month >= 0) return new Date(Date.UTC(Number(my[2]), month, 28));
  }
  return null;
}

const DAY = 86400000;

export function evaluateVendor(vendor: Vendor, options: { allVendors?: Vendor[]; config?: AgentConfig | null; now?: number; resolutions?: Record<string, any> } = {}): any {
  const { allVendors = [], config, now = Date.now(), resolutions = {} } = options;
  const findings: any[] = [];
  const push = (f: any) => findings.push(finding(f));

  const enabled = (agentId: string, skillId: string) => (config ? skillEnabled(config, agentId, skillId) : true);

  if (enabled('intake', 'duplicate')) {
    const myNumbers = new Set(vendor.documents
      .flatMap((d) => d.fields)
      .filter((f) => /registration_number|tax_registration_number|iban_account_no/.test(f.key))
      .map((f) => String(f.value).replace(/\s/g, '').toUpperCase()));

    for (const other of allVendors) {
      if (other.id === vendor.id) continue;
      const shared = other.documents.flatMap((d) => d.fields)
        .find((f) => /registration_number|tax_registration_number|iban_account_no/.test(f.key)
          && myNumbers.has(String(f.value).replace(/\s/g, '').toUpperCase()));
      if (shared) {
        push({
          id: `${vendor.id}-dup-${other.id}`, agentId: 'intake', tier: 'red', kind: 'duplicate',
          title: 'Suspected duplicate of an existing supplier',
          detail: `${shared.label} "${shared.value}" is already on record against ${other.name} (${other.id}). The same manufacturing site may be re-applying under a different trading name.`,
          clauseId: 'PROC-2.4', confidence: 94,
          recommendation: 'Confirm whether this is the same site before review continues. If it is, merge into the existing record rather than onboarding twice.',
          relatedVendorId: other.id,
          evidence: [{ label: shared.label, value: shared.value, source: `${vendor.name} + ${other.name}` }],
        });
      }
    }
  }

  if (enabled('verification', 'cross-doc')) {
    const claims: any[] = [];
    for (const doc of vendor.documents) {
      for (const fieldItem of doc.fields) {
        if (!ENTITY_FIELD_KEYS.has(fieldItem.key)) continue;
        if (fieldItem.key === 'signatory_name' || fieldItem.key === 'legal_representative') continue;
        claims.push({ doc, field: fieldItem, name: fieldItem.translatedValue || fieldItem.value });
      }
    }
    for (let i = 1; i < claims.length; i += 1) {
      const base = claims[0];
      const other = claims[i];
      const overlap = tokenOverlap(base.name, other.name);
      const identical = base.name.trim() === other.name.trim();
      if (identical) continue;

      const normalisedMatch = normalizeEntity(base.name) === normalizeEntity(other.name);
      const tier = normalisedMatch ? 'green' : overlap >= 0.6 ? 'amber' : 'red';
      push({
        id: `${vendor.id}-xdoc-${other.doc.id}-${other.field.key}`,
        agentId: 'verification', tier, kind: 'cross_doc',
        title: normalisedMatch
          ? 'Entity name differs only by legal form'
          : tier === 'amber' ? 'Entity name varies across the pack' : 'Entity name conflict across the pack',
        detail: normalisedMatch
          ? `"${base.name}" on the ${base.doc.title} and "${other.name}" on the ${other.doc.title} resolve to the same entity once the legal-form abbreviation is normalised. PROC-2.1 treats this as acceptable.`
          : `"${base.name}" on the ${base.doc.title} does not reconcile with "${other.name}" on the ${other.doc.title} (${Math.round(overlap * 100)}% token match).`,
        clauseId: other.doc.code === 'BANK' ? 'FIN-4.1' : 'PROC-2.1',
        docId: other.doc.id, fieldKey: other.field.key,
        confidence: Math.round(60 + overlap * 39),
        resolved: Boolean(other.field.resolved),
        recommendation: normalisedMatch
          ? 'Accept. No supplier action required - this is an abbreviation, not a different company.'
          : tier === 'amber'
            ? 'Confirm which name is authoritative against the registry, then correct the weaker source.'
            : 'Do not proceed. Request a corrected document naming the contracting entity.',
        evidence: [
          { label: base.field.label, value: base.name, source: base.doc.title, docId: base.doc.id, fieldKey: base.field.key },
          { label: other.field.label, value: other.name, source: other.doc.title, docId: other.doc.id, fieldKey: other.field.key },
        ],
      });
    }
  }

  if (enabled('verification', 'tiering')) {
    for (const doc of vendor.documents) {
      for (const fieldItem of doc.fields) {
        const tier = tierForConfidence(fieldItem.confidence);
        if (tier === 'green' && !fieldItem.diagnostic) {
          push({
            id: `${vendor.id}-conf-${doc.id}-${fieldItem.key}`, agentId: 'verification', tier: 'green', kind: 'extraction',
            title: `${fieldItem.label} read cleanly`,
            detail: `Extracted at ${fieldItem.confidence}% confidence and auto-cleared under the 90% threshold.`,
            clauseId: DOC_CLAUSE[doc.code], docId: doc.id, fieldKey: fieldItem.key,
            confidence: fieldItem.confidence, resolved: true, autoCleared: true,
            recommendation: 'No action needed.',
            evidence: [{ label: fieldItem.label, value: fieldItem.translatedValue || fieldItem.value, source: doc.title, docId: doc.id, fieldKey: fieldItem.key }],
          });
          continue;
        }
        push({
          id: `${vendor.id}-conf-${doc.id}-${fieldItem.key}`, agentId: 'verification', tier,
          kind: 'extraction',
          title: tier === 'red' ? `${fieldItem.label} could not be read reliably` : `${fieldItem.label} needs review`,
          detail: fieldItem.diagnostic || `Extracted at ${fieldItem.confidence}% confidence, below the ${tier === 'red' ? '60' : '90'}% auto-clear threshold.`,
          clauseId: DOC_CLAUSE[doc.code], docId: doc.id, fieldKey: fieldItem.key,
          confidence: fieldItem.confidence, resolved: Boolean(fieldItem.resolved),
          recommendation: tier === 'red'
            ? 'Read the source page and either correct the value or request a legible re-upload.'
            : 'Compare against the highlighted region and accept if correct.',
          evidence: [{ label: fieldItem.label, value: fieldItem.translatedValue || fieldItem.value, source: doc.title, docId: doc.id, fieldKey: fieldItem.key }],
        });
      }
    }
  }

  if (enabled('verification', 'recency')) {
    for (const doc of vendor.documents) {
      for (const fieldItem of doc.fields) {
        if (!/expir/i.test(fieldItem.key) && !/expir/i.test(fieldItem.label)) continue;
        const when = readDate(fieldItem.translatedValue || fieldItem.value);
        if (!when) continue;
        const days = Math.round((when.getTime() - now) / DAY);
        if (days > 90) continue;
        const tier = days < 0 ? 'red' : 'amber';
        push({
          id: `${vendor.id}-exp-${doc.id}-${fieldItem.key}`, agentId: 'verification', tier, kind: 'recency',
          title: days < 0 ? `${doc.title} has expired` : `${doc.title} expires in ${days} days`,
          detail: days < 0
            ? `The validity date reads ${fieldItem.translatedValue || fieldItem.value}, which is in the past. PROC-6.2 requires cover for the full initial contract term.`
            : `The validity date reads ${fieldItem.translatedValue || fieldItem.value}. PROC-6.2 requires evidence expiring inside 90 days to be confirmed as under renewal before approval.`,
          clauseId: 'PROC-6.2', docId: doc.id, fieldKey: fieldItem.key,
          confidence: fieldItem.confidence, resolved: Boolean(fieldItem.resolved),
          recommendation: days < 0
            ? 'Request the renewed certificate before proceeding.'
            : 'Ask the supplier to confirm the renewal is in progress, then accept.',
          evidence: [{ label: fieldItem.label, value: fieldItem.translatedValue || fieldItem.value, source: doc.title, docId: doc.id, fieldKey: fieldItem.key }],
        });
      }
    }
  }

  for (const doc of vendor.documents) {
    if (doc.status !== 'Missing') continue;
    push({
      id: `${vendor.id}-missing-${doc.id}`, agentId: 'compliance', tier: 'red', kind: 'missing',
      title: `${doc.title} has not been received`,
      detail: `This document is mandatory for a ${vendor.category || 'supplier'} in ${vendor.country || 'this market'}. PROC-3.3 blocks the review from concluding without it.`,
      clauseId: DOC_CLAUSE[doc.code] || 'PROC-3.3',
      docId: doc.id, confidence: 100, resolved: false,
      recommendation: 'The Chaser Agent is pursuing this. No reviewer action is needed unless the thread stalls.',
      chaseable: true,
      evidence: [{ label: 'Document', value: doc.title, source: 'Mandatory evidence pack', docId: doc.id }],
    });
  }

  const coverage = vendor.documents.flatMap((d) => d.fields.map((f) => ({ f, d }))).find(({ f }) => f.key === 'coverage_amount');
  if (coverage) {
    const amount = Number(String(coverage.f.value).replace(/[^0-9]/g, '')) || 0;
    if (amount > 0 && amount < 2000000) {
      push({
        id: `${vendor.id}-ins`, agentId: 'compliance', tier: 'red', kind: 'threshold',
        title: 'Liability cover is below the mandated floor',
        detail: `Cover reads ${coverage.f.value}; INS-3.1 requires a minimum of USD 2,000,000.`,
        clauseId: 'INS-3.1', docId: coverage.d.id, fieldKey: coverage.f.key,
        confidence: 99, resolved: false,
        recommendation: 'Request an endorsement raising the limit before approval.',
        evidence: [{ label: coverage.f.label, value: coverage.f.value, source: coverage.d.title, docId: coverage.d.id, fieldKey: coverage.f.key }],
      });
    }
  }

  if (enabled('verification', 'corroborate')) {
    for (const doc of vendor.documents) {
      const fieldItem = doc.fields.find((f) => /tax_registration_number|iec_code|registration_number/.test(f.key));
      if (!fieldItem || doc.status === 'Missing') continue;
      push({
        id: `${vendor.id}-reg-${doc.id}`, agentId: 'verification', tier: 'green', kind: 'external',
        title: `${fieldItem.label} resolves on the public registry`,
        detail: `"${fieldItem.value}" matched an active registration. Checked against the ${vendor.country || 'national'} registry rather than taken from the supplier's word.`,
        clauseId: DOC_CLAUSE[doc.code], docId: doc.id, fieldKey: fieldItem.key,
        confidence: 96, resolved: true, autoCleared: true,
        recommendation: 'No action needed.',
        evidence: [{ label: fieldItem.label, value: fieldItem.value, source: `${vendor.country || 'National'} registry lookup`, docId: doc.id, fieldKey: fieldItem.key }],
      });
    }
  }

  for (const f of findings) {
    const decision = resolutions[f.id];
    if (!decision) continue;
    const lapsed = Boolean(decision.expiresAt) && new Date(decision.expiresAt).getTime() <= now;
    f.resolution = decision;
    if (lapsed) {
      f.resolutionLapsed = true;
      continue;
    }
    f.resolved = true;
    f.blocking = false;
  }

  const open = findings.filter((f) => !f.resolved);
  const blockers = open.filter((f) => f.tier === 'red');
  const cautions = open.filter((f) => f.tier === 'amber');

  const mandatoryDocsComplete = vendor.documents.every((d) => d.status !== 'Missing');
  const humanApprovalRecorded = vendor.finalStatus === 'Approved' || vendor.finalStatus === 'Active';

  const gates = {
    mandatoryDocsComplete,
    blockersCleared: blockers.length === 0,
    humanApprovalRecorded,
    canActivate: mandatoryDocsComplete && blockers.length === 0 && humanApprovalRecorded,
  };

  const recommendation = blockers.length > 0
    ? 'HOLD'
    : cautions.length > 0 ? 'RECOMMEND_WITH_NOTES' : 'RECOMMEND_APPROVAL';

  const checked = findings.length;
  const autoCleared = findings.filter((f) => f.autoCleared).length;

  return {
    findings,
    open,
    blockers,
    cautions,
    gates,
    recommendation,
    stats: {
      checked,
      autoCleared,
      autoClearRate: checked ? Math.round((autoCleared / checked) * 100) : 0,
      needsHuman: open.length,
    },
    brief: buildBrief(vendor, { blockers, cautions, recommendation, mandatoryDocsComplete }),
  };
}

const RECOMMENDATION_COPY: Record<string, string> = {
  HOLD: 'Hold - approval is not ready',
  RECOMMEND_WITH_NOTES: 'Ready for approval, with noted cautions',
  RECOMMEND_APPROVAL: 'Ready for approval',
};

export const recommendationLabel = (key: string) => RECOMMENDATION_COPY[key] || key;

function buildBrief(vendor: Vendor, { blockers, cautions, recommendation, mandatoryDocsComplete }: any) {
  const lines: string[] = [];
  lines.push(`${vendor.name} - ${vendor.category || 'uncategorised'}, manufacturing in ${vendor.country || 'an unstated market'}.`);
  lines.push(mandatoryDocsComplete
    ? `Full evidence pack received: ${vendor.documents.length} documents, ${vendor.docs || 0} verified.`
    : `Evidence pack incomplete: ${vendor.missingCount || 0} of ${vendor.documents.length} documents outstanding.`);
  lines.push(blockers.length
    ? `${blockers.length} blocking issue${blockers.length > 1 ? 's' : ''}: ${blockers.slice(0, 2).map((b: any) => b.title.toLowerCase()).join('; ')}${blockers.length > 2 ? '; and others' : ''}.`
    : 'No blocking issues found across the pack.');
  lines.push(cautions.length
    ? `${cautions.length} non-blocking finding${cautions.length > 1 ? 's' : ''} need review.`
    : 'Nothing requires a second look.');
  lines.push(`Compliance recommendation: ${RECOMMENDATION_COPY[recommendation]}. PROC-5.1 reserves the vendor decision for an authorised person.`);
  return lines;
}

const LANGUAGE_BY_COUNTRY: Record<string, [string, string]> = {
  China: ['zh', 'Mandarin'],
  Vietnam: ['vi', 'Vietnamese'],
  Bangladesh: ['bn', 'Bengali'],
  Turkey: ['tr', 'Turkish'],
  Germany: ['de', 'German'],
  India: ['en', 'English'],
};

export const languageFor = (country: string) => LANGUAGE_BY_COUNTRY[country] || ['en', 'English'];

const TEMPLATES: Record<string, Record<string, (d: string, c: string) => string>> = {
  request: {
    zh: (d, c) => `${c}您好：为完成 StyleSphere 供应商审核，我们还需要《${d}》。请直接回复本条消息并附上文件即可，无需登录任何系统。`,
    vi: (d, c) => `Kính gửi ${c}, để hoàn tất hồ sơ nhà cung cấp StyleSphere, chúng tôi cần bản «${d}». Quý công ty chỉ cần trả lời tin nhắn này kèm tệp đính kèm - không cần đăng nhập hệ thống.`,
    bn: (d, c) => `প্রিয় ${c}, StyleSphere সরবরাহকারী যাচাই সম্পূর্ণ করতে আমাদের «${d}» প্রয়োজন। এই বার্তার উত্তরে ফাইলটি সংযুক্ত করে পাঠালেই হবে - কোনো পোর্টালে লগইন করতে হবে না।`,
    tr: (d, c) => `Sayın ${c}, StyleSphere tedarikçi incelemesini tamamlamak için «${d}» belgesine ihtiyacımız var. Bu mesajı yanıtlayıp dosyayı ekleyebilirsiniz - herhangi bir portala giriş yapmanız gerekmez.`,
    de: (d, c) => `Guten Tag ${c}, für den Abschluss der StyleSphere-Lieferantenprüfung benötigen wir noch «${d}». Antworten Sie einfach auf diese Nachricht und hängen Sie die Datei an - eine Portal-Anmeldung ist nicht erforderlich.`,
    en: (d, c) => `Hello ${c} - to finish your StyleSphere supplier review we still need your ${d}. Just reply to this message with the file attached; there is no portal to log into.`,
  },
  followup: {
    zh: (d) => `温馨提醒：《${d}》仍未收到，您的供应商审核目前暂停中。回复本消息并附上文件即可继续。`,
    vi: (d) => `Nhắc nhở: chúng tôi vẫn chưa nhận được «${d}». Hồ sơ của quý công ty đang tạm dừng cho đến khi nhận được tài liệu này.`,
    bn: (d) => `স্মরণ করিয়ে দিচ্ছি: «${d}» এখনো পাইনি। এটি না পাওয়া পর্যন্ত আপনার আবেদনটি স্থগিত রয়েছে।`,
    tr: (d) => `Hatırlatma: «${d}» belgesini henüz alamadık. Bu belge gelene kadar başvurunuz beklemede.`,
    de: (d) => `Erinnerung: «${d}» ist bei uns noch nicht eingegangen. Ihre Bewerbung pausiert, bis das Dokument vorliegt.`,
    en: (d) => `A reminder - we still have not received your ${d}. Your application is paused until it arrives.`,
  },
  escalate: {
    zh: (d) => `第三次提醒（已抄送贵司管理层联系人）：《${d}》仍未收到。若该文件存在获取困难，请回复说明，我们可安排人工协助。`,
    vi: (d) => `Nhắc lần thứ ba (đã gửi kèm người quản lý của quý công ty): vẫn thiếu «${d}». Nếu có khó khăn, xin trả lời để chúng tôi hỗ trợ trực tiếp.`,
    bn: (d) => `তৃতীয় স্মারক (আপনার ম্যানেজারকেও পাঠানো হয়েছে): «${d}» এখনো বাকি। সমস্যা হলে উত্তর দিন, আমরা সরাসরি সহায়তা করব।`,
    tr: (d) => `Üçüncü hatırlatma (yönetici iletişim kişiniz de bilgilendirildi): «${d}» hâlâ eksik. Sorun varsa yanıtlayın, doğrudan yardımcı olalım.`,
    de: (d) => `Dritte Erinnerung (Ihre Führungskraft ist in Kopie): «${d}» fehlt weiterhin. Bei Schwierigkeiten antworten Sie bitte - wir helfen direkt.`,
    en: (d) => `Third reminder, with your manager contact copied - your ${d} is still outstanding. Reply if you need help obtaining it.`,
  },
};

const ENGLISH_COPY: Record<string, (d: string, c: string) => string> = {
  request: (d, c) => `Hello ${c} - to finish your StyleSphere supplier review we still need your ${d}. Reply to this message with the file attached; no portal login required.`,
  followup: (d) => `Reminder - your ${d} has not arrived. The application is paused until it does.`,
  escalate: (d) => `Third reminder, manager contact copied - your ${d} is still outstanding. Reply if you need help obtaining it.`,
};

const hashHours = (seed: string, span: number) => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return h % span;
};

const LADDER = [
  { at: 0, kind: 'request', channel: 'whatsapp', action: 'send_request' },
  { at: 48, kind: 'followup', channel: 'whatsapp', action: 'send_followup' },
  { at: 96, kind: 'escalate', channel: 'email', action: 'escalate_contact' },
  { at: 144, kind: 'handoff', channel: 'portal', action: 'handoff_human' },
];

export function buildChaserThreads(vendor: Vendor, options: { config?: AgentConfig | null; chaseState?: Record<string, any> } = {}) {
  const { config, chaseState = {} } = options;
  const entry = config ? agentConfigFor(config, 'chaser') : null;
  if (config && !entry?.enabled) return [];

  const localise = config ? skillEnabled(config, 'chaser', 'localise') : true;
  const [code, languageName] = languageFor(vendor.country);
  const lang = localise ? code : 'en';
  const contact = vendor.contact && vendor.contact !== 'Pending assignment' ? vendor.contact : 'colleagues';
  const outstanding = vendor.documents.filter((doc) => {
    const state = chaseState[doc.id] || {};
    return !state.completedAt && (doc.status === 'Missing' || Boolean(state.requested));
  });

  return outstanding.map((doc) => {
    const state = chaseState[doc.id] || {};
    const forced = new Set(state.forced || []);
    const elapsed = state.requestedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(state.requestedAt).getTime()) / 3600000))
      : 6 + hashHours(doc.id, 150);
    const steps = LADDER.map((rung) => {
      const sent = elapsed >= rung.at || forced.has(rung.kind);
      const body = rung.kind === 'handoff'
        ? `Chasing stopped after three attempts over six days. Thread handed to ${vendor.owner} with the full message history.`
        : (TEMPLATES[rung.kind][lang] || TEMPLATES[rung.kind].en)(doc.title, contact);
      const english = rung.kind === 'handoff' ? body : ENGLISH_COPY[rung.kind](doc.title, contact);
      return {
        id: `${doc.id}-${rung.kind}`,
        kind: rung.kind,
        channel: rung.channel,
        action: rung.action,
        hoursAgo: sent ? Math.max(0, forced.has(rung.kind) && elapsed < rung.at ? 0 : elapsed - rung.at) : null,
        dueInHours: sent ? null : Math.max(1, rung.at - elapsed),
        status: sent ? 'sent' : 'scheduled',
        sentEarly: forced.has(rung.kind) && elapsed < rung.at,
        language: rung.kind === 'handoff' ? 'en' : lang,
        languageName: rung.kind === 'handoff' ? 'English' : (localise ? languageName : 'English'),
        body,
        english,
      };
    });

    const lastSent = [...steps].reverse().find((step) => step.status === 'sent');
    const next = steps.find((step) => step.status === 'scheduled');
    const stalled = steps.every((step) => step.status === 'sent');
    const processing = doc.status === 'Processing' || state.reviewing || state.inboundStatus === 'processing';
    const threadState = processing ? 'processing' : state.paused ? 'paused' : stalled ? 'stalled' : 'chasing';
    const summary = processing
      ? 'A supplier attachment is being filed and verified. Follow-up is temporarily held.'
      : state.paused
        ? 'Chasing paused by a human. Sent messages remain in the history.'
        : state.reason
          ? `${state.reason} · ${state.dueState || 'Due now'}`
          : stalled
            ? `Three attempts over six days, no reply - handed to ${vendor.owner}.`
            : `${lastSent ? `${lastSent.kind === 'request' ? 'Requested' : lastSent.kind === 'followup' ? 'Followed up' : 'Escalated'} ${formatAgo(lastSent.hoursAgo)}` : 'Queued'} in ${localise ? languageName : 'English'} · next ${next ? next.kind : 'handoff'} in ${next ? `${next.dueInHours}h` : '-'}`;

    return {
      docId: doc.id, docCode: doc.code, docTitle: doc.title, vendorId: vendor.id,
      language: lang, languageName: localise ? languageName : 'English',
      channels: entry?.channels || ['whatsapp', 'email'], elapsedHours: elapsed,
      attempts: steps.filter((step) => step.status === 'sent' && step.kind !== 'handoff').length,
      steps, lastSent, next, paused: Boolean(state.paused), state: threadState, summary,
      reason: state.reason || (doc.status === 'Missing' ? `${doc.title} has not been supplied.` : doc.rejection?.reason),
      detail: state.detail || doc.rejection?.detail || 'Upload a clear, current replacement file.',
      clauseId: state.clauseId || DOC_CLAUSE[doc.code] || 'PROC-3.3',
      dueState: state.dueState || 'Outstanding', messages: state.messages || [],
      requestedAt: state.requestedAt || null,
    };
  });
}

export function formatAgo(hours: number | null | undefined): string {
  if (hours == null) return '-';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const BANDS = [
  ['decide', 'Ready for your decision', 'Everything the agents can do is done. These need a human.'],
  ['blocked', 'Blocked - needs your intervention', 'An agent has stopped and is waiting on you to unblock it.'],
  ['working', 'Agents working - nothing needed from you', 'In flight. Look only if you want to.'],
  ['closed', 'Closed', 'Decided and logged.'],
] as const;

export function triageVendor(vendor: Vendor, assessment: any, threads: any[]): TriageAssessment {
  if (vendor.finalStatus) {
    return { band: 'closed', headline: `${vendor.finalStatus}${vendor.erpId ? ` · ${vendor.erpId}` : ''}`, waitingOn: undefined } as any;
  }
  const stalled = threads.find((t) => t.state === 'stalled');
  if (stalled) {
    return {
      band: 'blocked',
      headline: `Chaser stopped after 3 attempts on ${stalled.docTitle}`,
      waitingOn: 'You - the supplier is not responding',
      agentId: 'chaser',
    } as any;
  }
  const humanBlocker = assessment.blockers?.find((b: any) => b.kind !== 'missing');
  if (humanBlocker) {
    return {
      band: 'decide',
      headline: humanBlocker.title,
      waitingOn: `Your judgement · ${humanBlocker.clause?.id || 'policy'}`,
      agentId: humanBlocker.agentId,
    } as any;
  }
  if (threads.length) {
    const lead = threads[0];
    return {
      band: 'working',
      headline: lead.summary,
      waitingOn: `${lead.docTitle} from the supplier`,
      agentId: 'chaser',
    } as any;
  }
  if (assessment.cautions?.length) {
    return {
      band: 'decide',
      headline: `Review ${assessment.cautions.length} item${assessment.cautions.length > 1 ? 's' : ''}, then decide`,
      waitingOn: 'Your judgement',
      agentId: 'verification',
    } as any;
  }
  return {
    band: 'decide',
    headline: 'Pack complete, no findings open - ready for approval',
    waitingOn: 'Your decision',
    agentId: 'compliance',
  } as any;
}

export function configInsights(auditLogs: AuditLogEntry[], vendors: Vendor[]) {
  const insights: any[] = [];
  const overrides = auditLogs.filter((l) => l.actionType === 'FIELD_OVERRIDE');
  const accepts = auditLogs.filter((l) => l.actionType === 'FIELD_ACCEPT');

  const byField: Record<string, { count: number; countries: Set<string>; docs: Set<string> }> = {};
  for (const log of overrides) {
    const vendor = vendors.find((v) => v.id === log.vendorId);
    const key = log.fieldLabel || 'Unlabelled field';
    byField[key] = byField[key] || { count: 0, countries: new Set(), docs: new Set() };
    byField[key].count += 1;
    if (vendor?.country) byField[key].countries.add(vendor.country);
    if (log.documentName) byField[key].docs.add(log.documentName);
  }

  for (const [field, data] of Object.entries(byField)) {
    if (data.count < 2) continue;
    const countries = [...data.countries];
    insights.push({
      id: `ovr-${field}`,
      severity: data.count >= 4 ? 'high' : 'medium',
      agentId: 'verification',
      title: `"${field}" has been corrected ${data.count} times`,
      detail: countries.length === 1
        ? `Every correction is on a ${countries[0]} document. That is an extraction defect on one document template, not reviewer preference.`
        : `Corrections span ${countries.join(', ') || 'several markets'} across ${data.docs.size} document type${data.docs.size > 1 ? 's' : ''}.`,
      proposal: countries.length === 1
        ? `Retune the ${field} extraction skill for ${countries[0]} templates and re-run against the last 30 packs.`
        : `Retune the ${field} extraction skill and add a cross-document assertion before auto-clear.`,
      metric: `${data.count} overrides`,
    });
  }

  const decided = accepts.length + overrides.length;
  if (decided > 0) {
    const rate = Math.round((accepts.length / decided) * 100);
    insights.push({
      id: 'agreement',
      severity: rate >= 80 ? 'low' : 'medium',
      agentId: 'verification',
      title: `Reviewers accept the Verification Agent ${rate}% of the time`,
      detail: `${accepts.length} accepted as extracted, ${overrides.length} corrected, across ${decided} adjudicated fields.`,
      proposal: rate >= 90
        ? 'Agreement is high enough to raise the auto-clear threshold from 90% to 93% and cut reviewer load further.'
        : 'Keep the auto-clear threshold at 90% until agreement is consistently above 90%.',
      metric: `${rate}% agreement`,
    });
  }

  const byCountry: Record<string, { missing: number; vendors: number }> = {};
  for (const vendor of vendors) {
    if (!vendor.country || vendor.country === 'Not yet provided') continue;
    byCountry[vendor.country] = byCountry[vendor.country] || { missing: 0, vendors: 0 };
    byCountry[vendor.country].missing += vendor.missingCount || 0;
    byCountry[vendor.country].vendors += 1;
  }
  const slowest = Object.entries(byCountry)
    .map(([country, d]) => ({ country, perVendor: d.missing / d.vendors, ...d }))
    .filter((d) => d.perVendor > 0)
    .sort((a, b) => b.perVendor - a.perVendor)[0];

  if (slowest) {
    insights.push({
      id: `slow-${slowest.country}`,
      severity: 'medium',
      agentId: 'chaser',
      title: `${slowest.country} suppliers hold the most outstanding evidence`,
      detail: `${slowest.perVendor.toFixed(1)} documents outstanding per supplier, against ${slowest.vendors} active application${slowest.vendors > 1 ? 's' : ''}.`,
      proposal: `Check the ${languageFor(slowest.country)[1]} template wording - a chase that does not convert is usually unclear, not ignored.`,
      metric: `${slowest.missing} open`,
    });
  }

  return insights;
}

export function outcomeMetrics(vendors: Vendor[], auditLogs: AuditLogEntry[]) {
  const closed = vendors.filter((v) => v.finalStatus === 'Active' || v.finalStatus === 'Approved');
  const open = vendors.filter((v) => !v.finalStatus);

  const accepts = auditLogs.filter((l) => l.actionType === 'FIELD_ACCEPT').length;
  const overrides = auditLogs.filter((l) => l.actionType === 'FIELD_OVERRIDE').length;
  const adjudicated = accepts + overrides;

  const BASELINE_DAYS = 7;
  const stages: [string, number, number][] = [
    ['Invitation → submission', 2.6, 0.9],
    ['Document collection', 2.8, 0.6],
    ['AI verification', 0.9, 0.05],
    ['Compliance review', 0.5, 0.3],
    ['Approval & activation', 0.2, 0.15],
  ];
  const current = stages.reduce((sum, [, , nowVal]) => sum + nowVal, 0);

  return {
    baselineDays: BASELINE_DAYS,
    currentDays: Number(current.toFixed(2)),
    reductionPct: Math.round(((BASELINE_DAYS - current) / BASELINE_DAYS) * 100),
    stages: stages.map(([label, before, nowVal]) => ({
      label, before, now: nowVal, saved: Number((before - nowVal).toFixed(2)),
    })),
    agreementRate: adjudicated ? Math.round((accepts / adjudicated) * 100) : null,
    adjudicated,
    accepts,
    overrides,
    decisionsLogged: auditLogs.filter((l) => l.actionType === 'DECISION').length,
    closedCount: closed.length,
    openCount: open.length,
    eventsLogged: auditLogs.length,
  };
}
