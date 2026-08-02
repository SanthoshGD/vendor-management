'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  INITIAL_VENDORS, INITIAL_REQUESTS, INITIAL_AUDIT_LOGS, CURRENT_USERS,
  INITIAL_REQUESTS_TO_SUPERVISOR, REQUEST_TYPES, REQUEST_OUTCOMES, REQUEST_TEMPLATES,
} from '../data/mockData';
import { DEFAULT_AGENT_CONFIG, AGENTS_BY_ID } from '../services/agentCatalog';
import { evaluateVendor, buildChaserThreads, canPerform, triageVendor } from '../services/agentEngine';
import { DOC_CLAUSE } from '../services/policyPack';
import { DEFAULT_SETTINGS, APPROVAL_CEILING, FINDING_OUTCOMES } from '../constants/outcomes';
import { DEMO_VENDOR_ID, ONBOARDING_STEPS, STEP_SUBMITTED } from '../constants/onboarding';

export { STEP_SUBMITTED, APPROVAL_CEILING, DEFAULT_SETTINGS };
import { encodeInvite, inviteUrl, readInviteFromUrl } from '../lib/base64';
import type { Vendor, VendorProfile } from '../types/vendor';
import type { AuditLogEntry } from '../types/audit';
import type { SupervisorRequest, ProcurementRequest, RequestOutcomeKey, RequestTypeKey, RiskException } from '../types/request';
import type { AgentConfig, AgentProposal, TriageAssessment } from '../types/agent';

const NexusContext = createContext<any>(null);

const STORAGE_KEY = 'stylesphere-nexus-state-v7';
const LEGACY_STORAGE_KEYS: string[] = [];
const OBSOLETE_STORAGE_KEYS = ['stylesphere-nexus-state-v5', 'stylesphere-nexus-state-v6'];

const RISK_ACCEPTED = 'risk_accepted';
let runtimeIdSequence = 0;

const makeRuntimeId = (prefix: string) => {
  runtimeIdSequence = (runtimeIdSequence + 1) % 100000;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${runtimeIdSequence.toString(36).toUpperCase()}`;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const presetDocument = (slug: string, code: string, title: string, docTemplate = 'certificate'): [string, string, string, string] => (
  [slug, code, title, docTemplate]
);

export const DOCUMENT_PRESETS: Record<string, { id: string; label: string; documents: [string, string, string, string][] }> = {
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

const normalizeCategory = (category: string) => String(category || '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function checklistForCategory(category?: string, presetId?: string) {
  if (presetId && DOCUMENT_PRESETS[presetId]) return DOCUMENT_PRESETS[presetId];
  const normalized = normalizeCategory(category || '');
  if (/\b(packaging|package|dust bag|carton|paperboard)\b/.test(normalized)) return DOCUMENT_PRESETS.packaging;
  if (/\b(leather|textile|fabric|apparel|hide|skin|garment|lining|trim|handbag)\b/.test(normalized)) {
    return DOCUMENT_PRESETS['leather-textiles'];
  }
  if (/\b(hardware|component|metal|fitting|clasp|fastener)\b/.test(normalized)) {
    return DOCUMENT_PRESETS['hardware-components'];
  }
  return DOCUMENT_PRESETS.generic;
}

export const REQUIRED_DOCUMENTS = DOCUMENT_PRESETS['leather-textiles'].documents;

const initialsFor = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'NV';

export function buildVendorRecord({ id, name, country, category, email, checklistId }: { id: string; name: string; country?: string; category?: string; email?: string; checklistId?: string }): Vendor {
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
    onboardingMethod: undefined,
    profile: undefined,
    checklistId: checklist.id,
    aiSummary: 'Invitation sent. Awaiting the supplier to submit their company profile and mandatory documents.',
    documents: checklist.documents.map(([slug, code, title, docTemplate]) => ({
      id: `${id}-${slug}`, code, title, fileName: '', pageCount: 0, docTemplate,
      language: null, status: 'Missing', fields: [],
    })),
  } as any;
}

export const SEEDED_INVITE_ID = 'VEN-5527';

const buildSeededInvite = (): Vendor => ({
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
  aiSummary: 'Invitation issued. The supplier has not opened their onboarding link yet - nothing to verify.',
} as any);

const seedVendors = (): Vendor[] => [buildSeededInvite(), ...(clone(INITIAL_VENDORS) as Vendor[])];

const loadPersisted = () => {
  if (typeof window === 'undefined') return null;
  try {
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
        || (parsed.pendingApprovals || []).map((item: any) => ({ ...item, status: 'pending', decision: null })),
    };
  } catch {
    return null;
  }
};

const savePersisted = (payload: any) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { }
};

const clearPersisted = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    [...LEGACY_STORAGE_KEYS, ...OBSOLETE_STORAGE_KEYS].forEach((key) => window.localStorage.removeItem(key));
  } catch { }
};

const MARKER = /SSX-CHECK:\s*(PASS|FAIL)([^\n\r]*)/i;

export function inspectUpload(file: File | null): Promise<{ pass: boolean; reason?: string; detail?: string; mismatch?: boolean; confidence?: number; unmarked?: boolean }> {
  return new Promise((resolve) => {
    if (!file) { resolve({ pass: true }); return; }

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
      resolve({
        pass: false,
        reason: `File size exceeds 10 MB limit (${fileSizeMb} MB)`,
        detail: 'The uploaded file exceeds the 10 MB maximum size limit. Please upload a file smaller than 10 MB.',
        confidence: 0,
      });
      return;
    }

    const fileName = (file.name || '').toLowerCase();
    const ext = fileName.split('.').pop() || '';
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];

    if (!ext || !allowedExtensions.includes(ext)) {
      resolve({
        pass: false,
        reason: `Unsupported file format (.${ext.toUpperCase() || 'UNKNOWN'})`,
        detail: 'Only PDF, PNG, JPG, and DOC/DOCX files are supported.',
        confidence: 0,
      });
      return;
    }

    const isErrorFileName = /fail|wrong|invalid|error|bad|corrupt|fake|reject/i.test(fileName);
    if (isErrorFileName) {
      resolve({
        pass: false,
        reason: 'Document validation failed',
        detail: 'The uploaded file is invalid or corrupted. Please upload a valid document.',
        confidence: 30,
      });
      return;
    }

    if (typeof FileReader === 'undefined') { resolve({ pass: true }); return; }
    const reader = new FileReader();
    reader.onerror = () => resolve({ pass: true });
    reader.onload = () => {
      const text = String(reader.result || '');
      const match = text.match(MARKER);
      if (match) {
        if (match[1].toUpperCase() === 'PASS') { resolve({ pass: true }); return; }
        const payload = match[2].split(')')[0];
        const [, reason, detail] = payload.split('|').map((part) => (part || '').trim());
        resolve({
          pass: false,
          reason: reason || 'The document could not be verified',
          detail: detail || 'Upload a corrected version of this document.',
          mismatch: /match|mismatch|name/i.test(reason || ''),
          confidence: 41,
        });
        return;
      }

      if (/\b(FAIL|INVALID|CORRUPT|REJECTED)\b/i.test(text)) {
        resolve({
          pass: false,
          reason: 'Document text check failed',
          detail: 'Uploaded file contents failed compliance check.',
          confidence: 35,
        });
        return;
      }

      resolve({ pass: true, unmarked: true });
    };
    reader.readAsText(file.slice ? file.slice(0, 400000) : file);
  });
}

const fieldNeedsAttention = (f: any) => !f.resolved && (f.confidence < 90 || f.crossDocMismatch);

function recomputeDocStatus(doc: any) {
  if (doc.status === 'Missing' || doc.status === 'Uploaded' || doc.status === 'Processing') return doc.status;
  if (!doc.fields.length) return doc.status;
  if (doc.fields.some((f: any) => !f.resolved && (f.confidence < 60 || f.crossDocMismatch))) return 'Flagged';
  if (doc.fields.some((f: any) => !f.resolved && f.confidence < 90)) return 'Needs Review';
  return 'Verified';
}

function getApprovalBlockers(vendor: Vendor) {
  const documents = vendor.documents || [];
  const blockers: string[] = [];
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

function deriveVendorView(vendor: Vendor): Vendor {
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

  let stage: string;
  let status: string;
  if (vendor.finalStatus === 'Active') { stage = 'Active'; status = 'Approved'; }
  else if (vendor.finalStatus === 'Approved') { stage = 'Approved'; status = 'Approved'; }
  else if (vendor.finalStatus === 'Rejected') { stage = 'Rejected'; status = 'Rejected'; }
  else if ((vendor as any).finalStatus === 'Escalated') { stage = 'With supervisor'; status = 'Blocked'; }
  else if (!submitted && missing.length > 0 && missing.length === documents.length && !vendor.profile) { stage = 'Invited'; status = 'Invited'; }
  else if (!submitted) { stage = 'Awaiting submission'; status = missing.length > 0 ? 'Vendor action' : 'Draft ready'; }
  else if (correctionsRequested.length > 0 || missing.length > 0) { stage = 'Vendor action'; status = 'Blocked'; }
  else if (processing > 0) { stage = 'AI verification'; status = 'Processing'; }
  else if (openFindings > 0) { stage = 'Compliance review'; status = 'Needs review'; }
  else { stage = 'Ready to approve'; status = 'Ready'; }

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
    onboardingStep: vendor.onboardingStep ?? STEP_SUBMITTED,
    onboardingMethod: vendor.onboardingMethod ?? null,
    hasSubmittedApplication: submitted,
  } as any;
}

const firstActionableDocument = (vendor: Vendor) => {
  const missing = vendor.documents.find((d) => d.status === 'Missing');
  if (missing) return missing;
  const flagged = vendor.documents.find((d) => d.status === 'Flagged' || d.status === 'Needs Review');
  return flagged || vendor.documents[0];
};

const proposalFingerprintFor = ({ vendor, agentId, actionId, configVersion, summary, resolutions }: any) => JSON.stringify({
  vendorId: vendor?.id || 'platform',
  agentId,
  actionId,
  configVersion,
  summary: summary || '',
  documents: (vendor?.documents || []).map((doc: any) => ({
    id: doc.id,
    status: doc.status,
    fileName: doc.fileName,
    rejection: doc.rejection?.reason || null,
    fields: doc.fields.map((field: any) => ({
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

export function NexusProvider({ children }: { children: React.ReactNode }) {
  // Always initialize from static seed data so the server-rendered HTML and
  // the client's first render are identical (React hydration requirement).
  // Persisted localStorage state is applied in a useEffect after mount.
  const timeoutHandlesRef = useRef(new Set<any>());
  const reviewTokensRef = useRef<Record<string, string>>({});
  const chaseLocksRef = useRef(new Set<string>());
  const pendingFingerprintsRef = useRef(new Set<string>());

  const [rawVendors, setRawVendors] = useState<Vendor[]>(seedVendors);
  const [requests, setRequests] = useState<ProcurementRequest[]>(() => clone(INITIAL_REQUESTS) as ProcurementRequest[]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => clone(INITIAL_AUDIT_LOGS) as unknown as AuditLogEntry[]);
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS }));
  const [toast, setToast] = useState('');

  const [agentConfig, setAgentConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);
  const [configHistory, setConfigHistory] = useState<AgentConfig[]>([]);
  const [agentApprovals, setAgentApprovals] = useState<AgentProposal[]>([]);
  const pendingApprovals = useMemo(
    () => agentApprovals.filter((item) => (item.status || 'pending') === 'pending'),
    [agentApprovals],
  );
  const approvalHistory = useMemo(
    () => agentApprovals.filter((item) => item.status && item.status !== 'pending'),
    [agentApprovals],
  );
  useEffect(() => {
    pendingFingerprintsRef.current = new Set(pendingApprovals.map((item: any) => item.fingerprint).filter(Boolean));
  }, [pendingApprovals]);
  const [findingResolutions, setFindingResolutions] = useState<Record<string, any>>({});
  const [chaseState, setChaseState] = useState<Record<string, any>>({});
  const [supervisorRequests, setSupervisorRequests] = useState<SupervisorRequest[]>(
    () => clone(INITIAL_REQUESTS_TO_SUPERVISOR) as unknown as SupervisorRequest[],
  );
  const [actorRole, setActorRole] = useState('Compliance Manager');
  const [activeVendorId, setActiveVendorId] = useState(DEMO_VENDOR_ID);

  // Phase 2: hydrate from localStorage after mount (client-only, never runs on server).
  useEffect(() => {
    const persisted = loadPersisted();
    if (!persisted) return;
    if (persisted.vendors) setRawVendors(persisted.vendors);
    if (persisted.requests) setRequests(persisted.requests);
    if (persisted.auditLogs) setAuditLogs(persisted.auditLogs);
    if (persisted.settings) setSettings({ ...DEFAULT_SETTINGS, ...persisted.settings });
    if (persisted.agentConfig?.agents) setAgentConfig(persisted.agentConfig);
    if (persisted.configHistory) setConfigHistory(persisted.configHistory);
    const savedApprovals = persisted.agentApprovals
      || (persisted.pendingApprovals || []).map((item: any) => ({ ...item, status: 'pending', decision: null }));
    if (savedApprovals.length) setAgentApprovals(savedApprovals);
    if (persisted.findingResolutions) setFindingResolutions(persisted.findingResolutions);
    if (persisted.chaseState) setChaseState(persisted.chaseState);
    if (persisted.supervisorRequests) setSupervisorRequests(persisted.supervisorRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const handle = window.setTimeout(() => {
      timeoutHandlesRef.current.delete(handle);
      callback();
    }, delay);
    timeoutHandlesRef.current.add(handle);
    return handle;
  }, []);

  const notify = useCallback((message: string, priority = 'info') => {
    if (!settings.notifications && priority === 'info') return;
    setToast(message);
    scheduleTimeout(() => setToast((current) => (current === message ? '' : current)), 3200);
  }, [settings.notifications, scheduleTimeout]);

  const vendors = useMemo(() => rawVendors.map(deriveVendorView), [rawVendors]);
  const getVendor = useCallback((id: string) => vendors.find((v) => v.id === id) || vendors[0], [vendors]);

  const appendAudit = useCallback((entry: Partial<AuditLogEntry>) => {
    setAuditLogs((current) => [{
      id: makeRuntimeId('AUD'),
      timestamp: new Date().toISOString(),
      ...entry,
    } as AuditLogEntry, ...current]);
  }, []);

  const updateSettings = useCallback((nextSettings: any) => {
    const next = {
      density: nextSettings?.density === 'compact' ? 'compact' : 'comfortable',
      notifications: nextSettings?.notifications !== false,
    };
    setSettings(next);
    appendAudit({
      vendorId: '-', vendorName: 'StyleSphere workspace',
      actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
      actionType: 'SETTINGS_UPDATED' as any, documentName: 'Workspace preferences', fieldLabel: 'Density and notifications',
      originalValue: `${settings.density}; notifications ${settings.notifications ? 'on' : 'off'}`,
      humanValue: `${next.density}; notifications ${next.notifications ? 'on' : 'off'}`,
      reason: 'Workspace preferences updated',
    });
    notify(`Settings saved - notifications ${next.notifications ? 'on' : 'off'}, ${next.density} density.`, 'critical');
  }, [settings, appendAudit, notify]);

  const agentState = useMemo(() => {
    const now = Date.now();
    const map: Record<string, { assessment: any; threads: any[]; triage: TriageAssessment }> = {};
    for (const vendor of vendors) {
      const assessment = evaluateVendor(vendor, {
        allVendors: vendors, config: agentConfig, now, resolutions: findingResolutions,
      });
      const threads = buildChaserThreads(vendor, { config: agentConfig, chaseState });
      map[vendor.id] = { assessment, threads, triage: triageVendor(vendor, assessment, threads) };
    }
    return map;
  }, [vendors, agentConfig, findingResolutions, chaseState]);

  const getAssessment = useCallback((id: string) => agentState[id]?.assessment
    ?? { findings: [], open: [], blockers: [], cautions: [], gates: {}, stats: {}, brief: [] }, [agentState]);
  const getThreads = useCallback((id: string) => agentState[id]?.threads ?? [], [agentState]);
  const getTriage = useCallback((id: string) => agentState[id]?.triage ?? { band: 'working' }, [agentState]);

  const mutateDoc = useCallback((vendorId: string, docId: string, updater: (doc: any) => any) => {
    setRawVendors((current) => current.map((vendor) => {
      if (vendor.id !== vendorId) return vendor;
      return {
        ...vendor,
        documents: vendor.documents.map((doc) => (doc.id === docId ? updater(doc) : doc)),
      };
    }));
  }, []);

  const dispatchAgentAction = useCallback((agentId: string, actionId: string, options: any = {}) => {
    const { vendorId, summary, reasoning, clauseId, execute, silent, configChange } = options;
    const definition = AGENTS_BY_ID[agentId];
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const verdict = canPerform(agentConfig, agentId, actionId, actorRole);
    const base = {
      vendorId: vendorId || '-',
      vendorName: vendor?.name || 'Platform',
      actorName: definition?.name || agentId,
      actorId: `AGT-${agentId.toUpperCase()}@v${agentConfig.version}`,
      agentId,
      documentName: summary || actionId,
      reasoning: reasoning || verdict.reason,
      clauseRef: clauseId || (verdict as any).clauseId || null,
    };

    if (!verdict.allowed) {
      appendAudit({
        ...base,
        actionType: 'AGENT_BLOCKED',
        fieldLabel: (verdict as any).label || actionId,
        originalValue: 'Agent attempted action',
        humanValue: 'Refused by governance',
        reason: verdict.reason,
      });
      if (!silent) notify(`Blocked: ${verdict.reason}`, 'critical');
      return { ...verdict, executed: false };
    }

    if (verdict.requiresApproval) {
      const fingerprint = proposalFingerprintFor({
        vendor, agentId, actionId, configVersion: agentConfig.version,
        summary, resolutions: findingResolutions,
      });
      const priorProposal = agentApprovals.find((approval: any) => approval.fingerprint === fingerprint);
      if (pendingFingerprintsRef.current.has(fingerprint) || (priorProposal && (priorProposal.status || 'pending') === 'pending')) {
        if (!silent) notify('An unchanged proposal is already awaiting review.');
        return { ...verdict, executed: false, queued: false, duplicate: true, priorStatus: 'pending' };
      }
      pendingFingerprintsRef.current.add(fingerprint);
      const item: any = {
        id: makeRuntimeId('APR'),
        agentId, agentName: definition?.name || agentId, actionId, vendorId,
        vendorName: vendor?.name || 'Platform', label: verdict.label,
        summary: summary || verdict.label, reasoning: reasoning || verdict.reason,
        clauseId: clauseId || (verdict as any).clauseId || null, risk: verdict.risk,
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
    });
    if (!silent) notify(`${definition.name}: ${summary || verdict.label}.`);
    return { ...verdict, executed: true };
  }, [rawVendors, agentConfig, actorRole, findingResolutions, agentApprovals, appendAudit, notify]);

  const resolveApproval = useCallback((approvalId: string, outcome: string, note = '') => {
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
      approval.id === approvalId ? { ...approval, status, decision } as any : approval
    )));
    pendingFingerprintsRef.current.delete((item as any).fingerprint);
    if (accepted && item.agentId === 'config' && (item as any).configChange) {
      const changedAt = new Date().toISOString();
      setConfigHistory((history) => [{ ...agentConfig, retiredAt: changedAt } as any, ...history].slice(0, 20));
      setAgentConfig({
        ...agentConfig,
        version: agentConfig.version + 1,
        updatedAt: changedAt,
        updatedBy: CURRENT_USERS.customer.name,
        note: `Accepted Config Agent proposal: ${(item as any).configChange.description}`,
      });
    }
    const vendor = rawVendors.find((candidate) => candidate.id === item.vendorId);
    appendAudit({
      vendorId: item.vendorId || '-', vendorName: vendor?.name || item.vendorName || 'Platform',
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'AGENT_APPROVAL',
      documentName: item.summary, fieldLabel: (item as any).label,
      originalValue: `${(item as any).agentName || AGENTS_BY_ID[item.agentId]?.name || item.agentId} proposed this`,
      humanValue: accepted ? 'Accepted' : 'Declined',
      reason: decision.note || (accepted ? 'Human accepted the proposal' : 'Human declined the proposal'),
    });
    const message = item.agentId === 'compliance' && accepted
      ? 'Compliance recommendation approved.'
      : item.agentId === 'config' && accepted
        ? 'Config Agent proposal accepted.'
        : `Agent proposal ${accepted ? 'accepted' : 'declined'}.`;
    notify(message, 'critical');
    return true;
  }, [agentApprovals, rawVendors, agentConfig, appendAudit, notify]);

  const updateAgentConfig = useCallback((mutator: (c: AgentConfig) => AgentConfig, note?: string) => {
    const current = agentConfig;
    const next = mutator(clone(current));
    setConfigHistory((history) => [{ ...current, retiredAt: new Date().toISOString() } as any, ...history].slice(0, 20));
    setAgentConfig({
      ...next,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: CURRENT_USERS.customer.name,
    });
    appendAudit({
      vendorId: ' - ', vendorName: 'Agent platform',
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'AGENT_CONFIG', documentName: 'Agent configuration', fieldLabel: 'Skills / Actions / Context',
      originalValue: `v${agentConfig.version}`, humanValue: `v${agentConfig.version + 1}`,
      reason: note || 'Configuration updated',
    });
    notify(note || 'Agent configuration updated.');
  }, [agentConfig, appendAudit, notify]);

  const revertAgentConfig = useCallback((version: number) => {
    const target = configHistory.find((c) => c.version === version);
    if (!target) return;
    const { retiredAt, ...restored } = target as any;
    void retiredAt;
    setConfigHistory((history) => [{ ...agentConfig, retiredAt: new Date().toISOString() } as any, ...history].slice(0, 20));
    setAgentConfig({
      ...restored,
      version: agentConfig.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: CURRENT_USERS.customer.name,
    });
    appendAudit({
      vendorId: ' - ', vendorName: 'Agent platform',
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'AGENT_CONFIG', documentName: 'Agent configuration', fieldLabel: 'Version revert',
      originalValue: `v${agentConfig.version}`, humanValue: `v${agentConfig.version + 1} (contents of v${version})`,
      reason: 'Reverted to an earlier configuration',
    });
    notify(`Reverted to the v${version} configuration.`);
  }, [configHistory, agentConfig, appendAudit, notify]);

  const acceptField = useCallback((vendorId: string, docId: string, fieldKey: string, note?: string) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const doc = vendor?.documents.find((d) => d.id === docId);
    const targetField = doc?.fields.find((f) => f.key === fieldKey);
    if (!targetField) return;

    mutateDoc(vendorId, docId, (current) => {
      const nextFields = current.fields.map((f: any) => (f.key === fieldKey
        ? { ...f, resolved: true, humanVerified: true, confidence: 100 }
        : f));
      return { ...current, fields: nextFields, status: recomputeDocStatus({ ...current, fields: nextFields }) };
    });

    appendAudit({
      vendorId, vendorName: vendor!.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'FIELD_ACCEPT', documentName: doc!.title, fieldLabel: targetField.label,
      originalValue: targetField.value, humanValue: targetField.value,
      reason: 'AI value confirmed correct',
    });
    notify(`"${targetField.label}" accepted and logged to the audit trail.`);
  }, [rawVendors, mutateDoc, appendAudit, notify]);

  const correctField = useCallback((vendorId: string, docId: string, fieldKey: string, newValue: string, reason?: string, notes?: string) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const doc = vendor?.documents.find((d) => d.id === docId);
    const targetField = doc?.fields.find((f) => f.key === fieldKey);
    if (!targetField || !newValue) return;
    const oldValue = targetField.value;

    mutateDoc(vendorId, docId, (current) => {
      const nextFields = current.fields.map((f: any) => (f.key === fieldKey
        ? { ...f, value: newValue, translatedValue: undefined, resolved: true, humanVerified: true, confidence: 100 }
        : f));
      return { ...current, fields: nextFields, status: recomputeDocStatus({ ...current, fields: nextFields }) };
    });

    appendAudit({
      vendorId, vendorName: vendor!.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'FIELD_OVERRIDE', documentName: doc!.title, fieldLabel: targetField.label,
      originalValue: oldValue, humanValue: newValue,
      reason: reason || 'Cross-document verification',
    });
    notify(`"${targetField.label}" corrected and logged to the audit trail.`);
  }, [rawVendors, mutateDoc, appendAudit, notify]);

  const runDocumentReview = useCallback((vendorId: string, docId: string, verdict: any, options: any = {}) => {
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
          actionType: 'DOCUMENT_REJECTED' as any, documentName: doc.title, fieldLabel: 'Automated verification',
          originalValue: reviewedFileName, humanValue: `Correction requested - ${outcome.reason}`,
          reason: outcome.reason,
        });
        if (!quiet) notify(`${doc.title} needs a corrected file - ${outcome.reason}.`, 'critical');
        return;
      }

      mutateDoc(vendorId, docId, (current) => ({
        ...current,
        status: 'Verified',
        rejection: null,
        pendingVerdict: outcome,
        pendingReviewId: null,
        fields: current.fields.length
          ? current.fields.map((field: any) => ({
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
        originalValue: reviewedFileName, humanValue: 'Verified - 97% confidence',
        reason: 'Automated authenticity, expiry, and completeness checks',
      });
      if (!quiet && notifyOnPass) notify(`${doc.title} passed review and is back with compliance.`, 'critical');
    }, 1500);
  }, [rawVendors, mutateDoc, appendAudit, notify, scheduleTimeout]);

  const uploadDocument = useCallback((vendorId: string, docId: string, fileName: string, verdict: any, meta?: { fileType?: string; fileSize?: string }) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const doc = vendor?.documents.find((d) => d.id === docId);
    if (!vendor || !doc) return;
    const submitted = (vendor.onboardingStep ?? STEP_SUBMITTED) >= STEP_SUBMITTED;
    const safeFileName = fileName || `${doc.code.toLowerCase()}_replacement.pdf`;
    const safeVerdict = verdict && typeof verdict.pass === 'boolean' ? verdict : { pass: true };
    const ext = safeFileName.split('.').pop()?.toUpperCase() || 'PDF';

    mutateDoc(vendorId, docId, (current) => ({
      ...current,
      fileName: safeFileName,
      fileType: meta?.fileType || ext,
      fileSize: meta?.fileSize || current.fileSize || '2.4 MB',
      pageCount: current.pageCount || 1,
      status: safeVerdict.pass === false ? 'Flagged' : (submitted ? 'Processing' : 'Uploaded'),
      rejection: safeVerdict.pass === false ? { reason: safeVerdict.reason || 'Verification failed', detail: safeVerdict.detail || 'Upload a valid document.' } : null,
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
    });

    if (!submitted) {
      notify(`${doc.title} added to your application draft.`);
      return;
    }

    notify('Upload received. Review has restarted.');
    runDocumentReview(vendorId, docId, safeVerdict, { notifyOnPass: true, fileName: safeFileName });
  }, [rawVendors, mutateDoc, appendAudit, notify, runDocumentReview]);

  const deleteDocument = useCallback((vendorId: string, docId: string) => {
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
    });
    notify(`${doc.title} removed. You can upload a different file.`);
  }, [rawVendors, mutateDoc, appendAudit, notify]);

  const uploadNextActionable = useCallback((vendorId: string, fileName: string, verdict: any) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor) return;
    const doc = firstActionableDocument(vendor);
    if (doc) uploadDocument(vendorId, doc.id, fileName, verdict);
  }, [rawVendors, uploadDocument]);

  const resolveFinding = useCallback((vendorId: string, finding: any, outcome: string, reason?: string) => {
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
      actionType: 'FINDING_RESOLVED' as any,
      documentName: finding.evidence?.[0]?.source || 'Agent finding',
      fieldLabel: finding.title,
      originalValue: `${AGENTS_BY_ID[finding.agentId]?.name || 'Agent'} raised this as ${finding.tier}`,
      humanValue: label,
      reason: reason || fallback,
    });
    notify(`"${finding.title}"  -  ${label.toLowerCase()}.`);
  }, [rawVendors, appendAudit, notify]);

  const reopenFinding = useCallback((vendorId: string, finding: any) => {
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
        actionType: 'FINDING_REOPENED' as any,
        documentName: 'Agent finding', fieldLabel: finding.title,
        originalValue: 'Resolved', humanValue: 'Reopened',
        reason: 'Reviewer reopened a previously resolved finding',
      });
    }
    notify(`"${finding.title}" reopened.`);
  }, [rawVendors, appendAudit, notify]);

  const runAgentPass = useCallback((vendorId: string) => {
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
    if (view.missingCount! > 0) {
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

  const chaseNow = useCallback((vendorId: string, docId: string, step: any) => {
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

  const setChasePaused = useCallback((vendorId: string, docId: string, paused: boolean) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    const doc = vendor?.documents.find((candidate) => candidate.id === docId);
    if (!doc || Boolean(chaseState[docId]?.paused) === paused) return false;
    setChaseState((current) => ({ ...current, [docId]: { ...current[docId], paused } }));
    appendAudit({
      vendorId, vendorName: vendor?.name || 'Vendor',
      actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: (paused ? 'CHASER_PAUSED' : 'CHASER_RESUMED') as any,
      documentName: doc.title, fieldLabel: 'Supplier follow-up thread',
      originalValue: paused ? 'Active' : 'Paused', humanValue: paused ? 'Paused' : 'Active',
      reason: paused ? 'Human paused supplier contact' : 'Human resumed supplier contact',
    });
    notify(paused ? `Chasing paused for ${doc.title}.` : `Chasing resumed for ${doc.title}.`, 'critical');
    return true;
  }, [rawVendors, chaseState, appendAudit, notify]);

  const ingestChaserReply = useCallback((vendorId: string, docId: string, fileName?: string, verdict?: any) => {
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

  const raiseRequest = useCallback(({ type, vendorId, title, reason, riskScore, detail, raisedBy }: any) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const meta = (REQUEST_TYPES as any)[type] || REQUEST_TYPES.RISK_ACCEPTANCE;
    const request: SupervisorRequest = {
      id: `REQ-${Math.floor(4500 + Math.random() * 400)}`,
      type,
      vendorId: vendorId || null,
      vendorName: vendor?.name || 'Platform',
      vendorShortName: vendor?.shortName || vendor?.name || 'Platform',
      title,
      reason,
      raisedBy: raisedBy || CURRENT_USERS.admin.name,
      raisedAt: new Date().toISOString(),
      slaHours: meta?.tone ? 24 : 24,
      status: 'open', outcome: undefined, supervisorNote: '', resolvedAt: undefined,
      detail: detail || {},
    };
    setSupervisorRequests((current) => [
      request,
      ...current.filter((r) => !(r.vendorId === vendorId && r.type === type && r.status === 'open')),
    ]);
    notify(`${meta?.label || 'Request'} sent to ${CURRENT_USERS.supervisor.name}.`);
    return request;
  }, [rawVendors, notify]);

  const submitDecision = useCallback((vendorId: string, decisionType: string, notes = '', context: any = {}) => {
    const vendor = rawVendors.find((candidate) => candidate.id === vendorId);
    if (!vendor) return false;
    const view = deriveVendorView(vendor);
    const labels: Record<string, string> = {
      APPROVE: 'Vendor approved', REJECT: 'Vendor rejected',
      REQUEST_DOCS: 'Document request sent', ESCALATE: 'Escalated to supervisor',
    };
    const finalStatus: any = { APPROVE: 'Approved', REJECT: 'Rejected', ESCALATE: 'Escalated', REQUEST_DOCS: null }[decisionType];

    if (['Approved', 'Active'].includes(vendor.finalStatus as any) && ['APPROVE', 'ESCALATE'].includes(decisionType)) {
      notify(`${vendor.shortName || vendor.name} is already ${vendor.finalStatus?.toLowerCase()}.`, 'critical');
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
      if ((view as any).riskScore > APPROVAL_CEILING) {
        appendAudit({
          vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
          actionType: 'AUTHORITY_LIMIT_BLOCKED' as any, documentName: 'Full compliance application', fieldLabel: 'Vendor approval',
          originalValue: `Residual risk ${(view as any).riskScore}/100`,
          humanValue: `Refused - above the ${APPROVAL_CEILING} delegated limit`,
          reason: `${CURRENT_USERS.admin.role} may approve up to residual risk ${APPROVAL_CEILING}. This vendor scores ${(view as any).riskScore}.`,
        });
        notify(`Residual risk ${(view as any).riskScore} is above your ${APPROVAL_CEILING} limit - send it for approval instead.`, 'critical');
        return false;
      }
      const approvalBlockers = getApprovalBlockers(vendor);
      if (approvalBlockers.length) {
        appendAudit({
          vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
          actionType: 'APPROVAL_GATE_BLOCKED' as any, documentName: 'Full compliance application', fieldLabel: 'Vendor approval',
          originalValue: `AI risk score ${(view as any).riskScore}/100`, humanValue: 'Approval refused by evidence gate',
          reason: approvalBlockers.join(' '),
        });
        notify(`Approval blocked - ${approvalBlockers.join(' ')}`, 'critical');
        return false;
      }
    }

    if (finalStatus) {
      setRawVendors((current) => current.map((candidate) => (candidate.id === vendorId
        ? { ...candidate, finalStatus, supervisorNote: undefined }
        : candidate)));
    }

    let targetDoc: any = null;
    let requestReason = notes;
    let clauseId: any = null;
    if (decisionType === 'REQUEST_DOCS') {
      const selectedFinding = context.finding || null;
      targetDoc = vendor.documents.find((doc) => doc.status === 'Missing')
        || vendor.documents.find((doc) => doc.id === selectedFinding?.docId)
        || vendor.documents.find((doc) => ['Flagged', 'Needs Review'].includes(doc.status))
        || firstActionableDocument(vendor);
      if (!targetDoc) return false;
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
        mutateDoc(vendorId, targetDoc.id, (doc: any) => ({
          ...doc, status: 'Flagged',
          rejection: { reason: requestReason, detail: finding?.recommendation || 'Upload a corrected replacement file.', at: requestedAt },
        }));
      }
    }

    appendAudit({
      vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.admin.name, actorId: CURRENT_USERS.admin.id,
      actionType: (decisionType === 'REQUEST_DOCS' ? 'DOCUMENT_REQUESTED' : 'DECISION') as any,
      documentName: targetDoc?.title || 'Full compliance application',
      fieldLabel: decisionType === 'REQUEST_DOCS' ? 'Supplier correction task' : 'Vendor decision',
      originalValue: `AI risk score ${(view as any).riskScore}/100`, humanValue: labels[decisionType] || decisionType,
      reason: requestReason || labels[decisionType] || decisionType,
    });

    if (decisionType === 'ESCALATE') {
      raiseRequest({
        type: 'ESCALATION', vendorId,
        title: `Reviewer escalated ${vendor.shortName || vendor.name}`,
        reason: notes || 'Escalated for supervisor review.', riskScore: (view as any).riskScore,
        detail: {
          openFindings: `${(view as any).openFindings ?? 0} finding(s) still open`,
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

  const simulateInboundRequest = useCallback(() => {
    const ahead = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    };
    const pick = (list: any[]) => list[Math.floor(Math.random() * list.length)];

    const approved = rawVendors.filter((v) => ['Approved', 'Active'].includes(v.finalStatus as any));
    const openVendors = rawVendors.filter((v) => !v.finalStatus);
    const usable = REQUEST_TEMPLATES.filter((t: any) => {
      if (t.platform) return true;
      if (t.requiresApproved) return approved.length > 0;
      return openVendors.length > 0;
    });
    if (!usable.length) return null;

    const template: any = pick(usable);
    const vendorRaw = template.platform
      ? null
      : deriveVendorView(pick(template.requiresApproved ? approved : openVendors));

    const meta = (REQUEST_TYPES as any)[template.type] || REQUEST_TYPES.RISK_ACCEPTANCE;
    const ageHours = Math.floor(Math.random() * Math.round((meta?.tone ? 24 : 24) * 1.6));
    const raisedAt = new Date(Date.now() - ageHours * 3600000).toISOString();

    const request: SupervisorRequest = {
      id: `REQ-${Math.floor(4500 + Math.random() * 4000)}`,
      type: template.type,
      vendorId: vendorRaw?.id || null,
      vendorName: vendorRaw?.name || 'Platform',
      vendorShortName: vendorRaw?.shortName || vendorRaw?.name || 'Platform',
      title: template.title(vendorRaw || {}),
      reason: template.reason(vendorRaw || {}),
      raisedBy: template.platform || !template.requiresApproved ? CURRENT_USERS.admin.name : 'Continuous monitoring',
      raisedAt,
      slaHours: 24,
      detail: template.detail(vendorRaw || {}, ahead),
      status: 'open', outcome: undefined, supervisorNote: '', resolvedAt: undefined,
    };

    setSupervisorRequests((current) => [request, ...current]);
    notify(`${meta?.label || 'Request'} arrived  /  ${request.vendorShortName}.`);
    return request;
  }, [rawVendors, notify]);

  const resolveRequest = useCallback((requestId: string, outcome: string, note?: string, options: any = {}) => {
    const item = supervisorRequests.find((r) => r.id === requestId);
    if (!item || item.status !== 'open') return false;
    const vendor = item.vendorId ? rawVendors.find((candidate) => candidate.id === item.vendorId) : null;
    if (outcome === 'UPHOLD' && vendor) {
      const approvalBlockers = getApprovalBlockers(vendor);
      if (approvalBlockers.length) {
        appendAudit({
          vendorId: vendor.id, vendorName: vendor.name,
          actorName: CURRENT_USERS.supervisor.name, actorId: CURRENT_USERS.supervisor.id,
          actionType: 'APPROVAL_GATE_BLOCKED' as any, documentName: (REQUEST_TYPES as any)[item.type]?.label || 'Supervisor request',
          fieldLabel: `${item.id} / Vendor approval`, originalValue: `Requested by ${item.raisedBy}`,
          humanValue: 'Approval refused by evidence gate', reason: approvalBlockers.join(' '),
        });
        notify(`Approval blocked - ${approvalBlockers.join(' ')}`, 'critical');
        return false;
      }
    }
    const resolvedAt = new Date().toISOString();
    const meta = (REQUEST_OUTCOMES as Record<string, any>)[outcome] || {};
    const expiresAt = meta.needsExpiry ? (options.expiresAt || item.detail?.proposedExpiry || null) : null;

    setSupervisorRequests((current) => current.map((r) => (r.id === requestId
      ? { ...r, status: 'resolved', outcome, supervisorNote: note || '', resolvedAt, expiresAt } as any
      : r)));

    const statusFor: any = {
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
          ? { note: note || 'Returned for further work.', returnedAt: resolvedAt } as any
          : undefined;
        return next;
      }));
    }

    if (outcome === 'GRANT' && item.detail?.findingId) {
      setFindingResolutions((current) => ({
        ...current,
        [item.detail?.findingId]: {
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
      actionType: 'REQUEST_RESOLVED' as any,
      documentName: (REQUEST_TYPES as any)[item.type]?.label || 'Supervisor request',
      fieldLabel: `${item.id}  /  ${item.title}`,
      originalValue: `Raised by ${item.raisedBy}`,
      humanValue: meta.audit || outcome,
      reason: note || meta.audit || outcome,
    });
    notify(`${meta.audit || outcome}  /  ${item.vendorShortName}.`);
    return true;
  }, [supervisorRequests, rawVendors, appendAudit, notify]);

  const resolveManyRequests = useCallback((requestIds: string[], outcome: string, note?: string) => {
    if (outcome === 'GRANT') return 0;
    const ids = requestIds.filter((id) => {
      const item = supervisorRequests.find((r) => r.id === id);
      return item && item.status === 'open' && ((REQUEST_TYPES as any)[item.type]?.outcomes || []).includes(outcome as any);
    });
    ids.forEach((id) => resolveRequest(id, outcome, note));
    return ids.length;
  }, [supervisorRequests, resolveRequest]);

  const exceptions = useMemo(() => {
    const now = Date.now();
    return supervisorRequests
      .filter((r) => r.outcome === 'GRANT' && (r as any).expiresAt)
      .map((r: any) => {
        const remainingMs = new Date(r.expiresAt).getTime() - now;
        const days = Math.ceil(remainingMs / 86400000);
        return {
          ...r,
          daysLeft: days,
          lapsed: remainingMs <= 0,
          lapsingSoon: remainingMs > 0 && days <= 14,
        };
      }) as RiskException[];
  }, [supervisorRequests]);

  const caseOwnership = useMemo(() => {
    const map: Record<string, any> = {};
    for (const request of supervisorRequests) {
      if (request.status !== 'open' || !request.vendorId) continue;
      const decisionAway = ['AUTHORITY', 'ESCALATION'].includes(request.type);
      const existing = map[request.vendorId];
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

  const getCaseOwner = useCallback((vendorId: string) => caseOwnership[vendorId] || {
    owner: 'reviewer', ownerName: CURRENT_USERS.admin.name, decisionAway: false, request: null,
  }, [caseOwnership]);

  const acknowledgeSupervisorNote = useCallback((vendorId: string) => {
    setRawVendors((current) => current.map((v) => (v.id === vendorId ? { ...v, supervisorNote: undefined } : v)));
  }, []);

  const activationGate = useCallback((vendorId: string) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor) return { canActivate: false, blockers: ['Vendor not found.'] };
    const blockers: string[] = [];
    const outstanding = vendor.documents.filter((d) => d.status === 'Missing');
    if (outstanding.length) blockers.push(`${outstanding.length} mandatory document(s) not received  -  PROC-3.3.`);
    const inFlight = vendor.documents.filter((d) => d.status === 'Processing');
    if (inFlight.length) blockers.push(`${inFlight.length} document(s) still being verified  -  PROC-3.3.`);
    const unresolved = vendor.documents.filter((d) => d.status !== 'Missing' && d.status !== 'Processing'
      && recomputeDocStatus(d) !== 'Verified');
    if (unresolved.length) blockers.push(`${unresolved.length} document(s) have open findings  -  PROC-3.3.`);
    if (vendor.finalStatus !== 'Approved') blockers.push('No human approval recorded  -  PROC-5.1.');
    return { canActivate: blockers.length === 0, blockers };
  }, [rawVendors]);

  const activateInErp = useCallback((vendorId: string) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    const gate = activationGate(vendorId);
    if (!vendor || !gate.canActivate) {
      if (vendor) {
        appendAudit({
          vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
          actionType: 'GATE_BLOCKED' as any, documentName: 'ERP activation', fieldLabel: 'Activation gate',
          originalValue: 'Activation attempted', humanValue: 'Refused',
          reason: gate.blockers.join(' '),
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
      reason: 'Final human approval present',
    });
    notify(`Vendor activated as ${erpId}.`);
  }, [rawVendors, activationGate, appendAudit, notify]);

  const addVendor = useCallback(({ name, country, category, email }: any) => {
    if (!name) return null;
    const id = `VEN-${Math.floor(1000 + Math.random() * 8999)}`;
    const vendor = buildVendorRecord({ id, name, country, category, email });
    setRawVendors((current) => [vendor, ...current]);
    appendAudit({
      vendorId: id, vendorName: name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'VENDOR_INVITED', documentName: 'Vendor invitation', fieldLabel: 'New vendor',
      originalValue: null, humanValue: name, reason: 'Vendor invited to onboard',
    });
    notify(`Invitation sent to ${name}.`);
    return vendor;
  }, [appendAudit, notify]);

  const ensureVendorFromInvite = useCallback((invite: any) => {
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
      reason: 'Vendor opened their onboarding link',
    });
    return vendor;
  }, [rawVendors, appendAudit]);

  const setOnboardingStep = useCallback((vendorId: string, step: number) => {
    setRawVendors((current) => current.map((v) => (v.id === vendorId
      ? { ...v, onboardingStep: Math.max(0, Math.min(STEP_SUBMITTED, step)) }
      : v)));
  }, []);

  const setOnboardingMethod = useCallback((vendorId: string, method: string) => {
    setRawVendors((current) => current.map((v) => (v.id === vendorId
      ? { ...v, onboardingMethod: method }
      : v)));
  }, []);

  const saveVendorProfile = useCallback((vendorId: string, profile: VendorProfile & Record<string, any>) => {
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
        name: profile.legalName || v.name,
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
      } as Vendor;
    }));
    appendAudit({
      vendorId, vendorName: profile.legalName, actorName: profile.contactName || CURRENT_USERS.vendor.name, actorId: vendorId,
      actionType: 'PROFILE_SUBMITTED' as any, documentName: 'Company profile', fieldLabel: 'Registered company details',
      originalValue: vendor.profile ? vendor.name : 'Not yet provided',
      humanValue: `${profile.legalName}  /  ${profile.country || 'Country not stated'}`,
      reason: 'Supplier completed onboarding step 1',
    });
    notify('Company profile saved. Next: upload your documents.');
  }, [rawVendors, appendAudit, notify]);

  const submitApplication = useCallback((vendorId: string) => {
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
      actionType: 'APPLICATION_SUBMITTED' as any, documentName: 'Full onboarding application', fieldLabel: 'Application submitted',
      originalValue: 'Draft with the supplier', humanValue: 'Submitted for compliance review',
      reason: 'Supplier completed every onboarding step',
    });
    supplied.forEach((doc) => runDocumentReview(vendorId, doc.id, (doc as any).pendingVerdict, { quiet: true, notifyOnPass: false }));
    notify('Application submitted. AI and compliance review have started.');
  }, [rawVendors, appendAudit, notify, runDocumentReview]);

  const restartOnboarding = useCallback((vendorId: string) => {
    const vendor = rawVendors.find((v) => v.id === vendorId);
    if (!vendor) return;
    setRawVendors((current) => current.map((v) => (v.id === vendorId
      ? {
        ...v,
        onboardingStep: 0,
        onboardingMethod: undefined,
        profile: undefined,
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
          rejection: undefined,
          pendingVerdict: undefined,
        })),
      } as Vendor
      : v)));
    appendAudit({
      vendorId, vendorName: vendor.name, actorName: CURRENT_USERS.customer.name, actorId: CURRENT_USERS.customer.id,
      actionType: 'VENDOR_INVITED', documentName: 'Vendor invitation', fieldLabel: 'Onboarding restarted',
      originalValue: vendor.name, humanValue: 'Returned to step 1',
      reason: 'Onboarding restarted from the beginning',
    });
    notify(`${vendor.shortName || vendor.name} is back at step 1 of onboarding.`);
  }, [rawVendors, appendAudit, notify]);

  const addRequest = useCallback(({ title, vendorId, amount, due }: any) => {
    if (!title) return;
    const vendor = rawVendors.find((v) => v.id === vendorId) || rawVendors[0];
    const request: ProcurementRequest = {
      id: `PR-${Math.floor(24020 + Math.random() * 900)}`, title, vendorId: vendor.id, vendor: vendor.shortName || vendor.name,
      amount: amount || 'TBD', due: due || 'TBD', status: 'Draft', tone: 'neutral',
    };
    setRequests((current) => [request, ...current]);
    notify(`${request.id} created as a draft.`);
  }, [rawVendors, notify]);

  const respondToRequest = useCallback((requestId: string, updates: Partial<ProcurementRequest>) => {
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
    setRequests(clone(INITIAL_REQUESTS) as ProcurementRequest[]);
    setAuditLogs((clone(INITIAL_AUDIT_LOGS) as unknown) as AuditLogEntry[]);
    setAgentConfig(DEFAULT_AGENT_CONFIG());
    setConfigHistory([]);
    setAgentApprovals([]);
    setFindingResolutions({});
    setChaseState({});
    setSupervisorRequests((clone(INITIAL_REQUESTS_TO_SUPERVISOR) as unknown) as SupervisorRequest[]);
    clearPersisted();
    notify('Demo data restored.', 'critical');
  }, [notify]);

  const value = useMemo(() => ({
    vendors, requests, auditLogs, toast, settings, updateSettings, activeVendorId, setActiveVendorId,
    getVendor, acceptField, correctField, uploadDocument, deleteDocument, uploadNextActionable,
    submitDecision, activateInErp, activationGate, addVendor, addRequest, respondToRequest, resetDemo, notify,
    ensureVendorFromInvite, setOnboardingStep, setOnboardingMethod, saveVendorProfile, submitApplication, restartOnboarding,
    agentConfig, configHistory, pendingApprovals, approvalHistory, actorRole, setActorRole,
    getAssessment, getThreads, getTriage,
    dispatchAgentAction, resolveApproval, updateAgentConfig, revertAgentConfig,
    chaseNow, ingestChaserReply, setChasePaused,
    resolveFinding, reopenFinding, runAgentPass, findingResolutions,
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
