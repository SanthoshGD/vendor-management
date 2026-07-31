import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  INITIAL_VENDORS, INITIAL_REQUESTS, INITIAL_AUDIT_LOGS, CURRENT_USERS,
  INITIAL_REQUESTS_TO_SUPERVISOR, REQUEST_TYPES, REQUEST_OUTCOMES, REQUEST_TEMPLATES,
} from '../data/mockData';
import { DEFAULT_AGENT_CONFIG, AGENTS_BY_ID } from '../agents/agentCatalog';
import { evaluateVendor, buildChaserThreads, canPerform, triageVendor } from '../agents/agentEngine';
import { DOC_CLAUSE } from '../agents/policyPack';

// Shared, persisted application state for StyleSphere Vendor Nexus.
// This is the single source of truth for vendors, documents, procurement
// requests, and the immutable audit trail. Every screen reads from here so
// an action taken in one place (e.g. accepting a field in the Review
// Workspace) is reflected everywhere else (the vendor directory, the
// dashboard, the Activity & Audit page) without any separate bookkeeping.

const NexusContext = createContext(null);
// v7 renumbers the onboarding wizard: the old order was welcome / profile /
// documents / review, the new one is welcome / documents / profile / review.
// `onboardingStep` is a bare integer, so a v5 or v6 payload is not merely
// missing fields  -  it points at the wrong screen. Anyone who had reached the
// old profile step was stored at step 2 and would resume on the new "company
// details" screen, silently skipping the method choice entirely. There is no
// safe migration for that (step 2 meant two different things), so older
// payloads are discarded rather than adapted, and the obsolete keys are
// removed on load so a stale copy cannot be picked up again later.
const STORAGE_KEY = 'stylesphere-nexus-state-v7';
const LEGACY_STORAGE_KEYS = [];
const OBSOLETE_STORAGE_KEYS = ['stylesphere-nexus-state-v5', 'stylesphere-nexus-state-v6'];
const FINDING_OUTCOMES = Object.freeze({
  accept: ['Accepted the agent\'s reading', 'Reviewer agreed with the finding and cleared it.'],
  dismiss: ['Dismissed as a false positive', 'Reviewer judged the finding incorrect on the evidence.'],
  mitigated: ['Resolved outside the system', 'Reviewer confirmed the issue was settled with the supplier directly.'],
});
export const DEFAULT_SETTINGS = Object.freeze({ density: 'comfortable', notifications: true });

// The reviewer's delegated approval limit, expressed as a residual risk score.
//
// This lives in the context rather than in the Review Workspace because a
// delegation-of-authority threshold that is only enforced by which button
// renders is not a control — it is a suggestion. `submitDecision` checks it on
// every APPROVE, so the limit holds for the keyboard shortcut and for any
// future caller, exactly the way the activation gate does.
export const APPROVAL_CEILING = 70;

// A risk acceptance clears ONE finding, and only until it expires.
const RISK_ACCEPTED = 'risk_accepted';
let runtimeIdSequence = 0;

const makeRuntimeId = (prefix) => {
  runtimeIdSequence = (runtimeIdSequence + 1) % 100000;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${runtimeIdSequence.toString(36).toUpperCase()}`;
};

// The vendor that the demo's "Vendor portal" toggle represents when the app is
// opened without an invite link. This is Guangzhou Artisan Leathers  -  the
// handbag atelier whose Mandarin licence drives the AI review demo and whose
// outstanding chromium VI leather test gives the portal a real upload to make.
export const DEMO_VENDOR_ID = 'VEN-3312';

// Onboarding wizard stages for a freshly invited vendor. Vendors seeded in the
// demo dataset have no `onboardingStep`, which is read as SUBMITTED  -  they are
// already mid-review, so they get the tracking view rather than the wizard.
// Order matters: these names are the step integers. This list still read
// welcome/profile/documents long after the wizard was reordered, which is
// exactly the kind of stale second source of truth that made the renumbering
// bug hard to see. It is the wizard's real order.
export const ONBOARDING_STEPS = ['welcome', 'documents', 'profile', 'review', 'submitted'];
export const STEP_SUBMITTED = 4;

const clone = (value) => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------------------
// Invite links
//
// An invite is a self-contained, URL-safe base64 payload carried in the hash
// (`#/invite/<payload>`). The hash is used rather than a query string because
// it survives being opened as a local file:// document, which is how this
// build is shared. Because the payload carries the vendor's identity and
// blank document checklist, a vendor can open the link on a device that has
// never seen this app before and still land on their own onboarding.
// ---------------------------------------------------------------------------

const toBase64Url = (text) => btoa(unescape(encodeURIComponent(text)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (encoded) => {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))));
};

export function encodeInvite(vendor) {
  return toBase64Url(JSON.stringify({
    v: vendor.id,
    n: vendor.name,
    e: vendor.email,
    c: vendor.country,
    k: vendor.category,
    p: vendor.checklistId,
  }));
}

export function decodeInvite(encoded) {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    return parsed?.v ? parsed : null;
  } catch {
    return null;
  }
}

export function inviteUrl(vendor) {
  // `location.origin` is the string "null" for a file:// document in several
  // browsers, which would produce an unusable link  -  and file:// is exactly how
  // this build is shared. Derive the base from the full href instead, minus any
  // existing fragment, which is correct for both file:// and http(s)://.
  const base = window.location.href.split('#')[0];
  return `${base}#/invite/${encodeInvite(vendor)}`;
}

// Reads an invite out of the current URL. Tolerates both `#/invite/x` and a
// `?invite=x` query string so a link survives being pasted into tools that
// strip fragments.
export function readInviteFromUrl() {
  try {
    const hashMatch = window.location.hash.match(/#\/invite\/([\w-]+)/);
    if (hashMatch) return decodeInvite(hashMatch[1]);
    const queryValue = new URLSearchParams(window.location.search).get('invite');
    return queryValue ? decodeInvite(queryValue) : null;
  } catch {
    return null;
  }
}

const presetDocument = (slug, code, title, docTemplate = 'certificate') => (
  [slug, code, title, docTemplate]
);

export const DOCUMENT_PRESETS = {
  'leather-textiles': {
    id: 'leather-textiles',
    label: 'Leather and textiles',
    documents: [
      presetDocument('tax', 'TAX', 'Tax Registration Certificate'),
      presetDocument('iec', 'IEC', 'Import / Export Code Licence'),
      presetDocument('bank', 'BANK', 'Bank Account Verification Letter', 'bank'),
      presetDocument('coi', 'COI', 'Certificate of Liability Insurance'),
      presetDocument('reach', 'REACH', 'REACH Chemical Compliance Certificate'),
      presetDocument('iso17075', 'ISO17075', 'ISO 17075 Chromium VI Leather Test'),
      presetDocument('social-audit', 'AUDIT', 'Factory Social Compliance Audit', 'audit'),
    ],
  },
  packaging: {
    id: 'packaging',
    label: 'Packaging',
    documents: [
      presetDocument('tax', 'TAX', 'Tax Registration Certificate'),
      presetDocument('bank', 'BANK', 'Bank Account Verification Letter', 'bank'),
      presetDocument('coi', 'COI', 'Certificate of Liability Insurance'),
      presetDocument('fsc', 'FSC', 'FSC or Responsible Material Certificate'),
      presetDocument('material-composition', 'MATERIAL', 'Recycled Material or Material Composition Declaration', 'legal'),
      presetDocument('quality', 'QUALITY', 'Quality Management Certificate'),
    ],
  },
  'hardware-components': {
    id: 'hardware-components',
    label: 'Hardware and components',
    documents: [
      presetDocument('tax', 'TAX', 'Tax Registration Certificate'),
      presetDocument('iec', 'IEC', 'Import / Export Code Licence'),
      presetDocument('bank', 'BANK', 'Bank Account Verification Letter', 'bank'),
      presetDocument('coi', 'COI', 'Certificate of Liability Insurance'),
      presetDocument('quality', 'QUALITY', 'Quality Management Certificate'),
      presetDocument('product-declaration', 'MATERIAL', 'Product or Material Declaration', 'legal'),
      presetDocument('safety', 'SAFETY', 'Safety or Conformity Certificate'),
    ],
  },
  generic: {
    id: 'generic',
    label: 'Generic supplier',
    documents: [
      presetDocument('tax', 'TAX', 'Tax Registration Certificate'),
      presetDocument('bank', 'BANK', 'Bank Account Verification Letter', 'bank'),
      presetDocument('coi', 'COI', 'Certificate of Liability Insurance'),
      presetDocument('company-registration', 'REG', 'Company Registration Certificate', 'license'),
      presetDocument('quality-service', 'QUALITY', 'Quality or Service Declaration', 'legal'),
    ],
  },
};

const normalizeCategory = (category) => String(category || '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function checklistForCategory(category, presetId) {
  if (presetId && DOCUMENT_PRESETS[presetId]) return DOCUMENT_PRESETS[presetId];
  const normalized = normalizeCategory(category);
  if (/\b(packaging|package|dust bag|carton|paperboard)\b/.test(normalized)) return DOCUMENT_PRESETS.packaging;
  if (/\b(leather|textile|fabric|apparel|hide|skin|garment|lining|trim|handbag)\b/.test(normalized)) {
    return DOCUMENT_PRESETS['leather-textiles'];
  }
  if (/\b(hardware|component|metal|fitting|clasp|fastener)\b/.test(normalized)) {
    return DOCUMENT_PRESETS['hardware-components'];
  }
  return DOCUMENT_PRESETS.generic;
}

// Compatibility export for existing callers. New records use their stored preset.
export const REQUIRED_DOCUMENTS = DOCUMENT_PRESETS['leather-textiles'].documents;

const initialsFor = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'NV';

export function buildVendorRecord({ id, name, country, category, email, checklistId }) {
  const checklist = checklistForCategory(category, checklistId);
  return {
    id,
    initials: initialsFor(name),
    name,
    shortName: name,
    country: country || 'Not yet provided',
    category: category || 'Uncategorized',
    contact: 'Pending assignment',
    email: email || 'pending@vendor.com',
    owner: 'Elena Rostova',
    baseRiskScore: 50,
    slaHours: 48,
    sla: '48h',
    finalStatus: null,
    onboardingStep: 0,
    onboardingMethod: null,
    profile: null,
    checklistId: checklist.id,
    checklistLabel: checklist.label,
    aiSummary: 'Invitation sent. Awaiting the supplier to submit their company profile and mandatory documents.',
    documents: checklist.documents.map(([slug, code, title, docTemplate]) => ({
      id: `${id}-${slug}`, code, title, fileName: '', pageCount: 0, docTemplate,
      language: null, status: 'Missing', fields: [],
    })),
  };
}

// ---------------------------------------------------------------------------
// The seeded "just invited" vendor
//
// Every other vendor in the demo dataset is already mid-review, which meant the
// earliest part of the journey  -  invitation issued, link not yet opened, no
// profile, no documents  -  was invisible unless someone manually invited a
// vendor first. Seeding one vendor at step 0 makes that stage a first-class
// part of the demo: the "Invited" pipeline column is populated, the customer's
// vendor directory shows a real "waiting on the vendor" row with a live
// onboarding link, and switching to the vendor portal can drop you straight
// into step 1 of the wizard.
// ---------------------------------------------------------------------------
export const SEEDED_INVITE_ID = 'VEN-5527';

const buildSeededInvite = () => ({
  ...buildVendorRecord({
    id: SEEDED_INVITE_ID,
    name: 'Nordwind Lederwerk GmbH',
    country: '',
    category: '',
    email: 'k.brandt@nordwind-leder.de',
    checklistId: 'leather-textiles',
  }),
  contact: 'Katrin Brandt',
  owner: 'Elena Rostova',
  slaHours: 72,
  sla: '72h',
  aiSummary: 'Invitation issued. The supplier has not opened their onboarding link yet  -  nothing to verify.',
});

const seedVendors = () => [buildSeededInvite(), ...clone(INITIAL_VENDORS)];

// Some browsers (and every file:// document in Firefox) treat local files as
// an opaque origin and throw a SecurityError on any localStorage access.
// Persistence is a nice-to-have here, not core functionality, so every touch
// of localStorage is defensive and the app degrades to in-memory-only state
// rather than crashing when storage isn't available.
const loadPersisted = () => {
  try {
    // Drop superseded payloads before reading. Doing this on load (rather than
    // only in clearPersisted) means a browser that still holds a v6 copy is
    // cleaned up the first time the new build runs, without the tester having
    // to find "Reset demo data" to escape a screen they never chose.
    OBSOLETE_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const raw = window.localStorage.getItem(STORAGE_KEY)
      || LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.vendors || !parsed?.requests || !parsed?.auditLogs) return null;
    if (!parsed?.agentConfig?.agents) return null;
    return {
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      agentApprovals: parsed.agentApprovals
        || (parsed.pendingApprovals || []).map((item) => ({ ...item, status: 'pending', decision: null })),
    };
  } catch {
    return null;
  }
};

const savePersisted = (payload) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable (opaque file:// origin, private browsing, quota, etc.)  -  ignore.
  }
};

const clearPersisted = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    [...LEGACY_STORAGE_KEYS, ...OBSOLETE_STORAGE_KEYS].forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
};

// ---------------------------------------------------------------------------
// Reading the uploaded file.
//
// This prototype has no backend and no OCR, but "upload anything, it always
// passes" makes the whole verification story a lie  -  you cannot demonstrate a
// rejection loop if nothing can ever be rejected. So the sample documents in
// `sample-documents/` carry a machine-readable marker in their text layer:
//
//   SSX-CHECK: PASS
//   SSX-CHECK: FAIL | <short reason> | <what the supplier must do>
//
// The file is read as text and the marker looked for. A PDF's text is only
// greppable when its streams are uncompressed, which is exactly how the
// generator writes them.
//
// Anything without a marker  -  a supplier's own real document, a random file a
// tester drags in  -  passes. Failing unknown files would make the prototype
// unusable with anything but our own fixtures, and the honest default for
// "we could not read this" is to let a human look at it, not to reject it.
// ---------------------------------------------------------------------------
const MARKER = /SSX-CHECK:\s*(PASS|FAIL)([^\n\r]*)/i;

export function inspectUpload(file) {
  return new Promise((resolve) => {
    if (!file || typeof FileReader === 'undefined') { resolve({ pass: true }); return; }
    const reader = new FileReader();
    reader.onerror = () => resolve({ pass: true });
    reader.onload = () => {
      const text = String(reader.result || '');
      const match = text.match(MARKER);
      if (!match) { resolve({ pass: true, unmarked: true }); return; }
      if (match[1].toUpperCase() === 'PASS') { resolve({ pass: true }); return; }
      // Inside a PDF the marker sits in a text-showing operator, so the raw
      // match carries the closing `) Tj` with it. Cut at the first bracket.
      const payload = match[2].split(')')[0];
      const [, reason, detail] = payload.split('|').map((part) => (part || '').trim());
      resolve({
        pass: false,
        reason: reason || 'The document could not be verified',
        detail: detail || 'Upload a corrected version of this document.',
        mismatch: /match|mismatch|name/i.test(reason || ''),
        confidence: 41,
      });
    };
    // Only the head of the file is needed and PDFs can be large; slicing keeps
    // this instant even on a 10 MB scan.
    reader.readAsText(file.slice ? file.slice(0, 400000) : file);
  });
}

const fieldNeedsAttention = (f) => !f.resolved && (f.confidence < 90 || f.crossDocMismatch);

function recomputeDocStatus(doc) {
  if (doc.status === 'Missing' || doc.status === 'Uploaded' || doc.status === 'Processing') return doc.status;
  if (!doc.fields.length) return doc.status;
  if (doc.fields.some((f) => !f.resolved && (f.confidence < 60 || f.crossDocMismatch))) return 'Flagged';
  if (doc.fields.some((f) => !f.resolved && f.confidence < 90)) return 'Needs Review';
  return 'Verified';
}

function getApprovalBlockers(vendor) {
  const documents = vendor.documents || [];
  const blockers = [];
  const submitted = (vendor.onboardingStep ?? STEP_SUBMITTED) >= STEP_SUBMITTED;
  const missing = documents.filter((doc) => doc.status === 'Missing').length;
  const inFlight = documents.filter((doc) => ['Uploaded', 'Processing'].includes(doc.status)).length;
  const unresolved = documents.filter((doc) => !['Missing', 'Uploaded', 'Processing'].includes(doc.status)
    && recomputeDocStatus(doc) !== 'Verified').length;

  if (!submitted) blockers.push('The supplier has not submitted the application.');
  if (missing) blockers.push(`${missing} mandatory document${missing === 1 ? ' is' : 's are'} missing.`);
  if (inFlight) blockers.push(`${inFlight} document${inFlight === 1 ? ' is' : 's are'} still being verified.`);
  if (unresolved) blockers.push(`${unresolved} document${unresolved === 1 ? ' has' : 's have'} unresolved findings.`);
  return blockers;
}

// Turns raw vendor data into the view-model every page reads: progress,
// stage/status labels, risk tier, and open-finding counts are all derived
// from document + field state rather than stored redundantly, so they can
// never drift out of sync with the underlying evidence.
function deriveVendorView(vendor) {
  const documents = vendor.documents;
  const total = documents.length || 1;
  const submitted = (vendor.onboardingStep ?? STEP_SUBMITTED) >= STEP_SUBMITTED;
  const uploaded = documents.filter((d) => d.status === 'Uploaded').length;
  const verified = documents.filter((d) => d.status === 'Verified').length;
  const missing = documents.filter((d) => d.status === 'Missing');
  const processing = documents.filter((d) => d.status === 'Processing').length;
  const openFindings = documents.flatMap((d) => d.fields).filter(fieldNeedsAttention).length;
  const correctionsRequested = documents.filter((d) => d.status === 'Flagged' && d.rejection);

  const progress = vendor.finalStatus === 'Approved' || vendor.finalStatus === 'Active'
    ? 100
    : submitted
      ? Math.max(4, Math.round(((verified + processing * 0.5) / total) * 100))
      : Math.max(4, Math.round((((vendor.profile ? 1 : 0) + uploaded) / (total + 1)) * 100));

  let stage;
  let status;
  if (vendor.finalStatus === 'Active') { stage = 'Active'; status = 'Approved'; }
  else if (vendor.finalStatus === 'Approved') { stage = 'Approved'; status = 'Approved'; }
  else if (vendor.finalStatus === 'Rejected') { stage = 'Rejected'; status = 'Rejected'; }
  else if (vendor.finalStatus === 'Escalated') { stage = 'With supervisor'; status = 'Blocked'; }
  else if (!submitted && missing.length > 0 && missing.length === documents.length && !vendor.profile) { stage = 'Invited'; status = 'Invited'; }
  else if (!submitted) { stage = 'Awaiting submission'; status = missing.length > 0 ? 'Vendor action' : 'Draft ready'; }
  else if (correctionsRequested.length > 0 || missing.length > 0) { stage = 'Vendor action'; status = 'Blocked'; }
  else if (processing > 0) { stage = 'AI verification'; status = 'Processing'; }
  else if (openFindings > 0) { stage = 'Compliance review'; status = 'Needs review'; }
  else { stage = 'Ready to approve'; status = 'Ready'; }

  // Inherent supplier risk does not disappear because the evidence pack is clean.
  // Evidence problems add a bounded penalty; resolving them removes only that
  // penalty, preserving reviewer authority ceilings for high-risk vendors.
  const evidencePenalty = submitted && vendor.finalStatus !== 'Rejected'
    ? Math.min(15, openFindings * 2 + missing.length * 4 + correctionsRequested.length * 3)
    : 0;
  const riskScore = Math.min(100, Math.max(0, vendor.baseRiskScore + evidencePenalty));
  const risk = riskScore >= 70 ? 'High' : riskScore >= 35 ? 'Medium' : 'Low';

  return {
    ...vendor,
    progress,
    stage,
    status,
    docs: `${verified}/${documents.length}`,
    riskScore,
    risk,
    openFindings,
    correctionCount: correctionsRequested.length,
    missingCount: missing.length,
    uploadedCount: uploaded,
    verifiedCount: verified,
    // Demo-seeded vendors carry no wizard state; they are already past it.
    onboardingStep: vendor.onboardingStep ?? STEP_SUBMITTED,
    onboardingMethod: vendor.onboardingMethod ?? null,
    hasSubmittedApplication: submitted,
  };
}

const firstActionableDocument = (vendor) => {
  const missing = vendor.documents.find((d) => d.status === 'Missing');
  if (missing) return missing;
  const flagged = vendor.documents.find((d) => d.status === 'Flagged' || d.status === 'Needs Review');
  return flagged || vendor.documents[0];
};

const proposalFingerprintFor = ({ vendor, agentId, actionId, configVersion, summary, resolutions }) => JSON.stringify({
  vendorId: vendor?.id || 'platform',
  agentId,
  actionId,
  configVersion,
  summary: summary || '',
  documents: (vendor?.documents || []).map((doc) => ({
    id: doc.id,
    status: doc.status,
    fileName: doc.fileName,
    rejection: doc.rejection?.reason || null,
    fields: doc.fields.map((field) => ({
      key: field.key,
      value: field.value,
      confidence: field.confidence,
      resolved: Boolean(field.resolved),
      humanVerified: Boolean(field.humanVerified),
      mismatch: Boolean(field.crossDocMismatch),
    })),
  })),
  findingResolutions: Object.entries(resolutions || {})
    .filter(([id]) => !vendor?.id || id.startsWith(vendor.id))
    .sort(([left], [right]) => left.localeCompare(right)),
});

export function NexusProvider({ children }) {
  const persistedRef = useRef(undefined);
  if (persistedRef.current === undefined) persistedRef.current = loadPersisted() || false;
  const persisted = persistedRef.current || null;
  const timeoutHandlesRef = useRef(new Set());
  const reviewTokensRef = useRef({});
  const chaseLocksRef = useRef(new Set());
  const pendingFingerprintsRef = useRef(new Set());

  const [rawVendors, setRawVendors] = useState(() => persisted?.vendors ?? seedVendors());
  const [requests, setRequests] = useState(() => persisted?.requests ?? clone(INITIAL_REQUESTS));
  const [auditLogs, setAuditLogs] = useState(() => persisted?.auditLogs ?? clone(INITIAL_AUDIT_LOGS));
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...(persisted?.settings || {}) }));
  const [toast, setToast] = useState('');

  // --- agent platform state ------------------------------------------------
  // `agentConfig` is the live Skills/Actions/Context definition; `configHistory`
  // is every superseded version, so a compliance manager can diff and revert
  // rather than being afraid to touch it.
  const [agentConfig, setAgentConfig] = useState(() => persisted?.agentConfig ?? DEFAULT_AGENT_CONFIG());
  const [configHistory, setConfigHistory] = useState(() => persisted?.configHistory ?? []);
  // Pending and resolved proposals share one append-only decision record. The UI
  // derives the active queue and completed history from this single collection.
  const [agentApprovals, setAgentApprovals] = useState(() => persisted?.agentApprovals ?? []);
  const pendingApprovals = useMemo(
    () => agentApprovals.filter((item) => (item.status || 'pending') === 'pending'),
    [agentApprovals],
  );
  const approvalHistory = useMemo(
    () => agentApprovals.filter((item) => item.status && item.status !== 'pending'),
    [agentApprovals],
  );
  useEffect(() => {
    pendingFingerprintsRef.current = new Set(pendingApprovals.map((item) => item.fingerprint).filter(Boolean));
  }, [pendingApprovals]);
  // How a human closed each agent finding. Without this a cross-document
  // conflict or a duplicate applicant  -  neither of which has a field to
  // "accept"  -  would block approval permanently and the flow would deadlock.
  const [findingResolutions, setFindingResolutions] = useState(() => persisted?.findingResolutions ?? {});
  // Chase rungs a human pushed through early, and paused threads.
  const [chaseState, setChaseState] = useState(() => persisted?.chaseState ?? {});
  // Everything waiting on the supervisor, of every kind  -  see REQUEST_TYPES in
  // mockData for what those kinds are and why each one is a supervisor's
  // decision rather than a reviewer's. One queue rather than five, because to
  // the person answering them they are all the same job: something is blocked
  // pending your authority. Splitting them across pages would just mean five
  // places to forget to look.
  const [supervisorRequests, setSupervisorRequests] = useState(
    () => persisted?.supervisorRequests ?? clone(INITIAL_REQUESTS_TO_SUPERVISOR),
  );
  // Who the agents are currently running as. Agents inherit this person's
  // permissions and can never exceed them.
  const [actorRole, setActorRole] = useState('Compliance Manager');

  // The vendor whose eyes the Vendor portal is currently looking through. An
  // invite link repoints this; otherwise it is the demo supplier. Keeping it in
  // context (rather than in the shell) means every vendor-side screen reads the
  // same subject and the customer side stays in sync automatically.
  const [activeVendorId, setActiveVendorId] = useState(DEMO_VENDOR_ID);

  useEffect(() => {
    savePersisted({
      vendors: rawVendors, requests, auditLogs, settings,
      agentConfig, configHistory, agentApprovals, findingResolutions, chaseState, supervisorRequests,
    });
  }, [rawVendors, requests, auditLogs, settings, agentConfig, configHistory, agentApprovals, findingResolutions, chaseState, supervisorRequests]);

  useEffect(() => () => {
    timeoutHandlesRef.current.forEach((handle) => window.clearTimeout(handle));
    timeoutHandlesRef.current.clear();
    reviewTokensRef.current = {};
    chaseLocksRef.current.clear();
    pendingFingerprintsRef.current.clear();
  }, []);

  const scheduleTimeout = useCallback((callback, delay) => {
    const handle = window.setTimeout(() => {
      timeoutHandlesRef.current.delete(handle);
      callback();
    }, delay);
    timeoutHandlesRef.current.add(handle);
    return handle;
  }, []);

  const notify = useCallback((message, priority = 'info') => {
    if (!settings.notifications && priority === 'info') return;
    setToast(message);
    scheduleTimeout(() => setToast((current) => (current === message ? '' : current)), 3200);
  }, [settings.notifications, scheduleTimeout]);

  const vendors = useMemo(() => rawVendors.map(deriveVendorView), [rawVendors]);
  const getVendor = useCallback((id) => vendors.find((v) => v.id === id) || vendors[0], [vendors]);

  const appendAudit = useCallback((entry) => {
    setAuditLogs((current) => [{
      id: makeRuntimeId('AUD'),
      timestamp: new Date().toISOString(),
      ...entry,
    }, ...current]);
  }, []);

  const updateSettings = useCallback((nextSettings) => {
    const next = {
      density: nextSettings?.density === 'compact' ? 'compact' : 'comfortable',
      notifications: nextSettings?.notifications !== false,
    };
    setSettings(next);
    appendAudit({
      vendorId: '—', vendorName: 'StyleSphere workspace',
      actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
      actionType: 'SETTINGS_UPDATED', documentName: 'Workspace preferences', fieldLabel: 'Density and notifications',
      originalValue: `${settings.density}; notifications ${settings.notifications ? 'on' : 'off'}`,
      humanValue: `${next.density}; notifications ${next.notifications ? 'on' : 'off'}`,
      reason: 'Workspace preferences updated', notes: 'Display preferences persist across refreshes and are preserved by Reset Demo Data.',
    });
    notify(`Settings saved — notifications ${next.notifications ? 'on' : 'off'}, ${next.density} density.`, 'critical');
  }, [settings, appendAudit, notify]);

  // -------------------------------------------------------------------------
  // Agent derivations.
  //
  // Assessments, chase threads and triage bands are all DERIVED from vendor
  // state + the current agent config, never stored. Change a skill in the Agent
  // Console and every finding, tier and queue band recomputes on the next
  // render  -  which is the point of making the config real rather than cosmetic.
  // -------------------------------------------------------------------------
  const agentState = useMemo(() => {
    const now = Date.now();
    const map = {};
    for (const vendor of vendors) {
      const assessment = evaluateVendor(vendor, {
        allVendors: vendors, config: agentConfig, now, resolutions: findingResolutions,
      });
      const threads = buildChaserThreads(vendor, { config: agentConfig, chaseState });
      map[vendor.id] = { assessment, threads, triage: triageVendor(vendor, assessment, threads) };
    }
    return map;
  }, [vendors, agentConfig, findingResolutions, chaseState]);

  const getAssessment = useCallback((id) => agentState[id]?.assessment
    ?? { findings: [], open: [], blockers: [], cautions: [], gates: {}, stats: {}, brief: [] }, [agentState]);
  const getThreads = useCallback((id) => agentState[id]?.threads ?? [], [agentState]);
  const getTriage = useCallback((id) => agentState[id]?.triage ?? { band: 'working' }, [agentState]);

  const mutateDoc = useCallback((vendorId, docId, updater) => {
    setRawVendors((current) => current.map((vendor) => {
      if (vendor.id !== vendorId) return vendor;
      return {
        ...vendor,
        documents: vendor.documents.map((doc) => (doc.id === docId ? updater(doc) : doc)),
      };
    }));
  }, []);

  // -------------------------------------------------------------------------
  // dispatchAgentAction  -  the single choke point for everything an agent does.
  //
  // Nothing an agent performs bypasses this function. It checks the allowlist,
  // the enabled flag, the record owner's permissions and the approval gate;
  // then it either executes, queues for approval, or refuses  -  and in all three
  // cases it writes an audit entry carrying the agent's reasoning and the
  // policy clause it acted under. A refusal is as auditable as an execution.
  // -------------------------------------------------------------------------
  const dispatchAgentAction = useCallback((agentId, actionId, {
    vendorId, summary, reasoning, clauseId, execute, silent, configChange,
  } = {}) => {
    const definition = AGENTS_BY_ID[agentId];
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const verdict = canPerform(agentConfig, agentId, actionId, actorRole);
    const base = {
      vendorId: vendorId || '—',
      vendorName: vendor?.name || 'Platform',
      actorName: definition?.name || agentId,
      actorId: `AGT-${agentId.toUpperCase()}@v${agentConfig.version}`,
      agentId,
      documentName: summary || actionId,
      reasoning: reasoning || verdict.reason,
      clauseRef: clauseId || verdict.clauseId || null,
    };

    if (!verdict.allowed) {
      appendAudit({
        ...base,
        actionType: 'AGENT_BLOCKED',
        fieldLabel: verdict.label || actionId,
        originalValue: 'Agent attempted action',
        humanValue: 'Refused by governance',
        reason: verdict.reason,
        notes: `Blocked (${verdict.blocked}). ${verdict.reason}`,
      });
      if (!silent) notify(`Blocked: ${verdict.reason}`, 'critical');
      return { ...verdict, executed: false };
    }

    if (verdict.requiresApproval) {
      const fingerprint = proposalFingerprintFor({
        vendor, agentId, actionId, configVersion: agentConfig.version,
        summary, resolutions: findingResolutions,
      });
      const priorProposal = agentApprovals.find((approval) => approval.fingerprint === fingerprint);
      if (pendingFingerprintsRef.current.has(fingerprint) || (priorProposal && (priorProposal.status || 'pending') === 'pending')) {
        if (!silent) notify('An unchanged proposal is already awaiting review.');
        return { ...verdict, executed: false, queued: false, duplicate: true, priorStatus: 'pending' };
      }
      pendingFingerprintsRef.current.add(fingerprint);
      const item = {
        id: makeRuntimeId('APR'),
        agentId, agentName: definition?.name || agentId, actionId, vendorId,
        vendorName: vendor?.name || 'Platform', label: verdict.label,
        summary: summary || verdict.label, reasoning: reasoning || verdict.reason,
        clauseId: clauseId || verdict.clauseId || null, risk: verdict.risk,
        requestedAt: new Date().toISOString(), status: 'pending', decision: null,
        fingerprint, configChange: configChange || null,
      };
      setAgentApprovals((current) => [item, ...current]);
      appendAudit({
        ...base,
        actionType: 'AGENT_PENDING',
        fieldLabel: verdict.label,
        originalValue: 'Agent proposed action',
        humanValue: 'Awaiting human review',
        reason: verdict.reason,
        notes: `${verdict.label} queued for a human with approval authority.`,
      });
      if (!silent) notify(`${definition.name} proposal is awaiting review.`);
      return { ...verdict, executed: false, queued: true, approvalId: item.id };
    }

    execute?.();
    appendAudit({
      ...base,
      actionType: 'AGENT_ACTION',
      fieldLabel: verdict.label,
      originalValue: null,
      humanValue: summary || verdict.label,
      reason: reasoning || verdict.reason,
      notes: `${verdict.label} executed autonomously under the ${definition.name} allowlist.`,
    });
    if (!silent) notify(`${definition.name}: ${summary || verdict.label}.`);
    return { ...verdict, executed: true };
  }, [rawVendors, agentConfig, actorRole, findingResolutions, agentApprovals, appendAudit, notify]);

  const resolveApproval = useCallback((approvalId, outcome, note = '') => {
    const item = agentApprovals.find((approval) => approval.id === approvalId && (approval.status || 'pending') === 'pending');
    if (!item) return false;
    const accepted = ['approve', 'accept', 'accepted'].includes(outcome);
    const decidedAt = new Date().toISOString();
    const status = accepted ? 'accepted' : 'declined';
    const decision = {
      outcome: status,
      note: note.trim(),
      decidedAt,
      decidedBy: CURRENT_USERS.customer.name,
      decidedById: CURRENT_USERS.customer.id,
    };
    setAgentApprovals((current) => current.map((approval) => (
      approval.id === approvalId ? { ...approval, status, decision } : approval
    )));
    pendingFingerprintsRef.current.delete(item.fingerprint);
    if (accepted && item.agentId === 'config' && item.configChange) {
      const changedAt = new Date().toISOString();
      setConfigHistory((history) => [{ ...agentConfig, retiredAt: changedAt }, ...history].slice(0, 20));
      setAgentConfig({
        ...agentConfig,
        version: agentConfig.version + 1,
        updatedAt: changedAt,
        updatedBy: CURRENT_USERS.customer.name,
        note: `Accepted Config Agent proposal: ${item.configChange.description}`,
        acceptedWorkflowChanges: [
          ...(agentConfig.acceptedWorkflowChanges || []),
          { ...item.configChange, acceptedAt: changedAt, acceptedBy: CURRENT_USERS.customer.name },
        ].slice(-20),
      });
    }
    const vendor = rawVendors.find((candidate) => candidate.id === item.vendorId);
    appendAudit({
      vendorId: item.vendorId || '—', vendorName: vendor?.name || item.vendorName || 'Platform',
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      agentId: item.agentId,
      actionType: 'AGENT_APPROVAL',
      documentName: item.summary, fieldLabel: item.label,
      originalValue: `${item.agentName || AGENTS_BY_ID[item.agentId]?.name || item.agentId} proposed this`,
      humanValue: accepted ? 'Accepted' : 'Declined',
      reason: decision.note || (accepted ? 'Human accepted the proposal' : 'Human declined the proposal'),
      reasoning: item.reasoning, clauseRef: item.clauseId,
      notes: `Decision retained in proposal history. Resolved by ${CURRENT_USERS.customer.name}.`,
    });
    const message = item.agentId === 'compliance' && accepted
      ? 'Compliance recommendation approved.'
      : item.agentId === 'config' && accepted
        ? 'Config Agent proposal accepted.'
        : `Agent proposal ${accepted ? 'accepted' : 'declined'}.`;
    notify(message, 'critical');
    return true;
  }, [agentApprovals, rawVendors, agentConfig, appendAudit, notify]);
  // --- agent configuration, versioned --------------------------------------
  // Note: the next configuration is computed OUTSIDE the state updater. Putting
  // the `setConfigHistory` call inside a `setAgentConfig(fn)` updater made it a
  // side effect in a function React deliberately double-invokes under
  // StrictMode, which silently duplicated every history entry.
  const updateAgentConfig = useCallback((mutator, note) => {
    const current = agentConfig;
    const next = mutator(clone(current));
    setConfigHistory((history) => [{ ...current, retiredAt: new Date().toISOString() }, ...history].slice(0, 20));
    setAgentConfig({
      ...next,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: CURRENT_USERS.customer.name,
      note: note || 'Configuration updated.',
    });
    appendAudit({
      vendorId: ' - ', vendorName: 'Agent platform',
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'AGENT_CONFIG', documentName: 'Agent configuration', fieldLabel: 'Skills / Actions / Context',
      originalValue: `v${agentConfig.version}`, humanValue: `v${agentConfig.version + 1}`,
      reason: note || 'Configuration updated', reasoning: 'Human edit to agent configuration.',
      notes: 'Previous version retained and revertable.',
    });
    notify(note || 'Agent configuration updated.');
  }, [agentConfig, appendAudit, notify]);

  const revertAgentConfig = useCallback((version) => {
    const target = configHistory.find((c) => c.version === version);
    if (!target) return;
    const { retiredAt, ...restored } = target;
    void retiredAt;
    setConfigHistory((history) => [{ ...agentConfig, retiredAt: new Date().toISOString() }, ...history].slice(0, 20));
    setAgentConfig({
      ...restored,
      version: agentConfig.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: CURRENT_USERS.customer.name,
      note: `Reverted to the configuration from v${version}.`,
    });
    appendAudit({
      vendorId: ' - ', vendorName: 'Agent platform',
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'AGENT_CONFIG', documentName: 'Agent configuration', fieldLabel: 'Version revert',
      originalValue: `v${agentConfig.version}`, humanValue: `v${agentConfig.version + 1} (contents of v${version})`,
      reason: 'Reverted to an earlier configuration', reasoning: 'Human-initiated rollback.',
      notes: 'Rollback recorded; no configuration version is ever deleted.',
    });
    notify(`Reverted to the v${version} configuration.`);
  }, [configHistory, agentConfig, appendAudit, notify]);

  const acceptField = useCallback((vendorId, docId, fieldKey, note) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const doc = vendor?.documents.find((d) => d.id === docId);
    const targetField = doc?.fields.find((f) => f.key === fieldKey);
    if (!targetField) return;

    mutateDoc(vendorId, docId, (current) => {
      const nextFields = current.fields.map((f) => (f.key === fieldKey
        ? { ...f, resolved: true, humanVerified: true, confidence: 100 }
        : f));
      return { ...current, fields: nextFields, status: recomputeDocStatus({ ...current, fields: nextFields }) };
    });

    appendAudit({
      vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'FIELD_ACCEPT', documentName: doc.title, fieldLabel: targetField.label,
      originalValue: targetField.value, humanValue: targetField.value,
      reason: 'AI value confirmed correct', notes: note || 'Reviewer confirmed the AI-extracted value against source evidence.',
    });
    notify(`"${targetField.label}" accepted and logged to the audit trail.`);
  }, [rawVendors, mutateDoc, appendAudit, notify]);

  const correctField = useCallback((vendorId, docId, fieldKey, newValue, reason, notes) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const doc = vendor?.documents.find((d) => d.id === docId);
    const targetField = doc?.fields.find((f) => f.key === fieldKey);
    if (!targetField || !newValue) return;
    const oldValue = targetField.value;

    mutateDoc(vendorId, docId, (current) => {
      const nextFields = current.fields.map((f) => (f.key === fieldKey
        ? { ...f, value: newValue, translatedValue: undefined, resolved: true, humanVerified: true, confidence: 100 }
        : f));
      return { ...current, fields: nextFields, status: recomputeDocStatus({ ...current, fields: nextFields }) };
    });

    appendAudit({
      vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'FIELD_OVERRIDE', documentName: doc.title, fieldLabel: targetField.label,
      originalValue: oldValue, humanValue: newValue,
      reason: reason || 'Cross-document verification', notes: notes || 'Corrected via the Review Workspace.',
    });
    notify(`"${targetField.label}" corrected and logged to the audit trail.`);
  }, [rawVendors, mutateDoc, appendAudit, notify]);

  const runDocumentReview = useCallback((vendorId, docId, verdict, options = {}) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    const doc = vendor?.documents.find((candidate) => candidate.id === docId);
    if (!vendor || !doc) return;
    const outcome = verdict && typeof verdict.pass === 'boolean' ? verdict : { pass: true };
    const { quiet = false, notifyOnPass = true } = options;
    const reviewedFileName = options.fileName || doc.fileName || 'Uploaded file';
    const reviewId = makeRuntimeId('REV');
    reviewTokensRef.current[docId] = reviewId;

    mutateDoc(vendorId, docId, (current) => ({
      ...current,
      status: 'Processing',
      rejection: null,
      pendingVerdict: outcome,
      pendingReviewId: reviewId,
    }));
    setChaseState((current) => ({
      ...current,
      [docId]: {
        ...current[docId],
        requested: Boolean(current[docId]?.requested),
        reviewing: true,
        inboundStatus: null,
        completedAt: null,
      },
    }));

    scheduleTimeout(() => {
      if (reviewTokensRef.current[docId] !== reviewId) return;
      delete reviewTokensRef.current[docId];
      const completedAt = new Date().toISOString();
      if (outcome.pass === false) {
        const clauseId = DOC_CLAUSE[doc.code] || 'PROC-3.3';
        mutateDoc(vendorId, docId, (current) => ({
          ...current,
          status: 'Flagged',
          rejection: {
            reason: outcome.reason,
            detail: outcome.detail,
            at: completedAt,
          },
          pendingVerdict: outcome,
          pendingReviewId: null,
          fields: [{
            key: 'document_status',
            label: 'Verification result',
            value: outcome.reason,
            confidence: outcome.confidence ?? 41,
            resolved: false,
            crossDocMismatch: Boolean(outcome.mismatch),
            diagnostic: outcome.detail,
            mismatchNote: outcome.detail,
          }],
        }));
        setChaseState((current) => ({
          ...current,
          [docId]: {
            ...current[docId], requested: true, reviewing: false,
            reason: outcome.reason, detail: outcome.detail, clauseId,
            dueState: 'Correction required', requestedAt: completedAt, completedAt: null,
          },
        }));
        appendAudit({
          vendorId, vendorName: vendor.name, actorName: 'StyleSphere AI', actorId: 'IDP-3.4',
          actionType: 'DOCUMENT_REJECTED', documentName: doc.title, fieldLabel: 'Automated verification',
          originalValue: reviewedFileName, humanValue: `Correction requested — ${outcome.reason}`,
          reason: outcome.reason,
          clauseRef: clauseId,
          notes: `${outcome.detail} A re-upload task remains open in the supplier portal.`,
        });
        if (!quiet) notify(`${doc.title} needs a corrected file — ${outcome.reason}.`, 'critical');
        return;
      }

      mutateDoc(vendorId, docId, (current) => ({
        ...current,
        status: 'Verified',
        rejection: null,
        pendingVerdict: outcome,
        pendingReviewId: null,
        fields: current.fields.length
          ? current.fields.map((field) => ({
            ...field, confidence: 97, resolved: true, crossDocMismatch: false, diagnostic: null, mismatchNote: null,
          }))
          : [{ key: 'document_status', label: 'Verification result', value: 'Authenticity and completeness confirmed', confidence: 97, resolved: true, humanVerified: false }],
      }));
      setChaseState((current) => {
        const previous = current[docId] || {};
        const completionMessage = { id: makeRuntimeId('MSG'), from: 'system', at: completedAt, body: `${doc.title} passed verification. This request is closed.` };
        return {
          ...current,
          [docId]: {
            ...previous, requested: false, reviewing: false, inboundStatus: null,
            completedAt, dueState: 'Completed',
            messages: previous.requested ? [...(previous.messages || []), completionMessage] : (previous.messages || []),
          },
        };
      });
      appendAudit({
        vendorId, vendorName: vendor.name, actorName: 'StyleSphere AI', actorId: 'IDP-3.4',
        actionType: 'DOCUMENT_VERIFIED', documentName: doc.title, fieldLabel: 'Automated verification',
        originalValue: reviewedFileName, humanValue: 'Verified — 97% confidence',
        reason: 'Automated authenticity, expiry, and completeness checks', notes: `${doc.title} passed simulated AI verification. Any open supplier task was closed.`,
      });
      if (!quiet && notifyOnPass) notify(`${doc.title} passed review and is back with compliance.`, 'critical');
    }, 1500);
  }, [rawVendors, mutateDoc, appendAudit, notify, scheduleTimeout]);
  // Before submission, uploads only build the draft pack. After submission the
  // same action becomes a correction loop and re-enters verification.
  const uploadDocument = useCallback((vendorId, docId, fileName, verdict) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const doc = vendor?.documents.find((d) => d.id === docId);
    if (!vendor || !doc) return;
    const submitted = (vendor.onboardingStep ?? STEP_SUBMITTED) >= STEP_SUBMITTED;
    const safeFileName = fileName || `${doc.code.toLowerCase()}_replacement.pdf`;
    const safeVerdict = verdict && typeof verdict.pass === 'boolean' ? verdict : { pass: true };

    mutateDoc(vendorId, docId, (current) => ({
      ...current,
      fileName: safeFileName,
      pageCount: current.pageCount || 1,
      status: submitted ? 'Processing' : 'Uploaded',
      rejection: null,
      pendingVerdict: safeVerdict,
      fields: submitted ? current.fields : [],
    }));
    appendAudit({
      vendorId,
      vendorName: vendor.name,
      actorName: vendor.profile?.contactName || CURRENT_USERS.vendor.name,
      actorId: vendor.profile ? vendor.id : CURRENT_USERS.vendor.id,
      actionType: 'DOCUMENT_UPLOAD', documentName: doc.title, fieldLabel: 'Document upload',
      originalValue: doc.fileName || 'No file on record', humanValue: safeFileName,
      reason: submitted ? 'Supplier submitted corrected evidence' : 'Supplier added document to the draft application',
      notes: submitted
        ? `${safeFileName} received and queued for AI verification.`
        : `${safeFileName} received and attached to the draft submission. Review starts after the application is submitted.`,
    });

    if (!submitted) {
      notify(`${doc.title} added to your application draft.`);
      return;
    }

    notify('Upload received. Review has restarted.');
    runDocumentReview(vendorId, docId, safeVerdict, { notifyOnPass: true, fileName: safeFileName });
  }, [rawVendors, mutateDoc, appendAudit, notify, runDocumentReview]);

  // Removing a file the supplier attached by mistake. Only meaningful while the
  // application is still a draft: once submitted, the pack is evidence a
  // reviewer is working from, and withdrawing a file underneath them would
  // break the audit trail's central promise. So this refuses after submission
  // rather than quietly doing something different  -  the correction loop is
  // the supported route at that point.
  const deleteDocument = useCallback((vendorId, docId) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const doc = vendor?.documents.find((d) => d.id === docId);
    if (!vendor || !doc) return;
    if ((vendor.onboardingStep ?? STEP_SUBMITTED) >= STEP_SUBMITTED) return;
    if (doc.status === 'Missing') return;

    mutateDoc(vendorId, docId, (current) => ({
      ...current,
      fileName: '',
      pageCount: 0,
      language: null,
      status: 'Missing',
      rejection: null,
      pendingVerdict: null,
      fields: [],
    }));
    appendAudit({
      vendorId,
      vendorName: vendor.name,
      actorName: vendor.profile?.contactName || CURRENT_USERS.vendor.name,
      actorId: vendor.profile ? vendor.id : CURRENT_USERS.vendor.id,
      actionType: 'DOCUMENT_UPLOAD', documentName: doc.title, fieldLabel: 'Document removed',
      originalValue: doc.fileName || 'No file on record', humanValue: 'Removed from the draft',
      reason: 'Supplier removed a document from the draft application',
      notes: `${doc.fileName || 'The file'} was removed before submission. The requirement is outstanding again.`,
    });
    notify(`${doc.title} removed. You can upload a different file.`);
  }, [rawVendors, mutateDoc, appendAudit, notify]);

  const uploadNextActionable = useCallback((vendorId, fileName, verdict) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor) return;
    const doc = firstActionableDocument(vendor);
    if (doc) uploadDocument(vendorId, doc.id, fileName, verdict);
  }, [rawVendors, uploadDocument]);

  // -------------------------------------------------------------------------
  // resolveFinding  -  the human override, for findings with no field to accept.
  //
  // The brief's override rule: a human can accept, reject or edit any AI
  // finding, and every action logs the AI recommendation, the human decision,
  // the reason, timestamp and user ID. This is that, for the finding kinds a
  // field-level accept cannot reach  -  cross-document conflicts, duplicate
  // applicants, threshold breaches.
  // -------------------------------------------------------------------------
  const resolveFinding = useCallback((vendorId, finding, outcome, reason) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor || !finding) return;
    const [label, fallback] = FINDING_OUTCOMES[outcome] || FINDING_OUTCOMES.accept;
    setFindingResolutions((current) => ({
      ...current,
      [finding.id]: {
        outcome, label,
        reason: reason || fallback,
        by: CURRENT_USERS.customer.name,
        at: new Date().toISOString(),
      },
    }));
    appendAudit({
      vendorId, vendorName: vendor.name,
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      agentId: finding.agentId,
      actionType: 'FINDING_RESOLVED',
      documentName: finding.evidence?.[0]?.source || 'Agent finding',
      fieldLabel: finding.title,
      originalValue: `${AGENTS_BY_ID[finding.agentId]?.name || 'Agent'} raised this as ${finding.tier}`,
      humanValue: label,
      reason: reason || fallback,
      reasoning: finding.detail,
      clauseRef: finding.clause?.id || null,
      notes: `Agent recommended: ${finding.recommendation}`,
    });
    notify(`"${finding.title}"  -  ${label.toLowerCase()}.`);
  }, [rawVendors, appendAudit, notify]);

  const reopenFinding = useCallback((vendorId, finding) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    setFindingResolutions((current) => {
      const next = { ...current };
      delete next[finding.id];
      return next;
    });
    if (vendor) {
      appendAudit({
        vendorId, vendorName: vendor.name,
        actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
        agentId: finding.agentId, actionType: 'FINDING_REOPENED',
        documentName: 'Agent finding', fieldLabel: finding.title,
        originalValue: 'Resolved', humanValue: 'Reopened',
        reason: 'Reviewer reopened a previously resolved finding',
        clauseRef: finding.clause?.id || null,
        notes: 'The original resolution stays in the trail; nothing is deleted.',
      });
    }
    notify(`"${finding.title}" reopened.`);
  }, [rawVendors, appendAudit, notify]);

  // -------------------------------------------------------------------------
  // runAgentPass  -  an explicit, visible agent run over one supplier.
  //
  // Previously the agents were only ever implicit. Making the pass an operation
  // means the human-in-the-loop gate becomes reachable: the Compliance Agent is
  // suggest-only, so its recommendation lands in `pendingApprovals` and has to
  // be released by a person before it counts.
  // -------------------------------------------------------------------------
  const runAgentPass = useCallback((vendorId) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    if (!vendor) return { executed: false };
    const view = deriveVendorView(vendor);
    const fieldCount = vendor.documents.flatMap((doc) => doc.fields).length;

    dispatchAgentAction('verification', 'run_extraction', {
      vendorId, silent: true,
      summary: `Re-read ${vendor.documents.filter((doc) => doc.status !== 'Missing').length} documents and ${fieldCount} fields`,
      reasoning: 'Extraction, cross-document consistency and validity windows re-checked against the current evidence pack.',
      clauseId: 'PROC-2.1',
    });
    dispatchAgentAction('verification', 'query_registry', {
      vendorId, silent: true,
      summary: `Corroborated registrations against the ${vendor.country || 'national'} registry`,
      reasoning: 'Claimed registration numbers were checked against the simulated public-registry context rather than accepted without corroboration.',
      clauseId: 'GST-1.2',
    });
    if (view.missingCount > 0) {
      dispatchAgentAction('chaser', 'send_request', {
        vendorId, silent: true,
        summary: `Opened chase threads for ${view.missingCount} outstanding document(s)`,
        reasoning: 'PROC-3.3 blocks review while mandatory evidence is missing, so the Chaser Agent owns the follow-up.',
        clauseId: 'PROC-3.3',
      });
    }
    return dispatchAgentAction('compliance', 'write_recommendation', {
      vendorId,
      summary: `Readiness recommendation for ${vendor.shortName || vendor.name}`,
      reasoning: 'The Compliance Agent may write a cited recommendation, but a human must review that recommendation. PROC-5.1 reserves the vendor decision for a person.',
      clauseId: 'PROC-5.1',
    });
  }, [rawVendors, dispatchAgentAction]);
  // --- Chaser Agent operations ---------------------------------------------

  // Sends the next rung of the escalation ladder immediately rather than
  // waiting for its scheduled slot.
  const chaseNow = useCallback((vendorId, docId, step) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    const doc = vendor?.documents.find((candidate) => candidate.id === docId);
    const state = chaseState[docId] || {};
    if (!doc || !step || state.paused || (state.forced || []).includes(step.kind)) return false;
    const outcome = dispatchAgentAction('chaser', step.action || 'send_followup', {
      vendorId,
      summary: `${step.kind === 'escalate' ? 'Escalated' : step.kind === 'handoff' ? 'Handed to a human' : 'Followed up'} on ${doc.title} via ${step.channel} in ${step.languageName}`,
      reasoning: `PROC-3.3 keeps the request open while ${doc.title} is outstanding. The supplier can reply with an attachment on the same thread.`,
      clauseId: 'PROC-3.3',
    });
    if (!outcome.executed) return false;
    const sentAt = new Date().toISOString();
    setChaseState((current) => ({
      ...current,
      [docId]: {
        ...current[docId],
        forced: [...new Set([...(current[docId]?.forced || []), step.kind])],
        messages: [...(current[docId]?.messages || []), { id: makeRuntimeId('MSG'), from: 'agent', at: sentAt, body: step.body || `${step.kind} sent via ${step.channel}.` }],
      },
    }));
    return true;
  }, [rawVendors, chaseState, dispatchAgentAction]);

  const setChasePaused = useCallback((vendorId, docId, paused) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    const doc = vendor?.documents.find((candidate) => candidate.id === docId);
    if (!doc || Boolean(chaseState[docId]?.paused) === paused) return false;
    setChaseState((current) => ({ ...current, [docId]: { ...current[docId], paused } }));
    appendAudit({
      vendorId, vendorName: vendor.name,
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      agentId: 'chaser', actionType: paused ? 'CHASER_PAUSED' : 'CHASER_RESUMED',
      documentName: doc.title, fieldLabel: 'Supplier follow-up thread',
      originalValue: paused ? 'Active' : 'Paused', humanValue: paused ? 'Paused' : 'Active',
      reason: paused ? 'Human paused supplier contact' : 'Human resumed supplier contact',
      clauseRef: 'PROC-3.3', notes: 'A direct human control; no separate agent approval is required.',
    });
    notify(paused ? `Chasing paused for ${doc.title}.` : `Chasing resumed for ${doc.title}.`, 'critical');
    return true;
  }, [rawVendors, chaseState, appendAudit, notify]);

  const ingestChaserReply = useCallback((vendorId, docId, fileName, verdict) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    const doc = vendor?.documents.find((candidate) => candidate.id === docId);
    if (!doc || chaseLocksRef.current.has(docId)) return false;
    const safeName = fileName || `${doc.code.toLowerCase()}_supplier_reply.jpg`;
    chaseLocksRef.current.add(docId);
    const receivedAt = new Date().toISOString();
    setChaseState((current) => ({
      ...current,
      [docId]: {
        ...current[docId], inboundStatus: 'processing',
        messages: [...(current[docId]?.messages || []), { id: makeRuntimeId('MSG'), from: 'supplier', at: receivedAt, body: `Attachment received: ${safeName}` }],
      },
    }));
    notify('Supplier reply received. Filing the attachment…', 'critical');
    scheduleTimeout(() => {
      const outcome = dispatchAgentAction('chaser', 'ingest_attachment', {
        vendorId, silent: true,
        summary: `Filed ${safeName} from the supplier reply against ${doc.title}`,
        reasoning: 'The attachment arrived on the existing supplier thread and is entering the same deterministic review path as a portal re-upload.',
        clauseId: 'PROC-3.3',
      });
      chaseLocksRef.current.delete(docId);
      if (!outcome.executed) {
        setChaseState((current) => ({ ...current, [docId]: { ...current[docId], inboundStatus: null } }));
        notify('The attachment could not be filed under the current agent permissions.', 'critical');
        return;
      }
      uploadDocument(vendorId, docId, safeName, verdict);
    }, 1500);
    return true;
  }, [rawVendors, dispatchAgentAction, uploadDocument, notify, scheduleTimeout]);
  // Anything an admin (or the monitoring agent) sends up to the supervisor.
  // One entry point for every type, so a new request kind never needs its own
  // plumbing  -  only an entry in REQUEST_TYPES and the detail it wants shown.
  const raiseRequest = useCallback(({ type, vendorId, title, reason, riskScore, detail, raisedBy }) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const meta = REQUEST_TYPES[type];
    const request = {
      id: `REQ-${Math.floor(4500 + Math.random() * 400)}`,
      type,
      vendorId: vendorId || null,
      vendorName: vendor?.name || 'Platform',
      vendorShortName: vendor?.shortName || vendor?.name || 'Platform',
      title,
      reason,
      raisedBy: raisedBy || CURRENT_USERS.admin.name,
      raisedById: CURRENT_USERS.admin.id,
      raisedAt: new Date().toISOString(),
      slaHours: meta?.slaHours ?? 24,
      riskScore: riskScore ?? null,
      detail: detail || {},
      status: 'open', outcome: null, supervisorNote: '', resolvedAt: null, expiresAt: null,
    };
    // One open request per vendor per type. Raising the same thing twice is a
    // double-click, not a second decision, and a supervisor should never have
    // to work out which of two identical cards is the real one.
    setSupervisorRequests((current) => [
      request,
      ...current.filter((r) => !(r.vendorId === vendorId && r.type === type && r.status === 'open')),
    ]);
    notify(`${meta?.label || 'Request'} sent to ${CURRENT_USERS.supervisor.name}.`);
    return request;
  }, [rawVendors, notify]);

  const submitDecision = useCallback((vendorId, decisionType, notes = '', context = {}) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    if (!vendor) return false;
    const view = deriveVendorView(vendor);
    const labels = {
      APPROVE: 'Vendor approved', REJECT: 'Vendor rejected',
      REQUEST_DOCS: 'Document request sent', ESCALATE: 'Escalated to supervisor',
    };
    const finalStatus = { APPROVE: 'Approved', REJECT: 'Rejected', ESCALATE: 'Escalated', REQUEST_DOCS: null }[decisionType];

    // --- duplicate-action prevention -------------------------------------
    //
    // A second APPROVE on an approved vendor is a double-click, not a second
    // decision. Letting it through would write a duplicate DECISION entry and
    // make the audit trail read as though the vendor were approved twice by the
    // same person — which is exactly the kind of thing an auditor asks about.
    if (['Approved', 'Active'].includes(vendor.finalStatus) && ['APPROVE', 'ESCALATE'].includes(decisionType)) {
      notify(`${vendor.shortName || vendor.name} is already ${vendor.finalStatus.toLowerCase()}.`, 'critical');
      return false;
    }
    if (vendor.finalStatus === 'Rejected' && decisionType === 'REJECT') {
      notify(`${vendor.shortName || vendor.name} is already rejected.`, 'critical');
      return false;
    }
    if (decisionType === 'ESCALATE'
      && supervisorRequests.some((r) => r.vendorId === vendorId && r.status === 'open' && ['ESCALATION', 'AUTHORITY'].includes(r.type))) {
      notify('This case is already with the supervisor.', 'critical');
      return false;
    }

    if (decisionType === 'APPROVE') {
      // Delegation of authority, enforced structurally rather than by which
      // button the workspace happened to render.
      if (view.riskScore > APPROVAL_CEILING) {
        appendAudit({
          vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
          actionType: 'AUTHORITY_LIMIT_BLOCKED', documentName: 'Full compliance application', fieldLabel: 'Vendor approval',
          originalValue: `Residual risk ${view.riskScore}/100`,
          humanValue: `Refused — above the ${APPROVAL_CEILING} delegated limit`,
          reason: `${CURRENT_USERS.admin.role} may approve up to residual risk ${APPROVAL_CEILING}. This vendor scores ${view.riskScore}.`,
          clauseRef: 'PROC-5.1',
          notes: `Send this to ${CURRENT_USERS.supervisor.name} for four-eyes approval instead.`,
        });
        notify(`Residual risk ${view.riskScore} is above your ${APPROVAL_CEILING} limit — send it for approval instead.`, 'critical');
        return false;
      }
      const approvalBlockers = getApprovalBlockers(vendor);
      if (approvalBlockers.length) {
        appendAudit({
          vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
          actionType: 'APPROVAL_GATE_BLOCKED', documentName: 'Full compliance application', fieldLabel: 'Vendor approval',
          originalValue: `AI risk score ${view.riskScore}/100`, humanValue: 'Approval refused by evidence gate',
          reason: approvalBlockers.join(' '), clauseRef: 'PROC-5.1',
          notes: 'Mandatory evidence cannot be waived by a reviewer decision.',
        });
        notify(`Approval blocked - ${approvalBlockers.join(' ')}`, 'critical');
        return false;
      }
    }

    if (finalStatus) {
      setRawVendors((current) => current.map((candidate) => (candidate.id === vendorId
        ? { ...candidate, finalStatus, supervisorNote: null }
        : candidate)));
    }

    let targetDoc = null;
    let requestReason = notes;
    let clauseId = null;
    if (decisionType === 'REQUEST_DOCS') {
      const selectedFinding = context.finding || null;
      targetDoc = vendor.documents.find((doc) => doc.status === 'Missing')
        || vendor.documents.find((doc) => doc.id === selectedFinding?.docId)
        || vendor.documents.find((doc) => ['Flagged', 'Needs Review'].includes(doc.status))
        || firstActionableDocument(vendor);
      if (!targetDoc) return false;
      // One open request per document. Asking twice does not make the supplier
      // answer faster; it just puts two identical tasks in their portal and two
      // identical entries in the trail.
      const existingRequest = chaseState[targetDoc.id];
      if (existingRequest?.requested && !existingRequest.completedAt) {
        notify(`${targetDoc.title} has already been requested from the supplier.`, 'critical');
        return false;
      }
      const finding = selectedFinding?.docId === targetDoc.id ? selectedFinding : null;
      requestReason = notes || finding?.detail || targetDoc.rejection?.reason || `A corrected ${targetDoc.title} is required before review can continue.`;
      clauseId = finding?.clauseId || finding?.clause?.id || DOC_CLAUSE[targetDoc.code] || 'PROC-3.3';
      const requestedAt = new Date().toISOString();
      const requestMessage = { id: makeRuntimeId('MSG'), from: 'agent', at: requestedAt, body: `${requestReason} Upload a replacement for ${targetDoc.title}.` };
      setChaseState((current) => {
        const previous = current[targetDoc.id] || {};
        return {
          ...current,
          [targetDoc.id]: {
            ...previous, requested: true, requestedAt, completedAt: null,
            reason: requestReason, detail: finding?.recommendation || targetDoc.rejection?.detail || 'Upload a clear, current replacement file.',
            clauseId, dueState: 'Due now', paused: false,
            forced: [...new Set([...(previous.forced || []), 'request'])],
            messages: previous.requested ? (previous.messages || []) : [...(previous.messages || []), requestMessage],
          },
        };
      });
      if (targetDoc.status !== 'Missing') {
        mutateDoc(vendorId, targetDoc.id, (doc) => ({
          ...doc, status: 'Flagged',
          rejection: { reason: requestReason, detail: finding?.recommendation || 'Upload a corrected replacement file.', at: requestedAt },
        }));
      }
    }

    appendAudit({
      vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
      actionType: decisionType === 'REQUEST_DOCS' ? 'DOCUMENT_REQUESTED' : 'DECISION',
      documentName: targetDoc?.title || 'Full compliance application',
      fieldLabel: decisionType === 'REQUEST_DOCS' ? 'Supplier correction task' : 'Vendor decision',
      originalValue: `AI risk score ${view.riskScore}/100`, humanValue: labels[decisionType] || decisionType,
      reason: requestReason || labels[decisionType] || decisionType,
      clauseRef: clauseId,
      notes: notes || (decisionType === 'REQUEST_DOCS'
        ? 'One open supplier task and one Chaser thread were created or refreshed; duplicate work was not created.'
        : `Executive decision recorded: ${labels[decisionType]}.`),
    });

    if (decisionType === 'ESCALATE') {
      raiseRequest({
        type: 'ESCALATION', vendorId,
        title: `Reviewer escalated ${vendor.shortName || vendor.name}`,
        reason: notes || 'Escalated for supervisor review.', riskScore: view.riskScore,
        detail: {
          openFindings: `${view.openFindings ?? 0} finding(s) still open`,
          evidence: `${view.documents.filter((doc) => doc.status === 'Verified').length}/${view.documents.length} documents verified`,
          raisedFrom: 'AI review workspace',
        },
      });
    }

    const message = decisionType === 'APPROVE'
      ? 'Vendor approved.'
      : decisionType === 'REQUEST_DOCS'
        ? 'Document request sent to the supplier.'
        : `${labels[decisionType]} for ${vendor.shortName || vendor.name}.`;
    notify(message, 'critical');
    return true;
  }, [rawVendors, appendAudit, mutateDoc, notify, raiseRequest, supervisorRequests, chaseState]);
  // Pulls one realistic request out of REQUEST_TEMPLATES and drops it into the
  // queue. This exists so the queue can be seen under load: a design that reads
  // well with four cards and collapses at fifteen is not finished, and you
  // cannot find that out from a fixed fixture.
  //
  // Ages are back-dated at random, so generated work arrives already partway
  // through its SLA and some of it is already breached  -  which is what a real
  // morning looks like, and what the ordering has to cope with.
  const simulateInboundRequest = useCallback(() => {
    const ahead = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    };
    const pick = (list) => list[Math.floor(Math.random() * list.length)];

    // Only offer templates that have somewhere plausible to land  -  a
    // monitoring alert needs an approved vendor to be about.
    const approved = rawVendors.filter((v) => ['Approved', 'Active'].includes(v.finalStatus));
    const openVendors = rawVendors.filter((v) => !v.finalStatus);
    const usable = REQUEST_TEMPLATES.filter((t) => {
      if (t.platform) return true;
      if (t.requiresApproved) return approved.length > 0;
      return openVendors.length > 0;
    });
    if (!usable.length) return null;

    const template = pick(usable);
    const vendorRaw = template.platform
      ? null
      : deriveVendorView(pick(template.requiresApproved ? approved : openVendors));

    const meta = REQUEST_TYPES[template.type];
    const ageHours = Math.floor(Math.random() * Math.round((meta?.slaHours ?? 24) * 1.6));
    const raisedAt = new Date(Date.now() - ageHours * 3600000).toISOString();

    const request = {
      id: `REQ-${Math.floor(4500 + Math.random() * 4000)}`,
      type: template.type,
      vendorId: vendorRaw?.id || null,
      vendorName: vendorRaw?.name || 'Platform',
      vendorShortName: vendorRaw?.shortName || vendorRaw?.name || 'Platform',
      title: template.title(vendorRaw || {}),
      reason: template.reason(vendorRaw || {}),
      raisedBy: template.platform || !template.requiresApproved ? CURRENT_USERS.admin.name : 'Continuous monitoring',
      raisedById: CURRENT_USERS.admin.id,
      raisedAt,
      slaHours: meta?.slaHours ?? 24,
      riskScore: vendorRaw?.riskScore ?? null,
      detail: template.detail(vendorRaw || {}, ahead),
      status: 'open', outcome: null, supervisorNote: '', resolvedAt: null, expiresAt: null,
    };

    setSupervisorRequests((current) => [request, ...current]);
    notify(`${meta?.label || 'Request'} arrived  /  ${request.vendorShortName}.`);
    return request;
  }, [rawVendors, notify]);

  // The supervisor half of the round-trip, for every request type. What each
  // outcome means is declared once in REQUEST_OUTCOMES; this function is only
  // responsible for applying it to the vendor and writing the audit entry.
  //
  // The one rule worth stating explicitly: RETURN never closes anything. It
  // moves ownership back to the person who raised it and attaches the
  // supervisor's instruction to the vendor, so it surfaces at the top of their
  // review workspace rather than only in a notification they may never open.
  const resolveRequest = useCallback((requestId, outcome, note, options = {}) => {
    const item = supervisorRequests.find((r) => r.id === requestId);
    if (!item || item.status !== 'open') return false;
    const vendor = item.vendorId ? rawVendors.find((candidate) => candidate.id === item.vendorId) : null;
    if (outcome === 'UPHOLD' && vendor) {
      const approvalBlockers = getApprovalBlockers(vendor);
      if (approvalBlockers.length) {
        appendAudit({
          vendorId: vendor.id, vendorName: vendor.name,
          actorName: CURRENT_USERS.supervisor.name, actorId: CURRENT_USERS.supervisor.id,
          actionType: 'APPROVAL_GATE_BLOCKED', documentName: REQUEST_TYPES[item.type]?.label || 'Supervisor request',
          fieldLabel: `${item.id} / Vendor approval`, originalValue: `Requested by ${item.raisedBy}`,
          humanValue: 'Approval refused by evidence gate', reason: approvalBlockers.join(' '), clauseRef: 'PROC-5.1',
          notes: 'Supervisor authority can approve risk, but cannot waive missing or unresolved mandatory evidence.',
        });
        notify(`Approval blocked - ${approvalBlockers.join(' ')}`, 'critical');
        return false;
      }
    }
    const resolvedAt = new Date().toISOString();
    const meta = REQUEST_OUTCOMES[outcome] || {};
    const expiresAt = meta.needsExpiry ? (options.expiresAt || item.detail?.proposedExpiry || null) : null;

    setSupervisorRequests((current) => current.map((r) => (r.id === requestId
      ? { ...r, status: 'resolved', outcome, supervisorNote: note || '', resolvedAt, expiresAt }
      : r)));

    // How each outcome moves the vendor. `undefined` means "leave the vendor's
    // status alone"  -  refusing an exception or accepting a monitoring alert
    // changes the record, not the vendor's standing.
    const statusFor = {
      UPHOLD: 'Approved',
      GRANT: undefined,
      APPROVE: undefined,
      REJECT: 'Rejected',
      REFUSE: undefined,
      ACCEPT: undefined,
      SUSPEND: 'Suspended',
      REASSESS: null,
      RETURN: null,
    }[outcome];

    if (item.vendorId) {
      setRawVendors((current) => current.map((v) => {
        if (v.id !== item.vendorId) return v;
        const next = { ...v };
        if (statusFor !== undefined) next.finalStatus = statusFor;
        next.supervisorNote = outcome === 'RETURN'
          ? { by: CURRENT_USERS.supervisor.name, at: resolvedAt, note: note || 'Returned for further work.', requestId }
          : null;
        // A granted exception is carried on the vendor, not just in the request
        // log, because every screen that judges this vendor needs to know the
        // approval rests on an exception that expires.
        if (outcome === 'GRANT') {
          next.riskAcceptance = {
            id: requestId, by: CURRENT_USERS.supervisor.name, at: resolvedAt, expiresAt,
            control: item.detail?.control || '', compensating: item.detail?.compensating || '', note: note || '',
          };
        }
        return next;
      }));
    }

    // -----------------------------------------------------------------------
    // A granted exception clears ONE finding — never the vendor.
    //
    // This is the whole point of the type. `statusFor.GRANT` is deliberately
    // `undefined` above, so the vendor's standing is untouched: the reviewer
    // still has to work the rest of the pack and still has to record their own
    // approval. What the supervisor has done is accept one specific control
    // gap, and that is written as a resolution against that finding's id so
    // `evaluateVendor` stops treating it as blocking.
    //
    // The resolution carries the expiry with it. `evaluateVendor` ignores a
    // resolution whose date has passed, so the finding reopens by itself when
    // the waiver lapses — nobody has to remember to come back and close it.
    if (outcome === 'GRANT' && item.detail?.findingId) {
      setFindingResolutions((current) => ({
        ...current,
        [item.detail.findingId]: {
          outcome: RISK_ACCEPTED,
          label: 'Risk accepted by the supervisor',
          reason: note || item.reason || 'Time-boxed exception granted.',
          by: CURRENT_USERS.supervisor.name,
          at: resolvedAt,
          exceptionId: requestId,
          expiresAt,
          compensating: item.detail?.compensating || '',
        },
      }));
    }

    appendAudit({
      vendorId: item.vendorId || ' - ', vendorName: item.vendorName,
      actorName: CURRENT_USERS.supervisor.name, actorId: CURRENT_USERS.supervisor.id,
      actionType: 'REQUEST_RESOLVED',
      documentName: REQUEST_TYPES[item.type]?.label || 'Supervisor request',
      fieldLabel: `${item.id}  /  ${item.title}`,
      originalValue: `Raised by ${item.raisedBy}`,
      humanValue: meta.audit || outcome,
      reason: note || meta.audit || outcome,
      notes: outcome === 'RETURN'
        ? 'Ownership returns to the person who raised it.'
        : expiresAt
          ? `Time-boxed exception. Lapses ${new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, after which the finding reopens.`
          : "Closed on the supervisor's authority.",
    });
    notify(`${meta.audit || outcome}  /  ${item.vendorShortName}.`);
    return true;
  }, [supervisorRequests, rawVendors, appendAudit, notify]);

  // Answering several requests at once.
  //
  // Deliberately NOT a generic "apply to all". Two rules hold:
  //
  //  1. Only outcomes valid for every selected type are offered  -  that is
  //     computed in the UI from REQUEST_TYPES, so you can never bulk-suspend a
  //     policy change or bulk-hand-back a monitoring alert.
  //  2. A risk acceptance cannot be granted in bulk at all, because each one
  //     needs its own expiry date and its own compensating control. Letting
  //     someone waive five controls with one date would defeat the point of
  //     the type, so the UI withholds GRANT from bulk and this ignores it.
  //
  // The shared rationale is written to every affected audit entry individually,
  // so the trail still reads as one decision per vendor.
  const resolveManyRequests = useCallback((requestIds, outcome, note) => {
    if (outcome === 'GRANT') return 0;
    const ids = requestIds.filter((id) => {
      const item = supervisorRequests.find((r) => r.id === id);
      return item && item.status === 'open' && (REQUEST_TYPES[item.type]?.outcomes || []).includes(outcome);
    });
    ids.forEach((id) => resolveRequest(id, outcome, note));
    return ids.length;
  }, [supervisorRequests, resolveRequest]);

  // Granted exceptions that have run out of time.
  //
  // A time-boxed exception whose date passes without anyone noticing is the
  // textbook third-party-risk audit failure: the vendor stays approved on the
  // strength of a waiver that expired months ago. Deriving the lapsed set from
  // the dates  -  rather than relying on someone to come back and close it  -
  // means the platform cannot quietly carry an expired acceptance.
  const exceptions = useMemo(() => {
    const now = Date.now();
    return supervisorRequests
      .filter((r) => r.outcome === 'GRANT' && r.expiresAt)
      .map((r) => {
        const remainingMs = new Date(r.expiresAt).getTime() - now;
        const days = Math.ceil(remainingMs / 86400000);
        return {
          ...r,
          daysLeft: days,
          lapsed: remainingMs <= 0,
          // 14 days is the point at which a re-audit or renewal has to already
          // be in motion to land in time, so that is where warning starts.
          lapsingSoon: remainingMs > 0 && days <= 14,
        };
      });
  }, [supervisorRequests]);

  // -------------------------------------------------------------------------
  // Who currently owns a case.
  //
  // Ownership is DERIVED from the open supervisor requests rather than stored
  // on the vendor, for the same reason progress and risk are derived: a stored
  // owner drifts. It also means a seeded request and a request raised in the
  // session produce identical behaviour, which a stored flag set only by
  // `raiseRequest` would not.
  //
  // The distinction that matters is which requests take the DECISION away:
  //
  //   AUTHORITY / ESCALATION   hand the decision up. The reviewer has nothing
  //                            left to decide, so the case reads as the
  //                            supervisor's everywhere — queue, directory and
  //                            workspace alike.
  //
  //   RISK_ACCEPTANCE /        ask about one finding, or about an approved
  //   REASSESSMENT             vendor's standing. The reviewer keeps the case
  //                            and should carry on with the rest of the pack.
  // -------------------------------------------------------------------------
  const caseOwnership = useMemo(() => {
    const map = {};
    for (const request of supervisorRequests) {
      if (request.status !== 'open' || !request.vendorId) continue;
      const decisionAway = ['AUTHORITY', 'ESCALATION'].includes(request.type);
      const existing = map[request.vendorId];
      // A decision-away request outranks an advisory one when both are open.
      if (existing && (existing.decisionAway || !decisionAway)) continue;
      map[request.vendorId] = {
        owner: decisionAway ? 'supervisor' : 'reviewer',
        ownerName: decisionAway ? CURRENT_USERS.supervisor.name : CURRENT_USERS.admin.name,
        decisionAway,
        request,
      };
    }
    return map;
  }, [supervisorRequests]);

  const getCaseOwner = useCallback((vendorId) => caseOwnership[vendorId] || {
    owner: 'reviewer', ownerName: CURRENT_USERS.admin.name, decisionAway: false, request: null,
  }, [caseOwnership]);

  // Lets the admin dismiss a returned-work banner once they have read it,
  // without erasing the audit entry that records it happened.
  const acknowledgeSupervisorNote = useCallback((vendorId) => {
    setRawVendors((current) => current.map((v) => (v.id === vendorId ? { ...v, supervisorNote: null } : v)));
  }, []);

  // Acceptance criterion 3, enforced deterministically.
  //
  // This gate is plain boolean logic over document status and recorded human
  // decisions. No model output touches it, no agent can reach it, and no
  // configuration change can soften it  -  which is precisely why it is here and
  // not expressed as an instruction to an agent.
  const activationGate = useCallback((vendorId) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor) return { canActivate: false, blockers: ['Vendor not found.'] };
    const blockers = [];
    const outstanding = vendor.documents.filter((d) => d.status === 'Missing');
    if (outstanding.length) blockers.push(`${outstanding.length} mandatory document(s) not received  -  PROC-3.3.`);
    // Derive verification status from the fields rather than trusting the
    // stored label. A stored status can go stale  -  a document seeded as "Needs
    // Review" whose every field then reads above the auto-clear threshold was
    // blocking activation with no finding anywhere pointing at it, which left
    // the reviewer with a refusal they could not act on.
    const inFlight = vendor.documents.filter((d) => d.status === 'Processing');
    if (inFlight.length) blockers.push(`${inFlight.length} document(s) still being verified  -  PROC-3.3.`);
    const unresolved = vendor.documents.filter((d) => d.status !== 'Missing' && d.status !== 'Processing'
      && recomputeDocStatus(d) !== 'Verified');
    if (unresolved.length) blockers.push(`${unresolved.length} document(s) have open findings  -  PROC-3.3.`);
    if (vendor.finalStatus !== 'Approved') blockers.push('No human approval recorded  -  PROC-5.1.');
    return { canActivate: blockers.length === 0, blockers };
  }, [rawVendors]);

  const activateInErp = useCallback((vendorId) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const gate = activationGate(vendorId);
    if (!vendor || !gate.canActivate) {
      if (vendor) {
        appendAudit({
          vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
          actionType: 'GATE_BLOCKED', documentName: 'ERP activation', fieldLabel: 'Activation gate',
          originalValue: 'Activation attempted', humanValue: 'Refused',
          reason: gate.blockers.join(' '), reasoning: 'Deterministic activation gate  -  not an agent decision.',
          notes: 'PROC-3.3 and PROC-5.1 both hold. Activation refused and the attempt logged.',
        });
        notify(`Activation refused  -  ${gate.blockers[0]}`);
      }
      return;
    }
    const erpId = `SUP-${new Date().getUTCFullYear()}-${vendorId.slice(-4)}`;
    setRawVendors((current) => current.map((v) => (v.id === vendorId ? { ...v, finalStatus: 'Active', erpId } : v)));
    appendAudit({
      vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'DECISION', documentName: 'ERP activation', fieldLabel: 'Supplier master record',
      originalValue: 'Approved, pending activation', humanValue: `Activated as ${erpId}`,
      reason: 'Final human approval present', notes: 'Supplier master record created and synchronized.',
    });
    notify(`Vendor activated as ${erpId}.`);
  }, [rawVendors, activationGate, appendAudit, notify]);

  // Returns the created record so the caller can immediately render the
  // shareable invite link for it.
  const addVendor = useCallback(({ name, country, category, email }) => {
    if (!name) return null;
    const id = `VEN-${Math.floor(1000 + Math.random() * 8999)}`;
    const vendor = buildVendorRecord({ id, name, country, category, email });
    setRawVendors((current) => [vendor, ...current]);
    appendAudit({
      vendorId: id, vendorName: name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'VENDOR_INVITED', documentName: 'Vendor invitation', fieldLabel: 'New vendor',
      originalValue: null, humanValue: name, reason: 'Vendor invited to onboard', notes: `Invitation sent to ${email || 'vendor contact'}.`,
    });
    notify(`Invitation sent to ${name}.`);
    return vendor;
  }, [appendAudit, notify]);

  // Materialises the vendor an invite link refers to. On the customer's own
  // device the record already exists and is returned untouched; on the vendor's
  // device (which has never run this app) it is created from the link payload
  // so the two sides describe the same vendor, with the same id, either way.
  const ensureVendorFromInvite = useCallback((invite) => {
    if (!invite?.v) return null;
    const existing = rawVendors.find((v) => v.id === invite.v);
    if (existing) return existing;
    const vendor = buildVendorRecord({
      id: invite.v, name: invite.n || 'Your company', country: invite.c, category: invite.k, email: invite.e, checklistId: invite.p,
    });
    setRawVendors((current) => [vendor, ...current]);
    appendAudit({
      vendorId: vendor.id, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'VENDOR_INVITED', documentName: 'Vendor invitation', fieldLabel: 'Invitation opened',
      originalValue: null, humanValue: vendor.name,
      reason: 'Vendor opened their onboarding link', notes: 'Secure onboarding link opened by the supplier.',
    });
    return vendor;
  }, [rawVendors, appendAudit]);

  // --- vendor-side onboarding wizard -------------------------------------

  const setOnboardingStep = useCallback((vendorId, step) => {
    setRawVendors((current) => current.map((v) => (v.id === vendorId
      ? { ...v, onboardingStep: Math.max(0, Math.min(STEP_SUBMITTED, step)) }
      : v)));
  }, []);

  // Step 0  -  which path the supplier picked (AI-assisted vs manual entry).
  // Stored on the vendor record so it survives a refresh and so the company
  // details step (step 2) knows whether to pre-fill from "extracted" data.
  const setOnboardingMethod = useCallback((vendorId, method) => {
    setRawVendors((current) => current.map((v) => (v.id === vendorId
      ? { ...v, onboardingMethod: method }
      : v)));
  }, []);

  // The company profile the vendor fills in at step 1. Saving it rewrites the
  // vendor's identity fields, so the customer's directory, pipeline cards, and
  // risk rows immediately show the real company details instead of the
  // placeholders captured at invitation time.
  const saveVendorProfile = useCallback((vendorId, profile) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor || !profile?.legalName) return;
    setRawVendors((current) => current.map((v) => {
      if (v.id !== vendorId) return v;
      const category = profile.category || v.category;
      const nextChecklist = checklistForCategory(category);
      const canRegenerateChecklist = (v.onboardingStep ?? 0) < STEP_SUBMITTED
        && v.documents.every((doc) => doc.status === 'Missing');
      const checklistChanged = canRegenerateChecklist && nextChecklist.id !== v.checklistId;
      const documents = checklistChanged
        ? nextChecklist.documents.map(([slug, code, title, docTemplate]) => ({
          id: `${v.id}-${slug}`, code, title, fileName: '', pageCount: 0, docTemplate,
          language: null, status: 'Missing', fields: [],
        }))
        : v.documents;
      return {
        ...v,
        profile,
        name: profile.legalName,
        shortName: profile.tradingName || profile.legalName,
        initials: initialsFor(profile.tradingName || profile.legalName),
        country: profile.country || v.country,
        category,
        contact: profile.contactName || v.contact,
        email: profile.contactEmail || v.email,
        checklistId: checklistChanged ? nextChecklist.id : v.checklistId,
        checklistLabel: checklistChanged ? nextChecklist.label : v.checklistLabel,
        documents,
        onboardingStep: Math.max(v.onboardingStep ?? 0, 2),
        aiSummary: `Company profile submitted by ${profile.contactName || 'the supplier'}. Awaiting the category-specific evidence pack before verification can run.`,
      };
    }));    appendAudit({
      vendorId, vendorName: profile.legalName, actorName: profile.contactName || CURRENT_USERS.vendor.name, actorId: vendorId,
      actionType: 'PROFILE_SUBMITTED', documentName: 'Company profile', fieldLabel: 'Registered company details',
      originalValue: vendor.profile ? vendor.name : 'Not yet provided',
      humanValue: `${profile.legalName}  /  ${profile.country || 'Country not stated'}`,
      reason: 'Supplier completed onboarding step 1',
      notes: `Tax ID ${profile.taxId || 'not supplied'}  /  Registration ${profile.registrationNumber || 'not supplied'}.`,
    });
    notify('Company profile saved. Next: upload your documents.');
  }, [rawVendors, appendAudit, notify]);

  // Step 4  -  the vendor hands the pack over. Review begins only now.
  const submitApplication = useCallback((vendorId) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor) return;
    const supplied = vendor.documents.filter((d) => d.status !== 'Missing');
    if (supplied.length !== vendor.documents.length) return;

    setRawVendors((current) => current.map((v) => (v.id === vendorId
      ? {
        ...v,
        onboardingStep: STEP_SUBMITTED,
        submittedAt: new Date().toISOString(),
        aiSummary: 'Application submitted. AI verification is running across the evidence pack before compliance review continues.',
      }
      : v)));
    appendAudit({
      vendorId, vendorName: vendor.name, actorName: vendor.profile?.contactName || CURRENT_USERS.vendor.name, actorId: vendorId,
      actionType: 'APPLICATION_SUBMITTED', documentName: 'Full onboarding application', fieldLabel: 'Application submitted',
      originalValue: 'Draft with the supplier', humanValue: 'Submitted for compliance review',
      reason: 'Supplier completed every onboarding step',
      notes: `${supplied.length} of ${vendor.documents.length} documents supplied.`,
    });
    supplied.forEach((doc) => runDocumentReview(vendorId, doc.id, doc.pendingVerdict, { quiet: true, notifyOnPass: false }));
    notify('Application submitted. AI and compliance review have started.');
  }, [rawVendors, appendAudit, notify, runDocumentReview]);

  // Puts a vendor back at the very beginning of the wizard  -  profile cleared,
  // every document returned to Missing. This is what makes the earliest part of
  // the journey reachable at any time: you can walk the invite  ->  welcome  ->
  // profile  ->  upload  ->  submit path for any vendor without inventing a new one,
  // and the customer side follows the record straight back to "Invited".
  const restartOnboarding = useCallback((vendorId) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor) return;
    setRawVendors((current) => current.map((v) => (v.id === vendorId
      ? {
        ...v,
        onboardingStep: 0,
        // The method must go too. Leaving it set meant a "restarted" supplier
        // still carried their old AI/manual choice, so the welcome step's two
        // cards were decorative  -  the answer was already recorded.
        onboardingMethod: null,
        profile: null,
        finalStatus: null,
        submittedAt: undefined,
        erpId: undefined,
        aiSummary: 'Onboarding restarted. Awaiting the supplier to resubmit their company profile and mandatory documents.',
        documents: v.documents.map((d) => ({
          ...d,
          fileName: '',
          pageCount: 0,
          language: null,
          status: 'Missing',
          fields: [],
          rejection: null,
          pendingVerdict: null,
        })),
      }
      : v)));
    appendAudit({
      vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'VENDOR_INVITED', documentName: 'Vendor invitation', fieldLabel: 'Onboarding restarted',
      originalValue: vendor.name, humanValue: 'Returned to step 1',
      reason: 'Onboarding restarted from the beginning',
      notes: 'Company profile and evidence pack cleared; the supplier begins again at the welcome step.',
    });
    notify(`${vendor.shortName || vendor.name} is back at step 1 of onboarding.`);
  }, [rawVendors, appendAudit, notify]);

  const addRequest = useCallback(({ title, vendorId, amount, due }) => {
    if (!title) return;
    const vendor = rawVendors.find((v) => v.id === vendorId) || rawVendors[0];
    const request = {
      id: `PR-${Math.floor(24020 + Math.random() * 900)}`, title, vendorId: vendor.id, vendor: vendor.shortName || vendor.name,
      amount: amount || 'TBD', due: due || 'TBD', status: 'Draft', tone: 'neutral',
    };
    setRequests((current) => [request, ...current]);
    notify(`${request.id} created as a draft.`);
  }, [rawVendors, notify]);

  const respondToRequest = useCallback((requestId, updates) => {
    setRequests((current) => current.map((r) => (r.id === requestId ? { ...r, ...updates } : r)));
  }, []);

  const resetDemo = useCallback(() => {
    timeoutHandlesRef.current.forEach((handle) => window.clearTimeout(handle));
    timeoutHandlesRef.current.clear();
    reviewTokensRef.current = {};
    chaseLocksRef.current.clear();
    pendingFingerprintsRef.current.clear();
    setRawVendors(seedVendors());
    setActiveVendorId(DEMO_VENDOR_ID);
    setRequests(clone(INITIAL_REQUESTS));
    setAuditLogs(clone(INITIAL_AUDIT_LOGS));
    setAgentConfig(DEFAULT_AGENT_CONFIG());
    setConfigHistory([]);
    setAgentApprovals([]);
    setFindingResolutions({});
    setChaseState({});
    setSupervisorRequests(clone(INITIAL_REQUESTS_TO_SUPERVISOR));
    clearPersisted();
    notify('Demo data restored.', 'critical');
  }, [notify]);

  const value = useMemo(() => ({
    vendors, requests, auditLogs, toast, settings, updateSettings, activeVendorId, setActiveVendorId,
    getVendor, acceptField, correctField, uploadDocument, deleteDocument, uploadNextActionable,
    submitDecision, activateInErp, activationGate, addVendor, addRequest, respondToRequest, resetDemo, notify,
    ensureVendorFromInvite, setOnboardingStep, setOnboardingMethod, saveVendorProfile, submitApplication, restartOnboarding,
    // agent platform
    agentConfig, configHistory, pendingApprovals, approvalHistory, actorRole, setActorRole,
    getAssessment, getThreads, getTriage,
    dispatchAgentAction, resolveApproval, updateAgentConfig, revertAgentConfig,
    chaseNow, ingestChaserReply, setChasePaused,
    resolveFinding, reopenFinding, runAgentPass, findingResolutions,
    // supervisor oversight
    supervisorRequests, exceptions, raiseRequest, resolveRequest, resolveManyRequests,
    simulateInboundRequest, acknowledgeSupervisorNote, getCaseOwner,
  }), [vendors, requests, auditLogs, toast, settings, updateSettings, activeVendorId, getVendor, acceptField, correctField, uploadDocument, deleteDocument,
    uploadNextActionable, submitDecision, activateInErp, activationGate, addVendor, addRequest, respondToRequest, resetDemo, notify,
    ensureVendorFromInvite, setOnboardingStep, setOnboardingMethod, saveVendorProfile, submitApplication, restartOnboarding,
    agentConfig, configHistory, pendingApprovals, approvalHistory, actorRole,
    getAssessment, getThreads, getTriage,
    dispatchAgentAction, resolveApproval, updateAgentConfig, revertAgentConfig, chaseNow, ingestChaserReply,
    setChasePaused, resolveFinding, reopenFinding, runAgentPass, findingResolutions,
    supervisorRequests, exceptions, raiseRequest, resolveRequest, resolveManyRequests,
    simulateInboundRequest, acknowledgeSupervisorNote, getCaseOwner]);

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>;
}

export const useNexus = () => useContext(NexusContext);
