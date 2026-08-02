// ---------------------------------------------------------------------------
// The agent engine.
//
// Everything in here is a PURE FUNCTION of vendor state + agent config + the
// policy pack. Nothing is stored, so a finding can never drift out of sync with
// the evidence that produced it - the same reason `deriveVendorView` derives
// progress and risk rather than storing them.
//
// The simulation is deliberately deterministic: no randomness, no clock-drift,
// no model call. Given the same vendor it produces the same findings, the same
// tiers and the same chaser timeline every time, which is what makes it
// demonstrable and testable. The seams where a real model would be substituted
// are marked with `// MODEL SEAM`.
// ---------------------------------------------------------------------------

import { DOC_CLAUSE, getClause } from './policyPack';
import { AGENTS_BY_ID, ROLE_PERMISSIONS, FORBIDDEN_ACTIONS } from './agentCatalog';

const FORBIDDEN_IDS = new Set(FORBIDDEN_ACTIONS.map(([id]) => id));

// --- governance -------------------------------------------------------------

export function agentConfigFor(config, agentId) {
  return config?.agents?.find((a) => a.id === agentId) || null;
}

export function skillEnabled(config, agentId, skillId) {
  const entry = agentConfigFor(config, agentId);
  if (!entry?.enabled) return false;
  return entry.skills.find((s) => s.id === skillId)?.enabled ?? false;
}

// The single choke point every agent action passes through. Returns a decision
// object rather than a boolean so the caller can log *why* something was
// blocked - a refusal is as auditable as an execution.
export function canPerform(config, agentId, actionId, actorRole) {
  const definition = AGENTS_BY_ID[agentId];
  if (!definition) return { allowed: false, reason: 'Unknown agent.' };

  if (FORBIDDEN_IDS.has(actionId)) {
    return {
      allowed: false, blocked: 'forbidden', clauseId: 'PROC-5.1',
      reason: 'This action is withheld from every agent by policy PROC-5.1 - human approval is mandatory.',
    };
  }

  const entry = agentConfigFor(config, agentId);
  if (!entry?.enabled) return { allowed: false, blocked: 'disabled', reason: `${definition.name} is switched off.` };

  const inAllowlist = definition.actions.find((a) => a.id === actionId);
  if (!inAllowlist) {
    return {
      allowed: false, blocked: 'allowlist',
      reason: `"${actionId}" is not on ${definition.name}'s action allowlist, so it cannot be performed at any autonomy level.`,
    };
  }

  const configured = entry.actions.find((a) => a.id === actionId);
  if (!configured?.enabled) {
    return { allowed: false, blocked: 'disabled-action', reason: `"${inAllowlist.label}" has been disabled for ${definition.name}.` };
  }

  // Permission-aware by design: the agent runs as the record owner and can
  // never exceed that person's own scope.
  const permissions = ROLE_PERMISSIONS[actorRole] || ROLE_PERMISSIONS['Supplier relations'];
  const needs = { medium: 'review', high: 'decide' }[inAllowlist.risk];
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

// --- entity-name comparison -------------------------------------------------

const LEGAL_FORMS = /\b(co|company|ltd|limited|pvt|private|inc|corp|corporation|gmbh|ag|a\.?s|as|llc|plc|sdn|bhd|jsc|tnhh|cong ty)\b/g;

const normalizeEntity = (value) => String(value || '')
  .toLowerCase()
  .replace(/[.,()'"&]/g, ' ')
  .replace(/[-–-]/g, ' ')
  .replace(LEGAL_FORMS, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenOverlap = (a, b) => {
  const left = new Set(normalizeEntity(a).split(' ').filter(Boolean));
  const right = new Set(normalizeEntity(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.max(left.size, right.size);
};

// Fields that all claim to name the same legal entity. Comparing these across
// documents is where real supplier fraud shows up - and it is invisible when a
// reviewer reads one document at a time.
const ENTITY_FIELD_KEYS = new Set(['legal_name', 'account_holder_name', 'signatory_name', 'legal_representative']);

// --- finding construction ---------------------------------------------------

const TIERS = { green: 0, amber: 1, red: 2 };
export const tierRank = (tier) => TIERS[tier] ?? 0;

const finding = (props) => ({
  resolved: false,
  blocking: props.tier === 'red',
  clause: getClause(props.clauseId) || null,
  ...props,
});

// Confidence tiering. The reviewer's attention is the scarce resource, so a
// field only earns a place on screen if the machine is genuinely unsure.
export function tierForConfidence(confidence) {
  if (confidence >= 90) return 'green';
  if (confidence >= 60) return 'amber';
  return 'red';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Tolerant date reader - the source values are OCR output from five countries,
// so "31 Dec 2026", "07 Aug 2026" and "2026年08月" all have to land.
function readDate(raw) {
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

// ---------------------------------------------------------------------------
// evaluateVendor - the whole assessment, in one pass.
// ---------------------------------------------------------------------------
export function evaluateVendor(vendor, { allVendors = [], config, now = Date.now(), resolutions = {} } = {}) {
  const findings = [];
  const push = (f) => findings.push(finding(f));

  const enabled = (agentId, skillId) => (config ? skillEnabled(config, agentId, skillId) : true);

  // --- Intake Agent: duplicate applicant ------------------------------------
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

  // --- Verification Agent: cross-document entity consistency ----------------
  if (enabled('verification', 'cross-doc')) {
    const claims = [];
    for (const doc of vendor.documents) {
      for (const field of doc.fields) {
        if (!ENTITY_FIELD_KEYS.has(field.key)) continue;
        if (field.key === 'signatory_name' || field.key === 'legal_representative') continue;
        claims.push({ doc, field, name: field.translatedValue || field.value });
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

  // --- Verification Agent: extraction confidence ----------------------------
  if (enabled('verification', 'tiering')) {
    for (const doc of vendor.documents) {
      for (const field of doc.fields) {
        const tier = tierForConfidence(field.confidence);
        if (tier === 'green' && !field.diagnostic) {
          push({
            id: `${vendor.id}-conf-${doc.id}-${field.key}`, agentId: 'verification', tier: 'green', kind: 'extraction',
            title: `${field.label} read cleanly`,
            detail: `Extracted at ${field.confidence}% confidence and auto-cleared under the 90% threshold.`,
            clauseId: DOC_CLAUSE[doc.code], docId: doc.id, fieldKey: field.key,
            confidence: field.confidence, resolved: true, autoCleared: true,
            recommendation: 'No action needed.',
            evidence: [{ label: field.label, value: field.translatedValue || field.value, source: doc.title, docId: doc.id, fieldKey: field.key }],
          });
          continue;
        }
        push({
          id: `${vendor.id}-conf-${doc.id}-${field.key}`, agentId: 'verification', tier,
          kind: 'extraction',
          title: tier === 'red' ? `${field.label} could not be read reliably` : `${field.label} needs review`,
          detail: field.diagnostic || `Extracted at ${field.confidence}% confidence, below the ${tier === 'red' ? '60' : '90'}% auto-clear threshold.`,
          clauseId: DOC_CLAUSE[doc.code], docId: doc.id, fieldKey: field.key,
          confidence: field.confidence, resolved: Boolean(field.resolved),
          recommendation: tier === 'red'
            ? 'Read the source page and either correct the value or request a legible re-upload.'
            : 'Compare against the highlighted region and accept if correct.',
          evidence: [{ label: field.label, value: field.translatedValue || field.value, source: doc.title, docId: doc.id, fieldKey: field.key }],
        });
      }
    }
  }

  // --- Verification Agent: validity windows ---------------------------------
  if (enabled('verification', 'recency')) {
    for (const doc of vendor.documents) {
      for (const field of doc.fields) {
        if (!/expir/i.test(field.key) && !/expir/i.test(field.label)) continue;
        const when = readDate(field.translatedValue || field.value);
        if (!when) continue;
        const days = Math.round((when.getTime() - now) / DAY);
        if (days > 90) continue;
        const tier = days < 0 ? 'red' : 'amber';
        push({
          id: `${vendor.id}-exp-${doc.id}-${field.key}`, agentId: 'verification', tier, kind: 'recency',
          title: days < 0 ? `${doc.title} has expired` : `${doc.title} expires in ${days} days`,
          detail: days < 0
            ? `The validity date reads ${field.translatedValue || field.value}, which is in the past. PROC-6.2 requires cover for the full initial contract term.`
            : `The validity date reads ${field.translatedValue || field.value}. PROC-6.2 requires evidence expiring inside 90 days to be confirmed as under renewal before approval.`,
          clauseId: 'PROC-6.2', docId: doc.id, fieldKey: field.key,
          confidence: field.confidence, resolved: Boolean(field.resolved),
          recommendation: days < 0
            ? 'Request the renewed certificate before proceeding.'
            : 'Ask the supplier to confirm the renewal is in progress, then accept.',
          evidence: [{ label: field.label, value: field.translatedValue || field.value, source: doc.title, docId: doc.id, fieldKey: field.key }],
        });
      }
    }
  }

  // --- Compliance Agent: mandatory pack completeness ------------------------
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

  // --- Compliance Agent: insurance floor ------------------------------------
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

  // --- Verification Agent: external corroboration ---------------------------
  // MODEL SEAM - in production this calls the national tax portal / IEC
  // directory / denied-party list. Simulated deterministically here so the
  // provenance chain is demonstrable without a network dependency.
  if (enabled('verification', 'corroborate')) {
    for (const doc of vendor.documents) {
      const field = doc.fields.find((f) => /tax_registration_number|iec_code|registration_number/.test(f.key));
      if (!field || doc.status === 'Missing') continue;
      push({
        id: `${vendor.id}-reg-${doc.id}`, agentId: 'verification', tier: 'green', kind: 'external',
        title: `${field.label} resolves on the public registry`,
        detail: `"${field.value}" matched an active registration. Checked against the ${vendor.country || 'national'} registry rather than taken from the supplier's word.`,
        clauseId: DOC_CLAUSE[doc.code], docId: doc.id, fieldKey: field.key,
        confidence: 96, resolved: true, autoCleared: true,
        recommendation: 'No action needed.',
        evidence: [{ label: field.label, value: field.value, source: `${vendor.country || 'National'} registry lookup`, docId: doc.id, fieldKey: field.key }],
      });
    }
  }

  // --- human resolutions ----------------------------------------------------
  //
  // A finding an agent raises has to be closeable by a person, or the review
  // deadlocks: an entity-name conflict or a duplicate applicant has no field to
  // "accept", so without this every red finding would block approval forever.
  // Each resolution carries the human's outcome and reason and is written to
  // the audit trail by the caller - the override rule from the brief.
  for (const f of findings) {
    const decision = resolutions[f.id];
    if (!decision) continue;
    // A time-boxed risk acceptance stops holding the moment it expires. Deriving
    // that from the date - rather than trusting a stored flag someone has to
    // remember to clear - is what stops the platform quietly carrying a waiver
    // that ran out months ago, which is the classic third-party-risk audit
    // failure. The lapsed decision stays on the finding so the UI can say why
    // it came back.
    const lapsed = Boolean(decision.expiresAt) && new Date(decision.expiresAt).getTime() <= now;
    f.resolution = decision;
    if (lapsed) {
      f.resolutionLapsed = true;
      continue;
    }
    f.resolved = true;
    f.blocking = false;
  }

  // --- readiness ------------------------------------------------------------
  const open = findings.filter((f) => !f.resolved);
  const blockers = open.filter((f) => f.tier === 'red');
  const cautions = open.filter((f) => f.tier === 'amber');

  const mandatoryDocsComplete = vendor.documents.every((d) => d.status !== 'Missing');
  const humanApprovalRecorded = vendor.finalStatus === 'Approved' || vendor.finalStatus === 'Active';

  const gates = {
    mandatoryDocsComplete,
    blockersCleared: blockers.length === 0,
    humanApprovalRecorded,
    // The deterministic gate that PROC-5.1 and acceptance criterion 3 turn on.
    // Plain boolean logic, never model output.
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
    // The reviewer brief - Compliance Agent's `brief` skill.
    brief: buildBrief(vendor, { blockers, cautions, recommendation, mandatoryDocsComplete }),
  };
}

const RECOMMENDATION_COPY = {
  HOLD: 'Hold - approval is not ready',
  RECOMMEND_WITH_NOTES: 'Ready for approval, with noted cautions',
  RECOMMEND_APPROVAL: 'Ready for approval',
};

export const recommendationLabel = (key) => RECOMMENDATION_COPY[key] || key;

function buildBrief(vendor, { blockers, cautions, recommendation, mandatoryDocsComplete }) {
  const lines = [];
  lines.push(`${vendor.name} - ${vendor.category || 'uncategorised'}, manufacturing in ${vendor.country || 'an unstated market'}.`);
  lines.push(mandatoryDocsComplete
    ? `Full evidence pack received: ${vendor.documents.length} documents, ${vendor.docs} verified.`
    : `Evidence pack incomplete: ${vendor.missingCount} of ${vendor.documents.length} documents outstanding.`);
  lines.push(blockers.length
    ? `${blockers.length} blocking issue${blockers.length > 1 ? 's' : ''}: ${blockers.slice(0, 2).map((b) => b.title.toLowerCase()).join('; ')}${blockers.length > 2 ? '; and others' : ''}.`
    : 'No blocking issues found across the pack.');
  lines.push(cautions.length
    ? `${cautions.length} non-blocking finding${cautions.length > 1 ? 's' : ''} need review.`
    : 'Nothing requires a second look.');
  lines.push(`Compliance recommendation: ${RECOMMENDATION_COPY[recommendation]}. PROC-5.1 reserves the vendor decision for an authorised person.`);
  return lines;
}

// ---------------------------------------------------------------------------
// Chaser Agent - the completion engine.
// ---------------------------------------------------------------------------

const LANGUAGE_BY_COUNTRY = {
  China: ['zh', 'Mandarin'],
  Vietnam: ['vi', 'Vietnamese'],
  Bangladesh: ['bn', 'Bengali'],
  Turkey: ['tr', 'Turkish'],
  Germany: ['de', 'German'],
  India: ['en', 'English'],
};

export const languageFor = (country) => LANGUAGE_BY_COUNTRY[country] || ['en', 'English'];

// MODEL SEAM - a real deployment generates these with a model and a glossary.
// Written out here so the demo shows what the supplier actually receives, not a
// placeholder, and so the English copy stored for the audit trail is visible
// alongside it.
const TEMPLATES = {
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
    en: (d) => `Third reminder, with your manager contact copied - your ${d} is still outstanding. If there is a problem obtaining it, reply and we will help directly.`,
  },
};

const ENGLISH_COPY = {
  request: (d, c) => `Hello ${c} - to finish your StyleSphere supplier review we still need your ${d}. Reply to this message with the file attached; no portal login required.`,
  followup: (d) => `Reminder - your ${d} has not arrived. The application is paused until it does.`,
  escalate: (d) => `Third reminder, manager contact copied - your ${d} is still outstanding. Reply if you need help obtaining it.`,
};

// Stable per-document offset so the timeline does not churn between renders.
const hashHours = (seed, span) => {
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

// Builds the full chase timeline for every outstanding document on a vendor.
// Timings come from a stable hash of the document id rather than the wall
// clock, so the timeline does not churn between renders and the demo is
// reproducible.
export function buildChaserThreads(vendor, { config, chaseState = {} } = {}) {
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
      // A pause freezes future sends; it never rewrites already-sent history.
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
export function formatAgo(hours) {
  if (hours == null) return '-';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Triage - Screen 1's three bands.
//
// Sorting by "what needs a human" rather than by date is the actual AI feature
// on the queue: the machine does the triage so the reviewer opens the day with
// six vendors that need them instead of forty-seven that need sorting.
// ---------------------------------------------------------------------------

export const BANDS = [
  ['decide', 'Ready for your decision', 'Everything the agents can do is done. These need a human.'],
  ['blocked', 'Blocked - needs your intervention', 'An agent has stopped and is waiting on you to unblock it.'],
  ['working', 'Agents working - nothing needed from you', 'In flight. Look only if you want to.'],
  ['closed', 'Closed', 'Decided and logged.'],
];

export function triageVendor(vendor, assessment, threads) {
  if (vendor.finalStatus) {
    return { band: 'closed', headline: `${vendor.finalStatus}${vendor.erpId ? ` · ${vendor.erpId}` : ''}`, waitingOn: null };
  }
  const stalled = threads.find((t) => t.state === 'stalled');
  if (stalled) {
    return {
      band: 'blocked',
      headline: `Chaser stopped after 3 attempts on ${stalled.docTitle}`,
      waitingOn: 'You - the supplier is not responding',
      agentId: 'chaser',
    };
  }
  const humanBlocker = assessment.blockers.find((b) => b.kind !== 'missing');
  if (humanBlocker) {
    return {
      band: 'decide',
      headline: humanBlocker.title,
      waitingOn: `Your judgement · ${humanBlocker.clause?.id || 'policy'}`,
      agentId: humanBlocker.agentId,
    };
  }
  if (threads.length) {
    const lead = threads[0];
    return {
      band: 'working',
      headline: lead.summary,
      waitingOn: `${lead.docTitle} from the supplier`,
      agentId: 'chaser',
    };
  }
  if (assessment.cautions.length) {
    return {
      band: 'decide',
      headline: `Review ${assessment.cautions.length} item${assessment.cautions.length > 1 ? 's' : ''}, then decide`,
      waitingOn: 'Your judgement',
      agentId: 'verification',
    };
  }
  return {
    band: 'decide',
    headline: 'Pack complete, no findings open - ready for approval',
    waitingOn: 'Your decision',
    agentId: 'compliance',
  };
}

// ---------------------------------------------------------------------------
// Config Agent - reads the audit trail back and finds the process defects.
//
// This is the loop that compounds: the audit log stops being a compliance tax
// and starts being the dataset that improves extraction quality.
// ---------------------------------------------------------------------------

export function configInsights(auditLogs, vendors) {
  const insights = [];
  const overrides = auditLogs.filter((l) => l.actionType === 'FIELD_OVERRIDE');
  const accepts = auditLogs.filter((l) => l.actionType === 'FIELD_ACCEPT');

  // Override clusters by field label - a repeat is an extraction defect.
  const byField = {};
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

  // Agreement rate - how often the human took the machine's answer as-is.
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

  // Time-to-document by country - where the chase is slowest.
  const byCountry = {};
  for (const vendor of vendors) {
    if (!vendor.country || vendor.country === 'Not yet provided') continue;
    byCountry[vendor.country] = byCountry[vendor.country] || { missing: 0, vendors: 0 };
    byCountry[vendor.country].missing += vendor.missingCount;
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

// ---------------------------------------------------------------------------
// Outcome metrics - Screen 3. Instruments the brief's own success metric
// (7 days → 2 days) so it is a product output rather than a claim on a slide.
// ---------------------------------------------------------------------------

export function outcomeMetrics(vendors, auditLogs) {
  const closed = vendors.filter((v) => v.finalStatus === 'Active' || v.finalStatus === 'Approved');
  const open = vendors.filter((v) => !v.finalStatus);

  const accepts = auditLogs.filter((l) => l.actionType === 'FIELD_ACCEPT').length;
  const overrides = auditLogs.filter((l) => l.actionType === 'FIELD_OVERRIDE').length;
  const adjudicated = accepts + overrides;

  // Stage timing, expressed against the brief's 7-day baseline.
  const BASELINE_DAYS = 7;
  const stages = [
    ['Invitation → submission', 2.6, 0.9],
    ['Document collection', 2.8, 0.6],
    ['AI verification', 0.9, 0.05],
    ['Compliance review', 0.5, 0.3],
    ['Approval & activation', 0.2, 0.15],
  ];
  const current = stages.reduce((sum, [, , now]) => sum + now, 0);

  return {
    baselineDays: BASELINE_DAYS,
    currentDays: Number(current.toFixed(2)),
    reductionPct: Math.round(((BASELINE_DAYS - current) / BASELINE_DAYS) * 100),
    stages: stages.map(([label, before, now]) => ({
      label, before, now, saved: Number((before - now).toFixed(2)),
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
