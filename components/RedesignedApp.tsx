'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bell, Bot, BriefcaseBusiness, Building2,
  CalendarClock, Check, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign,
  Clock3, CornerUpLeft, FileCheck2, FileText, FolderKanban, Gauge, Headphones, HelpCircle, Home, Inbox,
  LayoutDashboard, Link2, Lock, Menu, MessageSquareText, PackageCheck, PanelLeftClose,
  PanelLeftOpen, Plus, RefreshCw, Search, Send, Settings, ShieldCheck, ShoppingBag, Sparkles,
  Upload, Users, WalletCards, X, XCircle, Zap,
} from 'lucide-react';
import { NexusProvider, useNexus, inspectUpload } from '../context/NexusContext';
import { CURRENT_USERS, REQUEST_TYPES, REQUEST_OUTCOMES } from '../data/mockData';
import { DEMO_VENDOR_ID, ONBOARDING_STEPS, STEP_SUBMITTED } from '../constants/onboarding';
import { encodeInvite, inviteUrl, readInviteFromUrl } from '../lib/base64';
import { BANDS } from '../services/agentEngine';
import { AGENTS_BY_ID } from '../services/agentCatalog';
import ReviewWorkspace from './ReviewWorkspace';
import ActivityView from './admin/Activity/ActivityView';
import OnboardingWizard, { InviteEmailStep, CreateAccountStep, WizardStepper, allowedStep } from './OnboardingWizard';
import AgentConsole from './AgentConsole';
import ChaserPanel from './ChaserPanel';
import useDialog from '../hooks/useDialog';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import type { Vendor } from '../types/vendor';

import Dashboard from './admin/Dashboard/Dashboard';
import VendorList from './admin/Vendor/VendorList';
import VendorDetailView from './admin/Vendor/VendorDetailView';
import AIComplianceAssistant from './admin/AI/AIComplianceAssistant';
import ApprovalToast from './admin/Shared/ApprovalToast';
import DocumentsView from './admin/DocumentReview/DocumentsView';

const adminNav: [string, string, any][] = [
  ['overview', 'Dashboard', LayoutDashboard],
  ['vendors', 'Vendors', Users],
  ['review-queue', 'Review Queue', Inbox],
  ['compliance', 'Compliance', ShieldCheck],
  ['onboarding', 'Product Catalog', FolderKanban],
  ['agents', 'Agent Console', Bot],
  ['activity', 'Activity', Activity],
];

const vendorNav: [string, string, any][] = [
  ['overview', 'My workspace', Home],
  ['onboarding', 'Onboarding', FolderKanban],
  ['actions', 'Action center', Inbox],
  ['documents', 'Documents', FileCheck2],
];

const pageNamesByPersona: Record<string, Record<string, string>> = {
  admin: {
    overview: 'Dashboard',
    vendors: 'Vendors',
    'review-queue': 'Review Queue',
    onboarding: 'Product Catalog',
    compliance: 'Compliance',
    'ai-review': 'Review workspace',
    'vendor-details': 'Vendor Details',
    agents: 'Agent Console',
    activity: 'Activity',
  },
  vendor: {
    overview: 'My workspace',
    onboarding: 'Onboarding',
    actions: 'Action center',
    documents: 'Documents',
  },
};

const ROLE_PAGES: Record<string, string[]> = {
  admin: ['overview', 'vendors', 'review-queue', 'onboarding', 'ai-review', 'compliance', 'agents', 'activity', 'vendor-details'],
  vendor: ['overview', 'onboarding', 'actions', 'documents'],
};

const HOME_PAGE: Record<string, string> = { admin: 'overview', vendor: 'overview' };

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin Portal', vendor: 'Vendor Portal',
};

const BELL_FOOTER: Record<string, { page: string; label: string }> = {
  admin: { page: 'activity', label: 'Open activity log' },
  vendor: { page: 'actions', label: 'Open action center' },
};

const ACTION_META: Record<string, [any, string]> = {
  FIELD_ACCEPT: [CheckCircle2, 'green'],
  FIELD_OVERRIDE: [Sparkles, 'violet'],
  DOCUMENT_UPLOAD: [Upload, 'blue'],
  DOCUMENT_VERIFIED: [CheckCircle2, 'green'],
  DECISION: [ShieldCheck, 'green'],
  VENDOR_INVITED: [Users, 'blue'],
  AI_REVIEW: [Sparkles, 'violet'],
  AGENT_ACTION: [Bot, 'violet'],
  AGENT_BLOCKED: [ShieldCheck, 'red'],
  AGENT_PENDING: [Clock3, 'amber'],
  AGENT_APPROVAL: [CheckCircle2, 'green'],
  AGENT_CONFIG: [Settings, 'blue'],
  GATE_BLOCKED: [ShieldCheck, 'red'],
  ESCALATION_RESOLVED: [ShieldCheck, 'violet'],
};

const cx = (...items: (string | boolean | undefined | null)[]): string => items.filter(Boolean).join(' ');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const shortTime = (iso: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = MONTHS[d.getUTCMonth()];
    const hh  = String(d.getUTCHours()).padStart(2, '0');
    const mm  = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${mon}, ${hh}:${mm}`;
  } catch {
    return iso;
  }
};

function reviewMetricsFor(vendor: any, assessment: any) {
  const documents = vendor?.documents || [];
  const fields = documents.flatMap((doc: any) => doc.fields || []);
  return {
    documentsChecked: documents.filter((doc: any) => !['Missing', 'Uploaded', 'Processing'].includes(doc.status)).length,
    missing: documents.filter((doc: any) => doc.status === 'Missing').length,
    fieldsReviewed: fields.length,
    autoCleared: fields.filter((field: any) => field.resolved && field.confidence >= 90 && !field.humanVerified).length,
    reviewerVerified: fields.filter((field: any) => field.humanVerified).length,
    openFindings: assessment?.open?.length || 0,
  };
}

function attentionItems(vendors: Vendor[]) {
  const items: any[] = [];
  for (const vendor of vendors) {
    if (vendor.finalStatus) continue;
    const mismatch = vendor.documents.flatMap((d: any) => d.fields).find((f: any) => f.crossDocMismatch && !f.resolved);
    if (mismatch) {
      items.push({ tone: 'red', icon: AlertCircle, title: 'Legal or entity name mismatch', detail: `${vendor.shortName || vendor.name} / ${mismatch.label}`, badge: 'High', vendorId: vendor.id, target: 'ai-review' });
      continue;
    }
    if (vendor.missingCount! > 0) {
      items.push({ tone: 'amber', icon: Clock3, title: `${vendor.missingCount} document${vendor.missingCount! > 1 ? 's' : ''} outstanding`, detail: `${vendor.shortName || vendor.name} / ${vendor.sla} SLA left`, badge: vendor.slaHours <= 6 ? 'Due today' : 'Open', vendorId: vendor.id, target: 'onboarding' });
      continue;
    }
    const expiring = vendor.documents.flatMap((d: any) => d.fields).find((f: any) => !f.resolved && /expir/i.test(f.diagnostic || ''));
    if (expiring) {
      items.push({ tone: 'violet', icon: ShieldCheck, title: `${expiring.label} needs confirmation`, detail: `${vendor.shortName || vendor.name}`, badge: 'Upcoming', vendorId: vendor.id, target: 'compliance' });
    }
  }
  return items.slice(0, 3);
}

export default function RedesignedApp() {
  return (
    <NexusProvider>
      <NexusShell />
    </NexusProvider>
  );
}

function NexusShell() {
  const { vendors, toast, settings, activeVendorId, setActiveVendorId, ensureVendorFromInvite, getVendor } = useNexus();
  const [persona, setPersona] = useState('admin');
  const [page, setPage] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(activeVendorId);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [approvedToastVendor, setApprovedToastVendor] = useState<{ vendorId: string; vendorName: string } | null>(null);

  const nav = persona === 'admin' ? adminNav : vendorNav;
  const invitedRef = useRef(false);

  const safePage = ROLE_PAGES[persona].includes(page) ? page : HOME_PAGE[persona];

  useEffect(() => {
    if (invitedRef.current) return;
    invitedRef.current = true;
    const invite = readInviteFromUrl();
    if (!invite) return;
    const vendor = ensureVendorFromInvite(invite);
    if (!vendor) return;
    setActiveVendorId(vendor.id);
    setSelectedVendorId(vendor.id);
    setPersona('vendor');
    setPage('onboarding');
  }, [ensureVendorFromInvite, setActiveVendorId]);

  const switchPersona = (next: string) => {
    setPersona(next);
    setMobileNav(false);
    if (next === 'vendor') {
      setSelectedVendorId(activeVendorId);
      setPage(getVendor(activeVendorId)?.hasSubmittedApplication ? 'overview' : 'onboarding');
      return;
    }
    setPage(HOME_PAGE[next]);
  };

  const viewAsVendor = (vendorId: string) => {
    setActiveVendorId(vendorId);
    setSelectedVendorId(vendorId);
    setPersona('vendor');
    setPage(getVendor(vendorId)?.hasSubmittedApplication ? 'overview' : 'onboarding');
    setModal(null);
    setMobileNav(false);
  };

  const navigate = (next: string) => {
    setPage(next);
    setMobileNav(false);
  };

  const openVendor = (vendorId: string, targetPage = 'vendor-details') => {
    setActiveVendorId(vendorId);
    setSelectedVendorId(vendorId);
    setPage(targetPage);
    setModal(null);
    setMobileNav(false);
  };

  const openAsAdmin = (vendorId: string, targetPage = 'vendor-details') => {
    setPersona('admin');
    setActiveVendorId(vendorId);
    setSelectedVendorId(vendorId);
    setPage(targetPage);
    setModal(null);
    setMobileNav(false);
  };

  const handleApproveSuccess = (vId: string, vName: string) => {
    setApprovedToastVendor({ vendorId: vId, vendorName: vName });
  };

  const onboardingVendor = persona === 'vendor' ? getVendor(activeVendorId) : null;
  if (onboardingVendor && !onboardingVendor.hasSubmittedApplication) {
    return (
      <OnboardingExperience
        key={onboardingVendor.id}
        vendor={onboardingVendor}
        onSwitch={switchPersona}
        density={settings.density}
      >
        <VendorOnboarding onModal={setModal} onNavigate={navigate} />
        {modal && (
          <Modal modal={modal} onClose={() => setModal(null)} onOpenVendor={openVendor} onViewAsVendor={viewAsVendor} />
        )}
        {toast && <div className="nexus-toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
      </OnboardingExperience>
    );
  }

  return (
    <div className={cx('nexus-shell', collapsed && 'is-collapsed')} data-density={settings.density}>
      <Sidebar persona={persona} nav={nav} page={safePage} collapsed={collapsed}
        mobileNav={mobileNav} onNavigate={navigate} onCollapse={() => setCollapsed(!collapsed)}
        onClose={() => setMobileNav(false)} onModal={setModal} onViewAsVendor={viewAsVendor} />
      <div className="nexus-workspace">
        <Topbar persona={persona} page={safePage} query={query} setQuery={setQuery}
          onSwitch={switchPersona} onMobile={() => setMobileNav(true)}
          onHelp={() => setModal({ type: 'help' })}
          onNavigate={navigate} onOpenVendor={openVendor} onModal={setModal} />
        <main>
          <Page
            persona={persona} page={safePage} query={query} selectedVendorId={selectedVendorId}
            onNavigate={navigate} onModal={setModal}
            onOpenVendor={openVendor} onViewAsVendor={viewAsVendor} onOpenAsAdmin={openAsAdmin}
            onApproveSuccess={handleApproveSuccess}
          />
        </main>
      </div>

      {/* Floating AI Compliance Assistant button for Admin / Executive */}
      {persona !== 'vendor' && (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-slate-900 text-emerald-400 shadow-2xl hover:scale-105 hover:bg-slate-800 transition-all cursor-pointer border border-emerald-500/30"
          title="Open AI Compliance Assistant"
          onClick={() => setAiAssistantOpen(true)}
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 40, width: '52px', height: '52px', borderRadius: '50%', background: '#10231d', color: '#4FCB99', display: 'grid', placeItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid #4FCB9940', cursor: 'pointer' }}
        >
          <Sparkles size={22} />
        </button>
      )}

      {/* Global AI Compliance Assistant slide-out panel */}
      {persona !== 'vendor' && (
        <AIComplianceAssistant
          isOpen={aiAssistantOpen}
          onClose={() => setAiAssistantOpen(false)}
          vendors={vendors}
          onOpenVendor={openVendor}
          currentVendorId={selectedVendorId}
          currentPage={safePage}
        />
      )}

      {/* Custom Approval Success Toast */}
      {approvedToastVendor && (
        <ApprovalToast
          vendorId={approvedToastVendor.vendorId}
          vendorName={approvedToastVendor.vendorName}
          onClose={() => setApprovedToastVendor(null)}
          onViewVendor={(vId) => openVendor(vId, 'vendor-details')}
        />
      )}

      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      {modal && (
        <Modal modal={modal} onClose={() => setModal(null)} onOpenVendor={openVendor} onViewAsVendor={viewAsVendor} />
      )}
      {toast && <div className="nexus-toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

function OnboardingExperience({ vendor, onSwitch, density, children }: { vendor: Vendor; onSwitch: (p: string) => void; density: string; children: React.ReactNode }) {
  const [gate, setGate] = useState('invite');
  const { restartOnboarding } = useNexus();
  const step = allowedStep(vendor);
  const inWizard = gate === 'done';

  const startOver = () => {
    restartOnboarding(vendor.id);
    setGate('done');
  };

  const body = gate === 'invite'
    ? <InviteEmailStep vendor={vendor} onAccept={() => setGate('account')} />
    : gate === 'account'
      ? <CreateAccountStep vendor={vendor} onDone={() => { startOver(); }} />
      : children;

  return (
    <div className={cx('onboarding-shell', `is-${gate}`)} data-density={density}>
      <header className="onboarding-header">
        <span className="brand-glyph">S</span>
        <span className="onboarding-brand">
          <strong>StyleSphere</strong>
          <small>Vendor Nexus</small>
        </span>

        {inWizard && <WizardStepper step={step} method={vendor.onboardingMethod} />}

        {inWizard && (
          <span className="onboarding-identity">
            <button type="button" className="onboarding-restart" onClick={startOver}>
              <RefreshCw size={13} /> Start over
            </button>
            <span className="identity-text">
              <strong>{vendor.shortName || vendor.name}</strong>
              <small>Application {vendor.id} &middot; step {Math.min(step + 1, 4)} of 4</small>
            </span>
            <span className="company-avatar">{vendor.initials}</span>
          </span>
        )}
      </header>

      <main className="onboarding-main">{body}</main>

      <footer className="onboarding-footer">
        {inWizard && (
          <span><Lock size={13} /> Your progress is saved on this device. You can close this page and return to the same link.</span>
        )}
        {/* <button type="button" className="onboarding-exit" onClick={() => onSwitch('admin')}>
          Prototype: view as the StyleSphere team
        </button> */}
      </footer>
    </div>
  );
}

const ONBOARDING_LABELS = [
  'Invited / link not opened yet',
  'Reading the welcome brief',
  'Filling in the company profile',
  'Uploading documents',
  'Application submitted',
];

function Page({ persona, page, query, selectedVendorId, onNavigate, onModal, onOpenVendor, onViewAsVendor, onOpenAsAdmin, onApproveSuccess }: any) {
  if (persona === 'vendor') {
    if (page === 'overview') return <VendorDashboard onNavigate={onNavigate} onModal={onModal} />;
    if (page === 'onboarding') return <VendorOnboarding onModal={onModal} onNavigate={onNavigate} />;
    if (page === 'actions') return <VendorActions onModal={onModal} />;
    return <VendorDocuments onModal={onModal} />;
  }

  // Admin Portal (unified — includes former Vendor Executive capabilities)
  if (page === 'overview') return <Dashboard onNavigate={onNavigate} onModal={onModal} onOpenVendor={onOpenVendor} />;
  if (page === 'vendors') return <VendorList onOpenVendor={onOpenVendor} onModal={onModal} />;
  if (page === 'vendor-details' || page === 'ai-review') {
    return (
      <VendorDetailView
        vendorId={selectedVendorId}
        onBack={() => onNavigate('vendors')}
        onApproveSuccess={onApproveSuccess}
      />
    );
  }
  if (page === 'review-queue') return <SupervisorRequests onOpenVendor={onOpenVendor} onOpenAsAdmin={onOpenAsAdmin} />;
  if (page === 'onboarding') return <DocumentsView onOpenVendor={onOpenVendor} />;
  if (page === 'compliance') return <CompliancePage onNavigate={onNavigate} onOpenVendor={onOpenVendor} />;
  if (page === 'agents') return <AgentConsole persona="admin" />;
  return <ActivityView onOpenVendor={onOpenVendor} />;
}

function CustomerDashboard({ onNavigate, onModal, onOpenVendor }: any) {
  return <Dashboard onNavigate={onNavigate} onModal={onModal} onOpenVendor={onOpenVendor} />;
}

function VendorDashboard({ onNavigate, onModal }: any) {
  const { getVendor, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const correctionDoc = vendor.documents.find((d: any) => d.rejection);
  const missingDoc = vendor.documents.find((d: any) => d.status === 'Missing');
  const reviewRunning = vendor.documents.some((d: any) => d.status === 'Processing');
  const actionDoc = correctionDoc || missingDoc;
  const actionRequired = Boolean(actionDoc);

  if (!vendor.hasSubmittedApplication) {
    return <div className="nexus-page narrow"><ResumeOnboarding vendor={vendor} onNavigate={onNavigate} /></div>;
  }

  const headline = correctionDoc
    ? 'Action required'
    : missingDoc
      ? 'Document required'
      : vendor.finalStatus === 'Active'
        ? 'Supplier active'
        : vendor.finalStatus === 'Approved'
          ? 'Application approved'
          : reviewRunning
            ? 'Review in progress'
            : 'Decision pending';
  const detail = correctionDoc
    ? correctionDoc.rejection.detail
    : missingDoc
      ? `Upload ${missingDoc.title} so review can continue.`
      : vendor.finalStatus === 'Active'
        ? 'StyleSphere has activated your supplier record. You are ready to do business.'
        : vendor.finalStatus === 'Approved'
          ? 'Review is complete. StyleSphere will activate your supplier record next.'
          : reviewRunning
            ? 'Your files are being checked. We will contact you if anything is needed.'
            : 'Review is complete and waiting for admin decision.';
  const ringLabel = actionRequired
    ? 'Action'
    : vendor.finalStatus === 'Active'
      ? 'Active'
      : vendor.finalStatus === 'Approved'
        ? 'Approved'
        : reviewRunning
          ? 'Review'
          : 'Waiting';
  const openActionCount = (actionRequired ? 1 : 0);
  const stageLabel = actionRequired
    ? 'With you'
    : vendor.finalStatus === 'Active'
      ? 'Active'
      : vendor.finalStatus === 'Approved'
        ? 'Approved'
        : reviewRunning
          ? 'AI review'
          : 'Compliance';

  return (
    <div className="nexus-page">
      <section className="vendor-welcome">
        <div><div className="vendor-lockup"><span className="company-avatar large">{vendor.initials}</span><span><small>Vendor portal</small><strong>{vendor.shortName || vendor.name}</strong></span></div>
          <h1>{headline}</h1>
          <p>{detail}</p>
          <div className="page-actions">
            {actionRequired && <button className="button white" onClick={() => onModal({ type: 'upload' })}><Upload size={15} /> Upload requested file</button>}
            <button className="button ghost-white" onClick={() => onModal({ type: 'assistant' })}><Sparkles size={15} /> Ask a question</button>
          </div>
        </div>
        <div className="readiness-ring" style={{ background: `conic-gradient(#5dd2a5 0 ${vendor.progress}%, #ffffff16 ${vendor.progress}%)` }}><strong>{vendor.progress}%</strong><span>{ringLabel}</span></div>
      </section>
      <section className="vendor-metrics">
        {[
          [CheckCircle2, 'green', `${vendor.verifiedCount}/${vendor.documents.length}`, 'Documents reviewed'],
          [Inbox, actionRequired ? 'amber' : 'green', `${openActionCount} action${openActionCount === 1 ? '' : 's'}`, 'Needs your attention'],
          // [Clock3, 'blue', stageLabel, 'Current stage'],
        ].map(([Icon, tone, value, label]: any) => <article key={label}><span className={cx('metric-icon', tone)}><Icon size={18} /></span><span><strong>{value}</strong><small>{label}</small></span></article>)}
      </section>
      <section className="vendor-grid">
        <article className={cx('panel next-action', !actionRequired && 'calm')}>
          <span className="section-kicker">Your next action</span>
          {actionRequired ? (
            <div>
              <span className="attention-icon red"><AlertCircle size={18} /></span>
              <span><strong>{correctionDoc ? `Replace ${correctionDoc.title}` : `Upload ${missingDoc?.title || 'the outstanding document'}`}</strong>
                <p>{correctionDoc ? correctionDoc.rejection.detail : `Upload ${missingDoc?.title} so compliance review can continue.`}</p>
                <small><Clock3 size={13} /> {vendor.sla} SLA remaining &nbsp;|&nbsp; PDF, up to 10 MB</small></span>
              <button className="button primary" onClick={() => onModal({ type: 'upload' })}>Upload file <ArrowRight size={14} /></button>
            </div>
          ) : (
            <div><span className="attention-icon green"><CheckCircle2 size={18} /></span><span><strong>Nothing needed from you right now</strong><p>{reviewRunning ? 'Your submitted pack is still being reviewed.' : 'We will notify you if your reviewer needs anything else.'}</p></span></div>
          )}
          {actionRequired && <button className="link-row" onClick={() => onNavigate('actions')}>See what is outstanding <span><ChevronRight size={14} /></span></button>}
        </article>
        
        <article className="panel contact-card">
          <span className="section-kicker">Onboarding contact</span>
          <div><span className="user-avatar">ER</span><span><strong>Elena Rostova</strong><small>Vendor onboarding executive</small></span><i /></div>
          <p>Usually replies within 2 business hours by email or WhatsApp.</p>
          <div className="contact-actions">
            <button className="button secondary" onClick={() => onModal({ type: 'contact' })}><Send size={14} /> Email Elena</button>
            <button className="button primary" onClick={() => onModal({ type: 'assistant' })}><Sparkles size={14} /> Ask a question</button>
          </div>
          
        </article>
        <article className="panel journey-card"><PanelHeading eyebrow="Application" title="Review progress" action="View details" onAction={() => onNavigate('onboarding')} /><Journey vendor={vendor} /></article>
        {/* <article className="panel ai-explainer"><span className="ai-orb"><Sparkles size={22} /></span><div><span className="section-kicker">Review method</span><h3>AI checks; a person decides</h3><p>AI checks dates and mismatches. A compliance reviewer makes the decision.</p><button onClick={() => onNavigate('onboarding')}>View review status <ArrowRight size={13} /></button></div></article> */}
      </section>
    </div>
  );
}

function WorklistRow({ vendor, triage, onOpenVendor }: any) {
  const { getCaseOwner } = useNexus();
  const agent = triage.agentId ? AGENTS_BY_ID[triage.agentId as keyof typeof AGENTS_BY_ID] : null;
  const ownership = getCaseOwner(vendor.id);
  return (
    <button className="worklist-row" onClick={() => onOpenVendor(vendor.id)}>
      <VendorIdentity vendor={vendor} />
      <span className="worklist-headline">
        <strong>{ownership.decisionAway
          ? `With ${ownership.ownerName} — ${(REQUEST_TYPES[ownership.request.type as keyof typeof REQUEST_TYPES] || {}).label || 'sent up'}`
          : triage.headline}</strong>
        <small>
          {ownership.decisionAway ? (
            `${ownership.request.id} / the decision is not yours on this one`
          ) : (
            <>
              {agent && <><span className={cx('agent-glyph', 'mini', agent.tone)}>{agent.glyph}</span> {agent.name} / </>}
              {triage.waitingOn ? `Waiting on ${triage.waitingOn}` : `${vendor.docs} documents verified`}
            </>
          )}
        </small>
      </span>
      <RiskPill vendor={vendor} />
      <span className={cx('worklist-sla', vendor.slaHours <= 6 && 'urgent')}><Clock3 size={12} /> {vendor.sla}</span>
      <ChevronRight size={16} />
    </button>
  );
}

function VendorsPage({ query, onOpenVendor, onModal, onViewAsVendor, readOnly = false }: any) {
  const { vendors, getTriage, getAssessment, runAgentPass, notify } = useNexus();
  const [filter, setFilter] = useState('all');
  const awaitingVendor = vendors.filter((v: any) => !v.hasSubmittedApplication);
  const filtered = vendors.filter((vendor: any) => {
    const matchesQuery = `${vendor.name} ${vendor.country} ${vendor.category}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filter === 'onboarding') return !vendor.finalStatus;
    if (filter === 'active') return vendor.finalStatus === 'Active' || vendor.finalStatus === 'Approved';
    if (filter === 'risk') return vendor.risk === 'High';
    return true;
  });
  const counts = {
    all: vendors.length,
    onboarding: vendors.filter((v: any) => !v.finalStatus).length,
    active: vendors.filter((v: any) => v.finalStatus === 'Active' || v.finalStatus === 'Approved').length,
    risk: vendors.filter((v: any) => v.risk === 'High').length,
  };

  const banded = BANDS.map(([id, title, blurb]) => [
    id, title, blurb,
    filtered.filter((v: any) => getTriage(v.id).band === id),
  ]);
  const needsHuman = banded.filter(([id]) => id === 'decide' || id === 'blocked')
    .reduce((sum, [, , , rows]: any) => sum + rows.length, 0);

  return <div className="nexus-page">
    <PageHero
      eyebrow={`${vendors.length} suppliers in this workspace / ${needsHuman} need a human`}
      title={readOnly ? 'All vendors' : 'Vendor queue'}
      description={readOnly
        ? 'Read-only, prioritized by human action and SLA.'
        : 'Prioritized by human action, then SLA.'}
    >
      {!readOnly && <>
      <button
        className="button secondary"
        onClick={() => {
          const open = vendors.filter((vendor: any) => !vendor.finalStatus);
          const outcomes = open.map((vendor: any) => runAgentPass(vendor.id));
          const queued = outcomes.filter((outcome: any) => outcome?.queued).length;
          const duplicates = outcomes.filter((outcome: any) => outcome?.duplicate).length;
          notify(`Agents ran across ${open.length} open application${open.length === 1 ? '' : 's'} · ${queued} new proposal${queued === 1 ? '' : 's'} queued${duplicates ? ` · ${duplicates} unchanged proposal${duplicates === 1 ? '' : 's'} already awaiting review` : ''}.`, 'critical');
        }}
      >
        <Sparkles size={15} /> Run agents
      </button>
      <button className="button primary" onClick={() => onModal({ type: 'invite' })}><Plus size={15} /> Invite vendor</button>
      </>}
    </PageHero>
    <div className="filter-strip">
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All vendors <span>{counts.all}</span></button>
      <button className={filter === 'onboarding' ? 'active' : ''} onClick={() => setFilter('onboarding')}>Onboarding <span>{counts.onboarding}</span></button>
      <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Active <span>{counts.active}</span></button>
      <button className={filter === 'risk' ? 'active' : ''} onClick={() => setFilter('risk')}>At risk <span>{counts.risk}</span></button>
    </div>

    <section className="worklist">
      {banded.map(([id, title, blurb, rows]: any) => {
        if (!rows.length) return null;
        return (
          <div className={cx('worklist-band', id)} key={id}>
            <header>
              <span className="band-dot" />
              <div><strong>{title}</strong><small>{blurb}</small></div>
              <b>{rows.length}</b>
            </header>
            <div className="worklist-rows">
              {rows.map((vendor: any) => (
                <WorklistRow key={vendor.id} vendor={vendor} triage={getTriage(vendor.id)} onOpenVendor={onOpenVendor} />
              ))}
            </div>
            {id === 'working' && (
              <p className="band-footnote">
                {rows.reduce((sum: number, v: any) => sum + getAssessment(v.id).blockers.filter((b: any) => b.kind === 'missing').length, 0)} documents
                are being chased automatically in the suppliers&rsquo; own languages. Nothing here needs you.
              </p>
            )}
          </div>
        );
      })}
      {filtered.length === 0 && <div className="table-empty">No vendors match this filter.</div>}
    </section>

    {awaitingVendor.length > 0 && !readOnly && (
      <section className="panel awaiting-panel">
        <PanelHeading eyebrow="Waiting on the vendor" title={`${awaitingVendor.length} vendor${awaitingVendor.length > 1 ? 's have' : ' has'} not submitted yet`} />
        <p className="awaiting-copy">Send each vendor its secure onboarding link.</p>
        <div className="awaiting-list">
          {awaitingVendor.map((vendor: any) => (
            <article key={vendor.id}>
              <VendorIdentity vendor={vendor} />
              <StatusPill tone="amber">{ONBOARDING_LABELS[vendor.onboardingStep] || 'In progress'}</StatusPill>
              <div className="awaiting-actions">
                <button className="button secondary compact" onClick={() => onViewAsVendor?.(vendor.id)}>View vendor portal</button>
                <button className="button primary compact" onClick={() => onModal({ type: 'invite-link', vendor })}><Link2 size={14} /> Onboarding link</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    )}
    <section className="panel table-panel">
      <PanelHeading eyebrow="Full directory" title="All suppliers" />
      <div className="vendor-table table-head"><span>Vendor</span><span>Onboarding</span><span>Evidence</span><span>Risk</span><span>Owner</span><span>SLA</span><span /></div>
      {filtered.length === 0 && <div className="table-empty">No vendors match this filter.</div>}
      {filtered.map((vendor: any) => <button className="vendor-table table-row" key={vendor.id} onClick={() => onOpenVendor(vendor.id)}><VendorIdentity vendor={vendor} /><span><StatusPill tone={vendor.status === 'Blocked' ? 'red' : vendor.status === 'Ready' || vendor.status === 'Approved' ? 'green' : 'blue'}>{vendor.stage}</StatusPill><Progress value={vendor.progress} /></span><span><strong>{vendor.docs}</strong><small>Documents</small></span><RiskPill vendor={vendor} /><span>{vendor.owner}</span><span className={vendor.slaHours <= 6 ? 'urgent' : ''}>{vendor.sla}</span><ChevronRight size={16} /></button>)}
    </section>
  </div>;
}

function SupervisorOversight({ onNavigate, onOpenVendor, onOpenAsAdmin }: any) {
  const {
    vendors, supervisorRequests, exceptions, pendingApprovals, auditLogs, getAssessment, getTriage,
  } = useNexus();

  const stats = useMemo(() => {
    let checked = 0; let autoCleared = 0;
    for (const vendor of vendors) {
      const a = getAssessment(vendor.id);
      checked += a.stats.checked || 0;
      autoCleared += a.stats.autoCleared || 0;
    }
    const open = supervisorRequests.filter((r: any) => r.status === 'open');
    const breached = open.filter((r: any) => (Date.now() - new Date(r.raisedAt).getTime()) / 3600000 > (r.slaHours || 24));
    return {
      open: open.length,
      breached: breached.length,
      approvals: pendingApprovals.length,
      liveExceptions: exceptions.filter((e: any) => !e.lapsed).length,
      lapsed: exceptions.filter((e: any) => e.lapsed).length,
      slaAtRisk: vendors.filter((v: any) => v.slaHours <= 6 && !v.finalStatus).length,
      needsHuman: vendors.filter((v: any) => ['decide', 'blocked'].includes(getTriage(v.id).band)).length,
      assistRate: checked ? Math.round((autoCleared / checked) * 100) : 0,
    };
  }, [vendors, supervisorRequests, exceptions, pendingApprovals, getAssessment, getTriage]);

  const openRequests = supervisorRequests.filter((r: any) => r.status === 'open');
  const returned = vendors.filter((v: any) => v.supervisorNote);

  const kpis = [
    {
      label: stats.breached ? `Waiting on you / ${stats.breached} past SLA` : 'Waiting on you',
      value: stats.open, tone: stats.breached ? 'red' : stats.open ? 'amber' : 'green',
      icon: Inbox, page: 'requests',
    },
    {
      label: stats.lapsed ? `Live exceptions / ${stats.lapsed} lapsed` : 'Live exceptions on your signature',
      value: stats.liveExceptions + stats.lapsed, tone: stats.lapsed ? 'red' : 'violet',
      icon: ShieldCheck, page: 'requests',
    },
    { label: 'SLA at risk across the team', value: stats.slaAtRisk, tone: stats.slaAtRisk ? 'amber' : 'green', icon: Clock3, page: 'vendors' },
    { label: 'AI-assist rate', value: `${stats.assistRate}%`, tone: 'blue', icon: Gauge, page: 'agents' },
  ];

  return <div className="nexus-page supervisor-overview-page">
    <PageHero
      eyebrow={`${CURRENT_USERS.supervisor.name} / ${CURRENT_USERS.supervisor.role}`}
      title="Oversight"
      description="Your decisions, active exceptions, and team risk."
    >
      <button className="button primary" onClick={() => onNavigate('requests')}>
        <Inbox size={15} /> Open requests ({stats.open + stats.approvals})
      </button>
    </PageHero>

    <section className="metric-grid">
      {kpis.map((kpi) => (
        <button className="metric-card is-link" key={kpi.label} onClick={() => onNavigate(kpi.page)}>
          <span className={cx('metric-icon', kpi.tone)}><kpi.icon size={18} /></span>
          <span><strong>{kpi.value}</strong><em>{kpi.label}</em></span>
          <ChevronRight size={16} />
        </button>
      ))}
    </section>

    {returned.length > 0 && (
      <section className="panel">
        <PanelHeading eyebrow="Handed back" title={`${returned.length} case${returned.length > 1 ? 's' : ''} returned to an admin`} />
        <div className="awaiting-list">
          {returned.map((vendor: any) => (
            <article key={vendor.id}>
              <VendorIdentity vendor={vendor} />
              <StatusPill tone="amber">Awaiting admin action</StatusPill>
              <div className="awaiting-actions">
                <small className="muted-note">{vendor.supervisorNote.note}</small>
                <button className="button secondary compact" onClick={() => onOpenAsAdmin(vendor.id, 'ai-review')}>
                  <CornerUpLeft size={14} /> Follow into admin review
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    )}

    <div className="oversight-grid">
      <section className="panel">
        <PanelHeading eyebrow="Needs your decision" title="Requests to you" />
        <div className="attention-list">
          {openRequests.length === 0 && <p className="attention-empty"><CheckCircle2 size={16} /> No requests need your decision.</p>}
          {openRequests.slice(0, 4).map((request: any) => {
            const meta = REQUEST_TYPES[request.type as keyof typeof REQUEST_TYPES] || {};
            return (
              <button key={request.id} onClick={() => onNavigate('requests')}>
                <span className={cx('attention-icon', meta.tone)}><AlertCircle size={15} /></span>
                <span><strong>{request.vendorShortName} / {meta.label}</strong><small>{request.title}</small></span>
                <em>{request.raisedBy.split(' ')[0]}</em>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <PanelHeading eyebrow="Read-only" title="Recent decisions" />
        <div className="attention-list">
          {auditLogs.slice(0, 5).map((log: any) => {
            const [Icon, tone] = ACTION_META[log.actionType] || [Activity, 'neutral'];
            return (
              <button key={log.id} onClick={() => onOpenVendor(log.vendorId, 'ai-review')}>
                <span className={cx('attention-icon', tone)}><Icon size={15} /></span>
                <span><strong>{log.vendorName} / {log.fieldLabel}</strong><small>{log.actorName} / {shortTime(log.timestamp)}</small></span>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
        <div className="panel-footer">
          <button className="button secondary compact" onClick={() => onNavigate('activity')}>Open audit record <ArrowRight size={13} /></button>
        </div>
      </section>
    </div>
  </div>;
}

const DENSITY_THRESHOLD = 3;

function SupervisorRequests({ onOpenVendor, onOpenAsAdmin }: any) {
  const {
    supervisorRequests, exceptions, pendingApprovals, resolveRequest, resolveManyRequests,
    resolveApproval, simulateInboundRequest, getVendor,
  } = useNexus();

  const [filter, setFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [acting, setActing] = useState<any>(null);
  const [bulkOutcome, setBulkOutcome] = useState<any>(null);
  const [note, setNote] = useState('');
  const [expiry, setExpiry] = useState('');

  const open = supervisorRequests.filter((r: any) => r.status === 'open');
  const closed = supervisorRequests.filter((r: any) => r.status === 'resolved');

  const withAge = useMemo(() => open.map((r: any) => {
    const ageHours = Math.max(0, Math.round((Date.now() - new Date(r.raisedAt).getTime()) / 3600000));
    return { ...r, ageHours, breached: ageHours > (r.slaHours || 24) };
  }).sort((a: any, b: any) => Number(b.breached) - Number(a.breached) || b.ageHours - a.ageHours), [open]);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const r of withAge) byType[r.type] = (byType[r.type] || 0) + 1;
    return byType;
  }, [withAge]);

  const visible = filter === 'all' ? withAge : withAge.filter((r: any) => r.type === filter);
  const breachedCount = withAge.filter((r: any) => r.breached).length;
  const liveExceptions = exceptions.filter((e: any) => !e.lapsed);
  const lapsed = exceptions.filter((e: any) => e.lapsed);

  const [densityOverride, setDensityOverride] = useState<boolean | null>(null);
  const dense = densityOverride ?? (visible.length >= DENSITY_THRESHOLD);

  const groups = useMemo(() => {
    if (groupBy === 'none') return [['', visible]];
    if (groupBy === 'type') {
      return Object.entries(REQUEST_TYPES)
        .map(([id, meta]) => [meta.label, visible.filter((r: any) => r.type === id)])
        .filter(([, rows]: any) => rows.length);
    }
    const byVendor = new Map();
    for (const request of visible) {
      const key = request.vendorShortName || 'Platform';
      if (!byVendor.has(key)) byVendor.set(key, []);
      byVendor.get(key).push(request);
    }
    return [...byVendor.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [visible, groupBy]);

  const toggleExpanded = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelected = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectedRequests = withAge.filter((r: any) => selected.has(r.id));

  const sharedOutcomes = useMemo(() => {
    if (!selectedRequests.length) return [];
    const lists = selectedRequests.map((r: any) => REQUEST_TYPES[r.type as keyof typeof REQUEST_TYPES]?.outcomes || []);
    return lists.reduce((acc: any, list: any) => acc.filter((o: any) => list.includes(o)))
      .filter((o: any) => o !== 'GRANT');
  }, [selectedRequests]);

  const commitSingle = () => {
    const wasReturn = acting.outcome === 'RETURN';
    const targetVendor = acting.request.vendorId;
    const resolved = resolveRequest(acting.request.id, acting.outcome, note, { expiresAt: expiry || undefined });
    if (!resolved) return;
    setActing(null); setNote(''); setExpiry('');
    if (wasReturn && targetVendor) onOpenAsAdmin(targetVendor, 'ai-review');
  };

  const commitBulk = () => {
    resolveManyRequests([...selected], bulkOutcome, note);
    setBulkOutcome(null); setNote(''); setSelected(new Set());
  };

  return <div className="nexus-page supervisor-requests-page">
    <PageHero
      eyebrow={`${withAge.length} open / ${breachedCount} past SLA / ${pendingApprovals.length} agent action${pendingApprovals.length === 1 ? '' : 's'} held`}
      title="Requests"
      description="Ordered by SLA breach, then age."
    >
      <button className="button secondary" onClick={simulateInboundRequest}>
        <Plus size={15} /> Simulate request
      </button>
    </PageHero>

    <div className="filter-strip">
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
        All requests <span>{withAge.length}</span>
      </button>
      {Object.entries(REQUEST_TYPES).map(([id, meta]) => (
        counts[id] ? (
          <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>
            {meta.label} <span>{counts[id]}</span>
          </button>
        ) : null
      ))}
    </div>

    {visible.length > 0 && (
      <div className="queue-controls">
        <span className="queue-control-group">
          <label>Group by</label>
          {[['none', 'Deadline'], ['type', 'Type'], ['vendor', 'Vendor']].map(([id, label]) => (
            <button key={id} className={cx('chip', groupBy === id && 'active')} onClick={() => setGroupBy(id)}>
              {label}
            </button>
          ))}
        </span>
        <span className="queue-control-group">
          <label>View</label>
          <button className={cx('chip', !dense && 'active')} onClick={() => setDensityOverride(false)}>Full cards</button>
          <button className={cx('chip', dense && 'active')} onClick={() => setDensityOverride(true)}>Compact</button>
        </span>
        <span className="queue-control-spacer" />
        <button
          className="chip"
          onClick={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((r: any) => r.id)))}
        >
          {selected.size === visible.length && visible.length > 0 ? 'Clear selection' : `Select all ${visible.length}`}
        </button>
      </div>
    )}

    <section className="request-queue">
      {visible.length === 0 && (
        <div className="table-empty">
          {filter === 'all'
            ? 'No open requests. Use Simulate request to test this queue.'
            : 'No open requests of this kind.'}
        </div>
      )}
      {groups.map(([label, rows]: any) => (
        <Fragment key={label || 'all'}>
          {label && (
            <header className="queue-group-head">
              <strong>{label}</strong>
              <span>{rows.length}</span>
              {groupBy === 'vendor' && rows.length > 1 && <em>{rows.length} decisions on one supplier</em>}
            </header>
          )}
          {rows.map((request: any) => (
            <RequestCard
              key={request.id}
              request={request}
              vendor={request.vendorId ? getVendor(request.vendorId) : null}
              dense={dense && !expanded.has(request.id)}
              selected={selected.has(request.id)}
              onSelect={() => toggleSelected(request.id)}
              onToggle={() => toggleExpanded(request.id)}
              onOpenVendor={onOpenVendor}
              onAct={(outcome: string) => {
                setActing({ request, outcome });
                setNote('');
                setExpiry(request.detail?.proposedExpiry ? request.detail.proposedExpiry.slice(0, 10) : '');
              }}
            />
          ))}
        </Fragment>
      ))}
    </section>

    <section className="panel">
      <PanelHeading eyebrow="Held by policy" title="Agent proposals" />
      {pendingApprovals.length === 0 && <div className="table-empty">No agent action is waiting on a human.</div>}
      <div className="approval-list">
        {pendingApprovals.map((item: any) => (
          <div className="approval-row" key={item.id}>
            <span className="attention-icon violet"><Bot size={15} /></span>
            <span><strong>{item.summary || item.actionId}</strong><small>{item.vendorName || 'Platform'} / {item.agentName || item.agentId}</small></span>
            <button className="button secondary compact" onClick={() => resolveApproval(item.id, 'decline', 'Declined by supervisor.')}>Decline</button>
            <button className="button primary compact" onClick={() => resolveApproval(item.id, 'accept', 'Accepted by supervisor.')}>{item.agentId === 'compliance' ? 'Approve recommendation' : 'Accept proposal'}</button>
          </div>
        ))}
      </div>
    </section>

    {(liveExceptions.length > 0 || lapsed.length > 0) && (
      <section className="panel">
        <PanelHeading
          eyebrow="Granted by you"
          title={`${liveExceptions.length + lapsed.length} risk acceptance${liveExceptions.length + lapsed.length === 1 ? '' : 's'} on the book`}
        />
        <div className="exception-list">
          {[...lapsed, ...liveExceptions].map((exception: any) => (
            <button
              className={cx('exception-row', exception.lapsed && 'is-lapsed', exception.lapsingSoon && 'is-soon')}
              key={exception.id}
              onClick={() => exception.vendorId && onOpenVendor(exception.vendorId, 'ai-review')}
            >
              <span className={cx('attention-icon', exception.lapsed ? 'red' : exception.lapsingSoon ? 'amber' : 'green')}>
                {exception.lapsed ? <AlertCircle size={15} /> : <ShieldCheck size={15} />}
              </span>
              <span>
                <strong>{exception.vendorShortName}</strong>
                <small>{exception.detail?.control || exception.title}</small>
              </span>
              <em>{exception.lapsed ? `Lapsed ${Math.abs(exception.daysLeft)}d ago` : `${exception.daysLeft}d left`}</em>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        {lapsed.length > 0 && (
          <p className="band-footnote">
            {lapsed.length} exception{lapsed.length > 1 ? 's have' : ' has'} passed its expiry date. The finding each one
            was covering is open again, and the vendor is approved on a waiver that no longer holds.
          </p>
        )}
      </section>
    )}

    {closed.length > 0 && (
      <section className="panel">
        <PanelHeading eyebrow="Closed" title="Closed requests" />
        <div className="attention-list">
          {closed.slice(0, 6).map((request: any) => {
            const meta = REQUEST_OUTCOMES[request.outcome as keyof typeof REQUEST_OUTCOMES] || {};
            const tone = meta.tone === 'danger' ? 'red' : meta.tone === 'secondary' ? 'amber' : 'green';
            return (
              <button key={request.id} onClick={() => request.vendorId && onOpenVendor(request.vendorId, 'ai-review')}>
                <span className={cx('attention-icon', tone)}>
                  {tone === 'red' ? <XCircle size={15} /> : tone === 'amber' ? <CornerUpLeft size={15} /> : <CheckCircle2 size={15} />}
                </span>
                <span><strong>{request.vendorShortName} / {meta.audit || request.outcome}</strong><small>{request.supervisorNote || ' - '}</small></span>
                <em>{shortTime(request.resolvedAt)}</em>
              </button>
            );
          })}
        </div>
      </section>
    )}

    {selected.size > 0 && (
      <div className="bulk-bar">
        <strong>{selected.size} selected</strong>
        <span className="bulk-detail">
          {sharedOutcomes.length === 0
            ? 'These types share no common outcome — narrow the selection.'
            : `${new Set(selectedRequests.map((r: any) => r.type)).size} type(s) / one rationale, recorded against each`}
        </span>
        {sharedOutcomes.map((outcome: string) => {
          const meta = REQUEST_OUTCOMES[outcome as keyof typeof REQUEST_OUTCOMES] || {};
          return (
            <button
              key={outcome}
              className={cx('button', 'compact', meta.tone === 'primary' ? 'primary' : meta.tone === 'danger' ? 'danger' : 'secondary')}
              onClick={() => { setBulkOutcome(outcome); setNote(''); }}
            >
              {meta.label} {selected.size}
            </button>
          );
        })}
        <button className="button secondary compact" onClick={() => setSelected(new Set())}>Cancel</button>
      </div>
    )}

    {acting && (
      <RequestDialog
        request={acting.request} outcome={acting.outcome}
        note={note} onNote={setNote}
        expiry={expiry} onExpiry={setExpiry}
        onCancel={() => { setActing(null); setNote(''); setExpiry(''); }}
        onConfirm={commitSingle}
      />
    )}

    {bulkOutcome && (
      <BulkDialog
        outcome={bulkOutcome} count={selected.size} requests={selectedRequests}
        note={note} onNote={setNote}
        onCancel={() => { setBulkOutcome(null); setNote(''); }}
        onConfirm={commitBulk}
      />
    )}
  </div>;
}

const REQUEST_DETAIL_FIELDS: Record<string, [string, string, string?][]> = {
  RISK_ACCEPTANCE: [
    ['control', 'Control being waived'],
    ['compensating', 'Compensating control'],
    ['proposedExpiry', 'Proposed expiry', 'date'],
  ],
  AUTHORITY: [
    ['threshold', 'Your delegated limit'],
    ['trigger', 'What tripped it'],
    ['fourEyes', 'Four-eyes'],
  ],
  ESCALATION: [
    ['openFindings', 'Findings'],
    ['evidence', 'Evidence pack'],
    ['raisedFrom', 'Raised from'],
  ],
  POLICY_CHANGE: [
    ['before', 'Current'],
    ['after', 'Proposed'],
    ['effect', 'Effect'],
  ],
  REASSESSMENT: [
    ['source', 'What monitoring saw'],
    ['exposure', 'Live exposure'],
    ['lastDiligence', 'Last full diligence'],
  ],
};

function RequestCard({ request, vendor, dense, selected, onSelect, onToggle, onOpenVendor, onAct }: any) {
  const meta = REQUEST_TYPES[request.type as keyof typeof REQUEST_TYPES] || {};
  const fields = REQUEST_DETAIL_FIELDS[request.type] || [];

  if (dense) {
    return (
      <div className={cx('request-row', meta.tone, request.breached && 'is-breached', selected && 'is-selected')}>
        <input
          type="checkbox" checked={selected} onChange={onSelect}
          aria-label={`Select ${request.id}`}
        />
        <button className="request-row-main" onClick={onToggle} aria-expanded={false}>
          <ChevronRight size={15} className="request-chevron" />
          <span className={cx('request-type', meta.tone)}>{meta.label}</span>
          <span className="request-row-title">
            <strong>{request.vendorShortName}</strong>
            <small>{request.title}</small>
          </span>
          <span className={cx('request-age', request.breached && 'urgent')}>
            <Clock3 size={13} />
            {request.breached ? `${request.ageHours - request.slaHours}h over` : `${request.ageHours}h`}
          </span>
        </button>
      </div>
    );
  }

  return (
    <article className={cx('request-card', meta.tone, request.breached && 'is-breached', selected && 'is-selected')}>
      <header>
        <input
          type="checkbox" checked={selected} onChange={onSelect}
          aria-label={`Select ${request.id}`}
        />
        <span className={cx('request-type', meta.tone)}>{meta.label}</span>
        <span className="request-id">{request.id}</span>
        <span className={cx('request-age', request.breached && 'urgent')}>
          <Clock3 size={13} />
          {request.breached
            ? `${request.ageHours - request.slaHours}h past its ${request.slaHours}h SLA`
            : `${request.ageHours}h old / ${request.slaHours}h SLA`}
        </span>
        <button className="icon-button compact" onClick={onToggle} aria-label="Collapse">
          <ChevronDown size={16} />
        </button>
      </header>

      <h3 className="request-title">{request.title}</h3>
      <p className="request-reason">&quot;{request.reason}&quot;</p>

      <dl className="request-detail">
        {fields.map(([key, label, kind]) => (
          request.detail?.[key] ? (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{kind === 'date'
                ? new Date(request.detail[key]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : request.detail[key]}</dd>
            </div>
          ) : null
        ))}
      </dl>

      <footer className="request-actions">
        <span className="request-raiser">
          {vendor ? <VendorIdentity vendor={vendor} /> : <span className="request-platform"><Settings size={14} /> Platform-wide</span>}
        </span>
        <span className="request-meta">Raised by {request.raisedBy}</span>
        {request.vendorId && (
          <button className="button secondary compact" onClick={() => onOpenVendor(request.vendorId, 'ai-review')}>
            Read the case
          </button>
        )}
        {(meta.outcomes || []).map((outcome: string) => {
          const oMeta = REQUEST_OUTCOMES[outcome as keyof typeof REQUEST_OUTCOMES] || {};
          return (
            <button
              key={outcome}
              className={cx('button', 'compact', oMeta.tone === 'primary' ? 'primary' : oMeta.tone === 'danger' ? 'danger' : 'secondary')}
              onClick={() => onAct(outcome)}
            >
              {oMeta.label}
            </button>
          );
        })}
      </footer>
    </article>
  );
}

function RequestDialog({ request, outcome, note, onNote, expiry, onExpiry, onCancel, onConfirm }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  useDialog(cardRef, onCancel, { autoFocus: false });
  const meta = REQUEST_OUTCOMES[outcome as keyof typeof REQUEST_OUTCOMES] || {};
  const needsExpiry = Boolean((meta as any).needsExpiry);
  const ready = note.trim() && (!needsExpiry || expiry);

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal-card" role="dialog" aria-modal="true" aria-labelledby="request-dialog-title"
        tabIndex={-1} ref={cardRef} onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-kicker">{request.id} / {request.vendorShortName}</span>
            <h2 id="request-dialog-title">{meta.label}</h2>
            <p>{meta.copy}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          {needsExpiry && (
            <label className="form-field">
              <span>Expiry date (required — the exception lapses on this date)</span>
              <input type="date" value={expiry} onChange={(event) => onExpiry(event.target.value)} />
            </label>
          )}
          <label className="form-field">
            <span>{outcome === 'RETURN'
              ? 'What do you need the reviewer to do? (required)'
              : 'Rationale (required — written to the audit trail)'}</span>
            <textarea
              value={note} onChange={(event) => onNote(event.target.value)} autoFocus
              placeholder={outcome === 'RETURN'
                ? 'e.g. Get the notarised entity certificate before this comes back to me.'
                : 'Record the basis for this decision...'}
            />
          </label>
        </div>
        <footer>
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" onClick={onConfirm} disabled={!ready}>
            <Send size={15} /> Record decision
          </button>
        </footer>
      </section>
    </div>
  );
}

function BulkDialog({ outcome, count, requests, note, onNote, onCancel, onConfirm }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  useDialog(cardRef, onCancel, { autoFocus: false });
  const meta = REQUEST_OUTCOMES[outcome as keyof typeof REQUEST_OUTCOMES] || {};

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal-card" role="dialog" aria-modal="true" aria-labelledby="bulk-dialog-title"
        tabIndex={-1} ref={cardRef} onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-kicker">{count} requests</span>
            <h2 id="bulk-dialog-title">{meta.label} / {count} requests</h2>
            <p>{meta.copy}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          <ul className="bulk-manifest">
            {requests.map((request: any) => (
              <li key={request.id}>
                <span className={cx('request-type', (REQUEST_TYPES[request.type as keyof typeof REQUEST_TYPES] || {}).tone)}>
                  {(REQUEST_TYPES[request.type as keyof typeof REQUEST_TYPES] || {}).label}
                </span>
                <strong>{request.vendorShortName}</strong>
                <small>{request.title}</small>
              </li>
            ))}
          </ul>
          <label className="form-field">
            <span>Rationale (required — recorded against every one of these)</span>
            <textarea
              value={note} onChange={(event) => onNote(event.target.value)} autoFocus
              placeholder="One reason that genuinely covers all of them..."
            />
          </label>
        </div>
        <footer>
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" onClick={onConfirm} disabled={!note.trim()}>
            <Send size={15} /> {meta.label} {count}
          </button>
        </footer>
      </section>
    </div>
  );
}

const PIPELINE_COLUMNS: [string, string[]][] = [
  ['Invited', ['Invited']],
  ['Vendor action', ['Vendor action']],
  ['Verification', ['AI verification', 'Compliance review']],
  ['Approval', ['Ready to approve', 'With supervisor', 'Approved']],
  ['Activated', ['Active', 'Rejected']],
];

function OnboardingPipeline({ onOpenVendor, onModal }: any) {
  const { vendors } = useNexus();
  return <div className="nexus-page wide">
    <PageHero eyebrow={`${vendors.filter((vendor: any) => !vendor.finalStatus).length} applications in progress`} title="Document collection" description="Grouped by onboarding stage and next action."><button className="button primary" onClick={() => onModal({ type: 'invite' })}><Plus size={15} /> Invite vendor</button></PageHero>
    <section className="pipeline">
      {PIPELINE_COLUMNS.map(([title, stages]) => {
        const cards = vendors.filter((v: any) => stages.includes(v.stage));
        return (
          <div className="pipeline-column" key={title}>
            <header><span><i />{title}</span><strong>{cards.length}</strong></header>
            {cards.map((vendor: any) => <button className="pipeline-card" key={vendor.id} onClick={() => onOpenVendor(vendor.id)}><VendorIdentity vendor={vendor} /><div><span>{vendor.id}</span><span className={vendor.slaHours <= 6 ? 'urgent' : ''}><Clock3 size={12} /> {vendor.sla}</span></div><Progress value={vendor.progress} /><footer><RiskPill vendor={vendor} /><span>{vendor.docs} docs</span></footer></button>)}
            <button className="pipeline-add" onClick={() => onModal({ type: 'invite' })}><Plus size={14} /> Add vendor</button>
          </div>
        );
      })}
    </section>
  </div>;
}

function downloadComplianceReport(vendors: any[], auditLogs: any[]) {
  const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [[
    'Vendor ID', 'Vendor', 'Country', 'Category', 'Stage', 'Status', 'Progress %',
    'Documents verified', 'Documents outstanding', 'Open findings', 'Risk', 'Risk score', 'Owner', 'SLA', 'ERP ID',
  ]];
  for (const v of vendors) {
    rows.push([v.id, v.name, v.country, v.category, v.stage, v.status, v.progress,
      v.docs, v.missingCount, v.openFindings, v.risk, v.riskScore, v.owner, v.sla, v.erpId || '']);
  }
  rows.push([]);
  rows.push(['Audit trail']);
  rows.push(['Timestamp', 'Vendor', 'Actor', 'Action', 'Document', 'Field', 'Original value', 'Human value', 'Reason']);
  for (const log of auditLogs) {
    rows.push([log.timestamp, log.vendorName, log.actorName, log.actionType,
      log.documentName, log.fieldLabel, log.originalValue, log.humanValue, log.reason]);
  }

  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stylesphere-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CompliancePage({ onNavigate, onOpenVendor }: any) {
  const { vendors, auditLogs, notify } = useNexus();
  const coverage = (codes: string[]) => {
    const documents = vendors.flatMap((vendor: any) => vendor.documents).filter((doc: any) => codes.includes(doc.code));
    const verified = documents.filter((doc: any) => doc.status === 'Verified').length;
    return { value: documents.length ? `${Math.round((verified / documents.length) * 100)}%` : 'N/A', detail: `${verified} of ${documents.length} verified` };
  };
  const identityCoverage = coverage(['TAX', 'IEC', 'REG', 'LICENSE']);
  const financialCoverage = coverage(['TAX', 'BANK']);
  const socialCoverage = coverage(['AUDIT']);
  const productCoverage = coverage(['REACH', 'ISO17075', 'SAFETY', 'MATERIAL', 'FSC', 'QUALITY']);
  const controls: [any, string, string, string, string][] = [
    [Building2, 'green', 'Business identity', identityCoverage.value, identityCoverage.detail],
    [WalletCards, 'amber', 'Tax & financial', financialCoverage.value, financialCoverage.detail],
    [Users, 'violet', 'Social responsibility', socialCoverage.value, socialCoverage.detail],
    [ShieldCheck, 'blue', 'Product & environmental', productCoverage.value, productCoverage.detail],
  ];
  const expiring = vendors.flatMap((v: any) => v.documents.flatMap((d: any) => d.fields.map((f: any) => ({ ...f, vendor: v, doc: d }))))
    .filter((f: any) => !f.resolved && /expir/i.test(f.diagnostic || ''));
  return <div className="nexus-page">
    <PageHero eyebrow="Portfolio health" title="Compliance" description="Coverage, exceptions, and expiring evidence."><button className="button secondary" onClick={() => { downloadComplianceReport(vendors, auditLogs); notify(`Compliance report exported — ${vendors.length} vendors, ${auditLogs.length} audit entries.`); }}>Export compliance report</button></PageHero>
    <section className="compliance-grid">{controls.map(([Icon, tone, title, value, note]) => <article className="panel compliance-card" key={title}><span className={cx('metric-icon', tone)}><Icon size={18} /></span><span><small>{title}</small><strong>{value}</strong><em>{note}</em><Progress value={Number(value.slice(0, -1))} /></span></article>)}</section>
    <section className="compliance-layout">
      <article className="panel expiry-panel"><PanelHeading eyebrow="Upcoming risk" title="Expiring evidence" action="Review all" onAction={() => onNavigate('ai-review')} />
        {expiring.length === 0 && <p className="attention-empty">No evidence expires soon.</p>}
        {expiring.map((f: any) => <button key={f.key + f.vendor.id} onClick={() => onOpenVendor(f.vendor.id)}><span className={cx('file-icon', 'red')}><FileText size={17} /></span><span><strong>{f.doc.title}</strong><small>{f.vendor.shortName || f.vendor.name}</small></span><em>{f.diagnostic}</em><ChevronRight size={15} /></button>)}
      </article>
      <article className="panel human-control"><span className="control-graphic"><Sparkles size={24} /><i><ShieldCheck size={16} /></i></span><span className="section-kicker">AI-assisted, human-controlled</span><h3>Every automated check has evidence.</h3><p>AI extracts and compares. Your team resolves exceptions and owns the approval.</p><div><span><Check size={13} /> Source linked</span><span><Check size={13} /> Confidence shown</span><span><Check size={13} /> Decision logged</span></div><button className="button secondary full" onClick={() => onNavigate('ai-review')}>Open AI review workspace</button></article>
    </section>
  </div>;
}

function VendorOnboarding({ onModal, onNavigate }: any) {
  const { getVendor, getAssessment, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const assessment = getAssessment(activeVendorId);
  const reviewMetrics = reviewMetricsFor(vendor, assessment);

  if (!vendor.hasSubmittedApplication) {
    return <OnboardingWizard key={vendor.id} vendor={vendor} onFinish={() => onNavigate?.('overview')} />;
  }

  const processing = vendor.documents.some((d: any) => d.status === 'Processing');
  const correctionDoc = vendor.documents.find((d: any) => d.rejection);
  const missingDoc = vendor.documents.find((d: any) => d.status === 'Missing');
  const profileComplete = Boolean(vendor.profile) || vendor.onboardingStep >= STEP_SUBMITTED;
  const reviewCleared = vendor.verifiedCount === vendor.documents.length && !processing && !correctionDoc && !missingDoc;
  const steps = [
    {
      title: 'Company profile',
      status: profileComplete ? 'Complete' : 'Incomplete',
      detail: vendor.profile
        ? `${vendor.profile.legalName} / ${vendor.profile.country || 'Country not stated'} / Tax ID ${vendor.profile.taxId || 'not supplied'}.`
        : 'Your legal entity, addresses, tax registration, and primary contacts are on file.',
      state: profileComplete ? 'done' : 'current',
    },
    {
      title: 'Document pack',
      status: correctionDoc ? 'Correction requested' : missingDoc ? 'Missing document' : 'Submitted',
      detail: correctionDoc
        ? `${correctionDoc.title} needs a replacement. ${correctionDoc.rejection.reason}.`
        : missingDoc
          ? `${missingDoc.title} is still needed before review can continue.`
          : `All ${vendor.documents.length} required documents were submitted.`,
      state: correctionDoc || missingDoc ? 'current' : 'done',
    },
    {
      title: 'AI verification',
      status: processing ? 'In progress' : correctionDoc ? 'Completed with a correction request' : reviewCleared ? 'Complete' : 'Queued',
      detail: 'AI checks identity, expiry, authenticity, and cross-document consistency.',
      state: processing ? 'current' : (correctionDoc || reviewCleared ? 'done' : 'next'),
    },
    {
      title: 'Compliance review',
      status: correctionDoc || missingDoc ? 'Waiting for your update' : vendor.finalStatus ? 'Complete' : processing ? 'Waiting for AI review' : 'In progress',
      detail: 'A human compliance executive reviews the evidence and AI findings.',
      state: correctionDoc || missingDoc ? 'next' : vendor.finalStatus ? 'done' : (processing ? 'next' : 'current'),
    },
    {
      title: 'Customer approval & activation',
      status: vendor.finalStatus === 'Active' ? 'Activated' : vendor.finalStatus === 'Approved' ? 'Approved - pending activation' : vendor.finalStatus === 'Rejected' ? 'Rejected' : reviewCleared ? 'Pending human decision' : 'Not started',
      detail: "StyleSphere's compliance manager makes the final decision and activates your vendor record.",
      state: vendor.finalStatus === 'Active' ? 'done' : vendor.finalStatus ? 'current' : (reviewCleared ? 'current' : 'next'),
    },
  ];

  return <div className="nexus-page narrow">
    <PageHero eyebrow={`Application ${vendor.id}`} title="Application status" description="Submitted files, review progress, and requested changes."><StatusPill tone={correctionDoc || missingDoc ? 'amber' : reviewCleared ? 'blue' : 'green'}>{correctionDoc || missingDoc ? 'Action required' : reviewCleared ? 'Waiting for approval' : 'Under review'}</StatusPill></PageHero>
    <section className="panel detailed-journey"><div className="journey-progress"><span><small>Application readiness</small><strong>{vendor.progress}%</strong><em>{vendor.verifiedCount}/{vendor.documents.length} documents reviewed</em></span><Progress value={vendor.progress} /></div>
      {steps.map((step, index) => <article className={cx('detailed-step', step.state)} key={step.title}><span>{step.state === 'done' ? <Check size={16} /> : index + 1}</span><div><header><strong>{step.title}</strong><StatusPill tone={step.state === 'done' ? 'green' : step.state === 'current' ? 'amber' : 'neutral'}>{step.status}</StatusPill></header><p>{step.detail}</p>{step.title === 'Document pack' && (correctionDoc || missingDoc) && <button className="button primary" onClick={() => onModal({ type: 'upload' })}><Upload size={14} /> Upload corrected file</button>}</div></article>)}
    </section>
    <section className="panel ai-process"><span className="ai-orb"><Sparkles size={21} /></span><span><small className="section-kicker">Automated checks</small><strong>{processing ? 'Checks in progress' : 'Checks complete'}</strong><p>Files are compared before a compliance reviewer decides.</p></span><div>{[[String(reviewMetrics.documentsChecked), 'Documents checked'], [String(reviewMetrics.missing), 'Missing'], [String(reviewMetrics.fieldsReviewed), 'Fields reviewed'], [String(reviewMetrics.autoCleared), 'Auto-cleared'], [String(reviewMetrics.reviewerVerified), 'Reviewer-verified'], [String(reviewMetrics.openFindings), 'Open findings']].map(([value, label]) => <span key={label}><strong>{value}</strong><small>{label}</small></span>)}</div></section>
  </div>;
}

function VendorActions({ onModal }: any) {
  const { getVendor, getThreads, requests, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const correctionDoc = vendor.documents.find((d: any) => d.rejection);
  const missingDoc = vendor.documents.find((d: any) => d.status === 'Missing');
  const actionDoc = correctionDoc || missingDoc;
  const actionThread = actionDoc ? getThreads(activeVendorId).find((thread: any) => thread.docId === actionDoc.id) : null;
  const myOpenRequest = requests.find((r: any) => r.vendorId === activeVendorId && r.status !== 'Approved');
  return <div className="nexus-page narrow"><PageHero eyebrow={`${(actionDoc ? 1 : 0) + (myOpenRequest ? 1 : 0)} open actions`} title="Action center" description="Requests from StyleSphere, ordered by due date." /><section className="task-list">
    {actionDoc && (
      <Task icon={AlertCircle} urgent label="Onboarding · Due today" tone="red" badge="High priority"
        title={correctionDoc ? `Replace ${correctionDoc.title}` : `Submit ${missingDoc?.title}`}
        detail={correctionDoc ? correctionDoc.rejection.detail : (actionThread?.reason || `Upload ${missingDoc?.title} so your compliance review can continue.`)}
        note={`${actionThread?.clauseId || 'PROC-3.3'} · ${actionThread?.dueState || 'Due now'} · PDF · Max 10 MB`}>
        <button className="button primary" onClick={() => onModal({ type: 'upload' })}>Upload file</button>
      </Task>
    )}
    {myOpenRequest && (
      <Task icon={CircleDollarSign} label={`Procurement · Due ${myOpenRequest.due}`} tone="violet" badge="Quote needed" title={`Respond to ${myOpenRequest.id}`} detail={`Provide lead time, unit price, MOQ, and delivery terms for "${myOpenRequest.title}".`} note={`Estimated value ${myOpenRequest.amount} · StyleSphere Sourcing`}>
        <button className="button secondary" onClick={() => onModal({ type: 'quote', request: myOpenRequest })}>Prepare quote</button>
      </Task>
    )}
    {!actionDoc && !myOpenRequest && <p className="attention-empty"><CheckCircle2 size={16} /> No open actions.</p>}
  </section>
  <section className="panel vendor-chase-panel">
    <PanelHeading eyebrow="Messages about your documents" title="What we need from you" />
    <p className="awaiting-copy">Reply by email or WhatsApp with the file attached. You do not need to come back here.</p>
    <ChaserPanel vendorId={activeVendorId} />
  </section>
  </div>;
}

function VendorDocuments({ onModal }: any) {
  const { getVendor, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  return <div className="nexus-page"><PageHero eyebrow={`${vendor.verifiedCount}/${vendor.documents.length} reviewed`} title="Documents" description="Submitted files and replacement requests."><button className="button primary" onClick={() => onModal({ type: 'upload' })}><Upload size={15} /> Upload document</button></PageHero><section className="document-grid">
    {vendor.documents.map((doc: any) => {
      const tone = doc.status === 'Verified' ? 'green' : doc.status === 'Missing' ? 'red' : doc.status === 'Processing' || doc.status === 'Uploaded' ? 'blue' : 'amber';
      return <article className="panel document-card" key={doc.id}><header><span className={cx('file-icon', tone)}><FileText size={19} /></span><button aria-label={`Open ${doc.title}`} onClick={() => onModal({ type: 'document', doc, vendor })}>...</button></header><strong>{doc.title}</strong><small>{doc.rejection?.reason || doc.fileName || 'Not yet received'}</small><StatusPill tone={tone}>{doc.status}</StatusPill>{doc.status !== 'Verified' && doc.status !== 'Processing' && <button onClick={() => onModal({ type: 'upload', docId: doc.id })}>{doc.status === 'Missing' ? 'Upload now' : doc.status === 'Flagged' ? 'Upload correction' : 'Replace file'} <ArrowRight size={13} /></button>}</article>;
    })}
  </section></div>;
}

function ResumeOnboarding({ vendor, onNavigate }: any) {
  const step = vendor.onboardingStep ?? 0;
  const labels = ['getting started', 'your company profile', 'your documents', 'your final review'];
  return (
    <section className="panel wizard-card wizard-resume">
      <span className="wizard-badge"><Clock3 size={15} /> Application {vendor.id} / in progress</span>
      <h1>Complete your application</h1>
      <p className="wizard-lede">
        Continue from {labels[step] || 'your application'}. Submit to unlock your workspace.
      </p>
      <div className="wizard-actions">
        <span className="wizard-meta">Step {Math.min(step + 1, 4)} of 4</span>
        <button className="button primary large" onClick={() => onNavigate('onboarding')}>
          Continue application <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

function InviteLink({ vendor, compact }: any) {
  const { notify } = useNexus();
  const url = useMemo(() => inviteUrl(vendor), [vendor]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.getElementById(`invite-url-${vendor.id}`) as HTMLInputElement;
      field?.select?.();
      document.execCommand?.('copy');
    }
    setCopied(true);
    notify('Onboarding link copied. Send it to your vendor.');
    window.setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className={cx('invite-link', compact && 'compact')}>
      <span className="section-kicker"><Link2 size={13} /> Secure onboarding link</span>
      <div className="invite-link-row">
        <input id={`invite-url-${vendor.id}`} readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="button primary compact" onClick={copy}>
          {copied ? <><Check size={14} /> Copied</> : <>Copy link</>}
        </button>
      </div>
      <small>
        Send this to {vendor.email && vendor.email !== 'pending@vendor.com' ? vendor.email : 'your vendor contact'}.
        Opening it starts their company profile and document checklist.
      </small>
    </div>
  );
}

function PageHero({ eyebrow, title, description, children }: any) {
  return <section className="page-hero"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="page-actions">{children}</div>}</section>;
}

function PanelHeading({ eyebrow, title, action, onAction }: any) {
  return <header className="panel-heading"><div><span className="section-kicker">{eyebrow}</span><h2>{title}</h2></div>{action && <button onClick={onAction}>{action} <ArrowRight size={13} /></button>}</header>;
}

function Attention({ tone, icon: Icon, title, detail, badge, onClick }: any) {
  return <button onClick={onClick}><span className={cx('attention-icon', tone)}><Icon size={16} /></span><span><strong>{title}</strong><small>{detail}</small></span><em>{badge}</em><ChevronRight size={15} /></button>;
}

function VendorIdentity({ vendor }: { vendor: any }) {
  return <span className="vendor-identity"><span className="company-avatar">{vendor.initials}</span><span><strong>{vendor.name}</strong><small>{vendor.country} / {vendor.category}</small></span></span>;
}

function Progress({ value }: { value: number }) {
  return <span className="progress"><i style={{ width: `${value}%` }} /></span>;
}

function StatusPill({ tone = 'neutral', children }: { tone?: string; children: React.ReactNode }) {
  const toneMap: Record<string, string> = { Verified: 'green', Missing: 'red', Uploaded: 'blue', Processing: 'blue', Flagged: 'red', 'Needs Review': 'amber' };
  const label = children === 'Uploaded' ? 'Submitted' : children;
  return <span className={cx('status-pill', toneMap[children as string] || tone)}>{label}</span>;
}

function RiskPill({ vendor }: { vendor: any }) {
  const tone = vendor.risk === 'High' ? 'red' : vendor.risk === 'Medium' ? 'amber' : 'green';
  return <span className={cx('risk-pill', tone)}><i />{vendor.risk} <b>{vendor.riskScore}</b></span>;
}

function Journey({ vendor }: { vendor: any }) {
  const reviewRunning = vendor.documents.some((d: any) => d.status === 'Processing');
  const correctionDoc = vendor.documents.find((d: any) => d.rejection);
  const missingDoc = vendor.documents.find((d: any) => d.status === 'Missing');
  const steps = [
    ['Submitted', vendor.submittedAt ? 'Received' : 'Draft', vendor.submittedAt ? 'done' : 'current'],
    ['AI review', reviewRunning ? 'In progress' : correctionDoc || missingDoc || vendor.verifiedCount === vendor.documents.length ? 'Complete' : 'Waiting', reviewRunning ? 'current' : (correctionDoc || missingDoc || vendor.verifiedCount === vendor.documents.length ? 'done' : 'next')],
    ['Compliance review', correctionDoc || missingDoc ? 'Waiting for your update' : vendor.finalStatus ? 'Complete' : reviewRunning ? 'Queued' : 'In progress', correctionDoc || missingDoc ? 'next' : vendor.finalStatus ? 'done' : (reviewRunning ? 'next' : 'current')],
    ['Final approval', vendor.finalStatus === 'Active' ? 'Activated' : vendor.finalStatus === 'Approved' ? 'Approved' : vendor.finalStatus === 'Rejected' ? 'Rejected' : 'Pending', vendor.finalStatus ? 'current' : 'next'],
  ];
  return <div className="journey">{steps.map(([title, note, state], index) => <div className={state} key={title}><span>{state === 'done' ? <Check size={14} /> : index + 1}</span><section><strong>{title}</strong><small>{note}</small></section></div>)}</div>;
}

function Task({ icon: Icon, urgent, label, tone, badge, title, detail, note, children }: any) {
  return <article className={cx('panel task-card', urgent && 'urgent')}><span className="task-icon"><Icon size={18} /></span><section><header><span className="section-kicker">{label}</span><StatusPill tone={tone}>{badge}</StatusPill></header><h3>{title}</h3><p>{detail}</p><small><FileText size={13} />{note}</small></section>{children}</article>;
}

function Modal({ modal, onClose, onOpenVendor, onViewAsVendor }: any) {
  const { addVendor, addRequest, uploadDocument, uploadNextActionable, respondToRequest, vendors, notify, settings, updateSettings, activeVendorId } = useNexus();
  const cardRef = useRef<HTMLDivElement>(null);
  useDialog(cardRef, onClose);
  const [invited, setInvited] = useState<any>(null);
  const linkVendor = invited || (modal.type === 'invite-link' ? modal.vendor : null);

  const content = useMemo(() => {
    if (linkVendor) return [linkVendor.id, 'Send onboarding link', 'No account is required.', 'Close'];
    if (modal.type === 'vendor') return [modal.vendor.id, modal.vendor.name, `${modal.vendor.country} / ${modal.vendor.category}`, 'Open vendor record'];
    if (modal.type === 'request-detail') return [modal.request.id, modal.request.title, `${modal.request.vendor} / ${modal.request.amount} / Response due ${modal.request.due}`, 'Open request workspace'];
    if (modal.type === 'settings') return ['Workspace', 'Workspace settings', 'Preferences apply immediately.', 'Save settings'];
    if (modal.type === 'document') return [modal.doc.code, modal.doc.title, `${modal.vendor.shortName || modal.vendor.name} / ${modal.doc.status}${modal.doc.fileName ? ` / ${modal.doc.fileName}` : ''}`, modal.doc.status === 'Missing' ? 'Upload this document' : 'Replace this document'];
    if (modal.type === 'invite') return ['Vendor network', 'Create vendor invitation', 'Creates a secure onboarding link for the vendor.', 'Create invitation'];
    if (modal.type === 'contact') return ['Onboarding contact', 'Email Elena Rostova', 'Your onboarding executive. Usually replies within 2 business hours.', 'Send email'];
    if (modal.type === 'request') return ['Procurement', 'Create request', 'Sends a structured request to the selected vendor.', 'Create request'];
    if (modal.type === 'upload') return ['Document vault', 'Upload document', 'The file must show its key identifiers and issue date.', 'Upload and check'];
    if (modal.type === 'quote') return [modal.request.id, 'Prepare your quote', 'Add your price, lead time, MOQ, and delivery terms.', 'Save draft quote'];
    return ['Support', 'Help center', 'Search guides or contact support.', 'Open help center'];
  }, [modal, linkVendor]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (linkVendor) { onClose(); return; }
    if (modal.type === 'settings') {
      updateSettings({ notifications: Boolean(form.get('notifications')), density: form.get('density') });
      onClose(); return;
    }
    if (modal.type === 'document') {
      const file = form.get('file') as File;
      if (!file || !file.name) { notify('Choose a file first.', 'critical'); return; }
      const verdict = await inspectUpload(file);
      uploadDocument(modal.vendor.id, modal.doc.id, file.name, verdict);
      onClose(); return;
    }
    if (modal.type === 'vendor') { onOpenVendor(modal.vendor.id); return; }
    if (modal.type === 'request-detail') { onOpenVendor(modal.request.vendorId); onClose(); return; }
    if (modal.type === 'invite') {
      const vendor = addVendor({
        name: form.get('name') as string, email: form.get('email') as string,
        country: form.get('country') as string, category: form.get('category') as string,
      });
      if (vendor) { setInvited(vendor); return; }
    } else if (modal.type === 'request') {
      addRequest({ title: form.get('title'), vendorId: form.get('vendorId'), due: form.get('due') });
    } else if (modal.type === 'upload') {
      const fileEntry = form.get('file') as File;
      const file = fileEntry?.name
        ? fileEntry
        : (event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement)?.files?.[0] || null;
      if (!file || !file.name) { notify('Choose a file first.', 'critical'); return; }
      const verdict = await inspectUpload(file);
      if (modal.docId) uploadDocument(activeVendorId, modal.docId, file.name, verdict);
      else uploadNextActionable(activeVendorId, file.name, verdict);
    } else if (modal.type === 'quote') {
      respondToRequest(modal.request.id, { status: 'Quote received', tone: 'violet' });
      notify(`Quote submitted for ${modal.request.id}.`);
    } else if (modal.type === 'contact') {
      notify('Email sent to Elena Rostova. She usually replies within 2 business hours.');
    } else {
      notify('Help center opened.');
    }
    onClose();
  };

  if (modal.type === 'assistant') return <VendorAssistant onClose={onClose} />;

  return <div className="modal-backdrop" onMouseDown={onClose}><section
    className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"
    tabIndex={-1} ref={cardRef} onMouseDown={(e) => e.stopPropagation()}
  >
    <header><div><span className="section-kicker">{content[0]}</span><h2 id="modal-title">{content[1]}</h2><p>{content[2]}</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
    <form onSubmit={submit}>
      <div className="modal-body">
        {linkVendor ? <div className="invite-result">
          <div className="modal-summary"><span className="company-avatar large">{linkVendor.initials}</span><span><strong>{linkVendor.name}</strong><small>Invited / awaiting company profile and {linkVendor.documents.length} documents</small></span></div>
          <InviteLink vendor={linkVendor} />
          <button type="button" className="link-row" onClick={() => onViewAsVendor?.(linkVendor.id)}>Preview vendor portal <span><ArrowRight size={14} /></span></button>
        </div>
          : modal.type === 'settings' ? <div className="settings-body">
            <label className="settings-row"><span><strong>Notifications</strong><small>Show status messages. Required actions and errors always remain visible.</small></span><input name="notifications" type="checkbox" defaultChecked={settings.notifications} /></label>
            <label className="form-field"><span>Interface density</span><select name="density" defaultValue={settings.density}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
            <p className="modal-footnote">Preferences remain after refresh and demo reset.</p>
          </div>            : modal.type === 'document' ? <div className="invite-result">
              <div className="modal-summary"><span className={cx('file-icon', modal.doc.status === 'Verified' ? 'green' : modal.doc.status === 'Missing' ? 'red' : 'amber')}><FileText size={19} /></span><span><strong>{modal.doc.status}</strong><small>{modal.doc.fileName || 'No file on record yet'}{modal.doc.pageCount ? ` / ${modal.doc.pageCount} page(s)` : ''}</small></span></div>
              {modal.doc.fields.length > 0 && <dl className="doc-field-list">{modal.doc.fields.slice(0, 6).map((f: any) => <div key={f.key}><dt>{f.label}</dt><dd>{f.value}{f.resolved ? '' : ` / ${f.confidence}% confidence`}</dd></div>)}</dl>}
              <label className="upload-zone"><span><Upload size={22} /></span><strong>{modal.doc.status === 'Missing' ? 'Upload this document' : 'Upload a replacement'}</strong><small>PDF, PNG, or JPG / up to 10 MB</small><input name="file" type="file" /></label>
            </div>
              : modal.type === 'upload' ? <label className="upload-zone"><span><Upload size={22} /></span><strong>Choose a document</strong><small>PDF, PNG, or JPG / up to 10 MB</small><input name="file" type="file" /></label>
            : modal.type === 'contact' ? <><div className="modal-summary"><span className="user-avatar">ER</span><span><strong>Elena Rostova</strong><small>Vendor onboarding executive / elena.rostova@stylesphere.com</small></span></div><Field name="subject" label="Subject" placeholder="e.g. Question about my bank letter" required /><label className="form-field"><span>Message</span><textarea name="message" placeholder="Describe what you need help with. Your application reference is attached automatically." /></label></>
            : modal.type === 'invite' ? <><Field name="name" label="Vendor company" placeholder="e.g. Northstar Materials Ltd." required /><Field name="email" label="Primary contact email" placeholder="vendor@company.com" type="email" /><div className="form-grid"><Field name="country" label="Country (optional)" placeholder="e.g. China" /><Field name="category" label="Supply category (optional)" placeholder="e.g. Hardware & Leather" /></div></>
            : modal.type === 'request' ? <><Field name="title" label="Request title" placeholder="What do you need to procure?" required /><div className="form-grid"><label className="form-field"><span>Vendor</span><select name="vendorId" defaultValue={vendors[0]?.id}>{vendors.map((v: any) => <option key={v.id} value={v.id}>{v.shortName || v.name}</option>)}</select></label><label className="form-field"><span>Response due</span><input name="due" type="date" /></label></div><label className="form-field"><span>Requirements</span><textarea name="requirements" placeholder="Specification, quantity, certifications, delivery terms..." /></label></>
              : modal.type === 'quote' ? <div className="form-grid"><Field name="total" label="Total quote" placeholder="$84,600" /><Field name="leadTime" label="Lead time" placeholder="28 days" /><label className="form-field span-2"><span>Commercial notes</span><textarea name="notes" placeholder="MOQ, Incoterms, validity, and additional notes..." /></label></div>
                : (modal.type === 'vendor' || modal.type === 'request-detail') ? <div className="request-overview"><div className="modal-summary"><span className="company-avatar large">{modal.vendor?.initials || 'SS'}</span><span><strong>{modal.vendor?.stage || modal.request?.status || 'StyleSphere workspace'}</strong><small>{modal.vendor ? `${modal.vendor.progress}% onboarding complete · ${modal.vendor.docs} documents` : `${modal.request.vendor} · ${modal.request.amount}`}</small></span></div>{modal.request && <dl className="request-detail"><div><dt>Request</dt><dd>{modal.request.id}</dd></div><div><dt>Response due</dt><dd>{modal.request.due}</dd></div><div><dt>Status</dt><dd>{modal.request.status}</dd></div><div><dt>Requirements</dt><dd>Specification, quantity, certifications, terms, and delivery.</dd></div></dl>}</div> : <p className="modal-help-copy">Email support@stylesphere.example or open the onboarding guide.</p>}
      </div>
      <footer>
        {!linkVendor && <button type="button" className="button secondary" onClick={onClose}>Cancel</button>}
        {linkVendor && <span className="modal-footnote">The link also appears on this vendor&apos;s row in your directory.</span>}
        <button type="submit" className="button primary">{content[3]} <ArrowRight size={14} /></button></footer>
    </form>
  </section></div>;
}

function Field({ label, placeholder, name, type = 'text', required }: any) {
  return <label className="form-field"><span>{label}</span><input name={name} type={type} placeholder={placeholder} required={required} /></label>;
}

function vendorSituation(vendor: any) {
  const missing = vendor.documents.filter((d: any) => d.status === 'Missing');
  const rejected = vendor.documents.filter((d: any) => d.rejection);
  const processing = vendor.documents.filter((d: any) => d.status === 'Processing');
  const verified = vendor.documents.filter((d: any) => d.status === 'Verified');

  if (!vendor.hasSubmittedApplication) {
    return {
      tone: 'amber',
      stage: 'Not submitted yet',
      summary: `Your application is still a draft. ${missing.length ? `${missing.length} document(s) still needed.` : 'All documents are attached — you can submit whenever you are ready.'}`,
      blocking: missing.length ? `You still need: ${missing.map((d: any) => d.title).join(', ')}.` : 'Nothing is blocking you. Open the wizard and submit.',
    };
  }
  if (rejected.length) {
    return {
      tone: 'red',
      stage: 'Correction requested',
      summary: `A reviewer asked for a replacement of ${rejected.length} document(s).`,
      blocking: rejected.map((d: any) => `${d.title}: ${d.rejection.reason}. ${d.rejection.detail}`).join(' '),
    };
  }
  if (missing.length) {
    return {
      tone: 'red',
      stage: 'Waiting on you',
      summary: `${missing.length} required document(s) have not been supplied.`,
      blocking: `Upload: ${missing.map((d: any) => d.title).join(', ')}.`,
    };
  }
  if (processing.length) {
    return {
      tone: 'blue',
      stage: 'AI verification running',
      summary: `${processing.length} document(s) are being checked right now.`,
      blocking: 'Nothing — this step is automatic and usually finishes within a few minutes.',
    };
  }
  if (vendor.finalStatus === 'Active') {
    return { tone: 'green', stage: 'Active supplier', summary: 'Your supplier record is live in StyleSphere.', blocking: 'Nothing. Onboarding is complete.' };
  }
  if (vendor.finalStatus === 'Approved') {
    return { tone: 'green', stage: 'Approved', summary: 'Review is complete and your application was approved.', blocking: 'Nothing from you. StyleSphere is activating your supplier record.' };
  }
  return {
    tone: 'violet',
    stage: 'Awaiting a human decision',
    summary: `All ${verified.length || vendor.documents.length} documents passed the automated checks. A compliance reviewer now makes the decision.`,
    blocking: 'Nothing from you. Every check that can be automated has run; the remaining step is a person signing off.',
  };
}

function VendorAssistant({ onClose }: { onClose: () => void }) {
  const { getVendor, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const cardRef = useRef<HTMLDivElement>(null);
  useDialog(cardRef, onClose);
  const situation = vendorSituation(vendor);
  const [log, setLog] = useState<{ role: string; lines: string[] }[]>([]);
  const [draft, setDraft] = useState('');

  const answer = (question: string) => {
    const q = question.toLowerCase();
    if (/block|stuck|hold|wrong|reject|problem|issue/.test(q)) return [situation.blocking];
    if (/document|file|upload|missing|need/.test(q)) {
      const missing = vendor.documents.filter((d: any) => d.status === 'Missing');
      const flagged = vendor.documents.filter((d: any) => d.rejection);
      if (!missing.length && !flagged.length) return [`All ${vendor.documents.length} required documents are in. Nothing further is needed from you.`];
      return [
        missing.length ? `Not yet supplied: ${missing.map((d: any) => d.title).join(', ')}.` : null,
        flagged.length ? `Needs replacing: ${flagged.map((d: any) => `${d.title} — ${d.rejection.reason}`).join('; ')}.` : null,
      ].filter(Boolean) as string[];
    }
    if (/how long|when|time|eta|delay|wait/.test(q)) {
      return [
        'Automated checks finish within minutes of submission.',
        'A compliance reviewer then makes the decision, normally within 24-48 hours of the pack being complete. You are notified at each change; you do not need to check back.',
      ];
    }
    if (/who|review|person|human|decide|approv/.test(q)) {
      return ['AI checks your documents for expiry dates, mismatches and missing pages. It never approves or rejects anything. A named compliance reviewer at StyleSphere makes every decision, and Elena Rostova is your contact for anything about it.'];
    }
    if (/progress|status|stage|where/.test(q)) {
      return [`Your application is at: ${situation.stage}.`, situation.summary];
    }
    if (/ai|extract|fill|accur/.test(q)) {
      return ['On the AI-assisted path, your company details were read from the documents you uploaded and you confirmed them before submitting. If something was read wrongly, tell Elena and it can be corrected — the original file is always kept alongside the extracted values.'];
    }
    return [
      `Your application is at: ${situation.stage}. ${situation.summary}`,
      'You can ask about what is blocking you, which documents are outstanding, how long review takes, or who makes the decision. For anything else, email Elena Rostova.',
    ];
  };

  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    setLog((current) => [...current, { role: 'ask', lines: [text] }, { role: 'reply', lines: answer(text) }]);
    setDraft('');
  };

  const suggestions = [
    'Where is my application?',
    'What is blocking me?',
    'Which documents are outstanding?',
    'How long does review take?',
    'Who makes the decision?',
  ];

  return <div className="modal-backdrop" onMouseDown={onClose}><section
    className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"
    tabIndex={-1} ref={cardRef} onMouseDown={(e) => e.stopPropagation()}
  >
    <header>
      <div><span className="section-kicker">Onboarding assistant</span><h2 id="modal-title">Ask a question</h2><p>Answers come from your own application record.</p></div>
      <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
    </header>
    <div className="modal-body">
      <div className="assistant-body">
        <div className="assistant-state">
          <span className={cx('attention-icon', situation.tone)}><Sparkles size={17} /></span>
          <span><strong>{situation.stage}</strong><small>{situation.summary}</small></span>
        </div>

        {log.length > 0 && (
          <div className="assistant-log">
            {log.map((turn, index) => (
              <div className={cx('assistant-turn', turn.role)} key={`${turn.role}-${index}`}>
                {turn.lines.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
              </div>
            ))}
          </div>
        )}

        <div className="assistant-suggestions">
          {suggestions.map((s) => <button type="button" key={s} onClick={() => ask(s)}>{s}</button>)}
        </div>

        <div className="assistant-composer">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); ask(draft); } }}
            placeholder="Ask about your application..."
            aria-label="Ask about your application"
          />
          <button type="button" className="button primary" onClick={() => ask(draft)}>Ask <Send size={14} /></button>
        </div>

        <p className="assistant-note">
          <ShieldCheck size={13} />
          This assistant only reads your application record and cannot approve, reject or change anything. For a decision or an exception, email Elena Rostova.
        </p>
      </div>
    </div>
  </section></div>;
}
