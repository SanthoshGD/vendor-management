import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bell, Bot, BriefcaseBusiness, Building2,
  CalendarClock, Check, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign,
  Clock3, CornerUpLeft, FileCheck2, FileText, FolderKanban, Gauge, Headphones, HelpCircle, Home, Inbox,
  LayoutDashboard, Link2, Lock, Menu, MessageSquareText, PackageCheck, PanelLeftClose,
  PanelLeftOpen, Plus, RefreshCw, Search, Send, Settings, ShieldCheck, ShoppingBag, Sparkles,
  Upload, Users, WalletCards, X, XCircle, Zap,
} from 'lucide-react';
import './RedesignedApp.css';
import {
  NexusProvider, useNexus, STEP_SUBMITTED, inviteUrl, readInviteFromUrl, inspectUpload,
} from './context/AppContext';
import { CURRENT_USERS, REQUEST_TYPES, REQUEST_OUTCOMES } from './data/mockData';
import ReviewWorkspace from './components/ReviewWorkspace';
import AuditTrail from './components/AuditTrail';
import OnboardingWizard, { InviteEmailStep, CreateAccountStep, WizardStepper, allowedStep } from './components/OnboardingWizard';
import AgentConsole from './components/AgentConsole';
import ChaserPanel from './components/ChaserPanel';
import useDialog from './hooks/useDialog';
import { BANDS } from './agents/agentEngine';
import { AGENTS_BY_ID } from './agents/agentCatalog';

// Admin  -  the person who does the work. The order below is the order of the
// job itself: land, pick a vendor, collect their evidence, review it, decide,
// then look back at what was decided. Procurement and the agent console sit
// after the spine because they are reference, not steps.
// Six destinations, not eight. Two came out:
//
//   Procurement  -  a purchase-order surface on a vendor-compliance product. It
//                   was the one page that answered a question nobody opens this
//                   tool to ask, and it made the sidebar read as a suite rather
//                   than a tool.
//   AI review    -  not a destination. You cannot review "a vendor" in the
//                   abstract; you review a specific supplier, which you reach by
//                   opening them from the queue. Listing it in the nav invited a
//                   click that had to guess which vendor you meant. It is still
//                   routable  -  it is just no longer somewhere you navigate to.
const adminNav = [
  ['overview', 'Overview', LayoutDashboard],
  ['vendors', 'Vendor queue', Users],
  ['onboarding', 'Document collection', FolderKanban],
  ['compliance', 'Compliance', ShieldCheck],
  ['agents', 'Agent console', Bot],
  ['activity', 'Audit record', Activity],
];

// Supervisor  -  the person who oversees the work. This is deliberately NOT a
// sequence: a supervisor does not walk a funnel, they triage. Oversight is the
// landing page (KPIs live inside it, they are not a step before it), then the
// two things only they can act on, then the read-only record.
const supervisorNav = [
  ['oversight', 'Oversight', LayoutDashboard],
  ['requests', 'Requests', Inbox],
  ['vendors', 'All vendors', Users],
  ['agents', 'Agent policy', Bot],
  ['activity', 'Audit record', Activity],
];

// A supplier came here to get onboarded, not to run an account. Quotes and a
// message inbox were two more places to wander off the one job they have  -  and
// both duplicated things the action center already says. Four items, each of
// which answers a question the supplier is actually asking.
const vendorNav = [
  ['overview', 'My workspace', Home],
  ['onboarding', 'Onboarding', FolderKanban],
  ['actions', 'Action center', Inbox],
  ['documents', 'Documents', FileCheck2],
];

const pageNamesByPersona = {
  admin: {
    overview: 'Overview',
    vendors: 'Vendor queue',
    onboarding: 'Document collection',
    compliance: 'Compliance',
    'ai-review': 'Review workspace',
    agents: 'Agent console',
    activity: 'Audit record',
  },
  supervisor: {
    oversight: 'Oversight',
    requests: 'Requests',
    vendors: 'All vendors',
    'ai-review': 'Case review',
    agents: 'Agent policy',
    activity: 'Audit record',
  },
  vendor: {
    overview: 'My workspace',
    onboarding: 'Onboarding',
    actions: 'Action center',
    documents: 'Documents',
  },
};

// Which pages each role is allowed to reach. Anything not listed is not just
// hidden from the sidebar  -  the router refuses it, so a stale `page` left over
// from a role switch can never render a screen the current role shouldn't see.
// `ai-review` stays routable for the admin because that is how a supplier is
// opened from the queue - it is simply no longer a nav destination.
const ROLE_PAGES = {
  admin: ['overview', 'vendors', 'onboarding', 'ai-review', 'compliance', 'agents', 'activity'],
  supervisor: ['oversight', 'requests', 'vendors', 'agents', 'activity', 'ai-review'],
  vendor: ['overview', 'onboarding', 'actions', 'documents'],
};

const HOME_PAGE = { admin: 'overview', supervisor: 'oversight', vendor: 'overview' };

const ROLE_LABEL = {
  admin: 'Admin workspace', supervisor: 'Supervisor workspace', vendor: 'Vendor portal',
};

// Where the notification bell's "see everything" link goes for each role.
const BELL_FOOTER = {
  admin: { page: 'activity', label: 'Open audit record' },
  supervisor: { page: 'requests', label: 'Open requests' },
  vendor: { page: 'actions', label: 'Open action center' },
};

const ACTION_META = {
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

const cx = (...items) => items.filter(Boolean).join(' ');

const shortTime = (iso) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// Derives the "needs attention" cards on the customer dashboard directly from
// live vendor/document state, so resolving a finding or missing document in
// the Review Workspace makes the card disappear here too.
function reviewMetricsFor(vendor, assessment) {
  const documents = vendor?.documents || [];
  const fields = documents.flatMap((doc) => doc.fields || []);
  return {
    documentsChecked: documents.filter((doc) => !['Missing', 'Uploaded', 'Processing'].includes(doc.status)).length,
    missing: documents.filter((doc) => doc.status === 'Missing').length,
    fieldsReviewed: fields.length,
    autoCleared: fields.filter((field) => field.resolved && field.confidence >= 90 && !field.humanVerified).length,
    reviewerVerified: fields.filter((field) => field.humanVerified).length,
    openFindings: assessment?.open?.length || 0,
  };
}

function attentionItems(vendors) {
  const items = [];
  for (const vendor of vendors) {
    if (vendor.finalStatus) continue;
    const mismatch = vendor.documents.flatMap((d) => d.fields).find((f) => f.crossDocMismatch && !f.resolved);
    if (mismatch) {
      items.push({ tone: 'red', icon: AlertCircle, title: 'Legal or entity name mismatch', detail: `${vendor.shortName || vendor.name}  /  ${mismatch.label}`, badge: 'High', vendorId: vendor.id, target: 'ai-review' });
      continue;
    }
    if (vendor.missingCount > 0) {
      items.push({ tone: 'amber', icon: Clock3, title: `${vendor.missingCount} document${vendor.missingCount > 1 ? 's' : ''} outstanding`, detail: `${vendor.shortName || vendor.name}  /  ${vendor.sla} SLA left`, badge: vendor.slaHours <= 6 ? 'Due today' : 'Open', vendorId: vendor.id, target: 'onboarding' });
      continue;
    }
    const expiring = vendor.documents.flatMap((d) => d.fields).find((f) => !f.resolved && /expir/i.test(f.diagnostic || ''));
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
  const { toast, settings, activeVendorId, setActiveVendorId, ensureVendorFromInvite, getVendor } = useNexus();
  const [persona, setPersona] = useState('admin');
  const [page, setPage] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(activeVendorId);
  const nav = persona === 'admin' ? adminNav : persona === 'supervisor' ? supervisorNav : vendorNav;
  const invitedRef = useRef(false);

  // A page the current role is not entitled to falls back to that role's home
  // rather than rendering. This is the one place the role boundary is enforced,
  // so it cannot be bypassed by a stray navigate() from a shared component.
  const safePage = ROLE_PAGES[persona].includes(page) ? page : HOME_PAGE[persona];

  // Invite links are resolved once, on first paint. Opening
  // `...#/invite/<payload>` drops the recipient straight into the vendor portal
  // for the vendor that link was issued for  -  creating that vendor locally if
  // this device has never seen them  -  and lands them on step 0 of onboarding.
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

  // Switching into the vendor portal lands on whatever that vendor actually
  // needs to do. A vendor who has not submitted yet has no workspace to look
  // at, so they open on the onboarding wizard rather than an empty dashboard  -
  // which is what makes the earliest steps reachable in one click.
  const switchPersona = (next) => {
    setPersona(next);
    setMobileNav(false);
    if (next === 'vendor') {
      setSelectedVendorId(activeVendorId);
      setPage(getVendor(activeVendorId)?.hasSubmittedApplication ? 'overview' : 'onboarding');
      return;
    }
    setPage(HOME_PAGE[next]);
  };

  // Lets the customer team "view as" any vendor  -  the same screens the vendor
  // sees through their own link, driven by the same record.
  const viewAsVendor = (vendorId) => {
    setActiveVendorId(vendorId);
    setSelectedVendorId(vendorId);
    setPersona('vendor');
    setPage(getVendor(vendorId)?.hasSubmittedApplication ? 'overview' : 'onboarding');
    setModal(null);
    setMobileNav(false);
  };
  const navigate = (next) => {
    setPage(next);
    setMobileNav(false);
  };
  const openVendor = (vendorId, targetPage = 'ai-review') => {
    setActiveVendorId(vendorId);
    setSelectedVendorId(vendorId);
    setPage(targetPage);
    setModal(null);
    setMobileNav(false);
  };

  // The explicit return edge the original diagram was missing: a supervisor who
  // has just handed work back can follow it into the admin's own workspace,
  // rather than the case vanishing into a queue nobody is looking at.
  const openAsAdmin = (vendorId, targetPage = 'ai-review') => {
    setPersona('admin');
    setActiveVendorId(vendorId);
    setSelectedVendorId(vendorId);
    setPage(targetPage);
    setModal(null);
    setMobileNav(false);
  };

  // -------------------------------------------------------------------------
  // The gated onboarding shell.
  //
  // A supplier who has not submitted their application has no workspace to
  // navigate  -  there is nothing in it yet. Showing them a sidebar with "My
  // workspace", "Documents" and "Messages" offers six ways to wander off a
  // four-step form, and every one of them lands on an empty screen. Worse, it
  // implies they already have an account and a relationship; they have neither.
  //
  // So until the application is submitted the entire app is the form. No
  // sidebar, no search, no notifications, no persona switch. The product opens
  // up the moment they finish, which also makes finishing feel like it earned
  // them something.
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
          />
        </main>
      </div>
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      {modal && (
        <Modal modal={modal} onClose={() => setModal(null)} onOpenVendor={openVendor} onViewAsVendor={viewAsVendor} />
      )}
      {toast && <div className="nexus-toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

// The chrome-free wrapper a supplier fills their application inside.
//
// It carries exactly three things: who this is for, how far through they are,
// and reassurance that they can leave and come back. Everything else the app
// can do is deliberately absent  -  there is nothing here to explore, and the
// fastest route to a submitted application is one with no side doors.
//
// The one concession is the role switcher at the bottom. It is prototype
// scaffolding, not product: in a real deployment a supplier reaches this
// through their own emailed link and has no other role to switch to. It is
// styled as a footnote rather than a control so it reads as what it is.
function OnboardingExperience({ vendor, onSwitch, density, children }) {
  // How the supplier arrived, held here rather than inside the wizard, because
  // the shell around them changes with it: the email is full-bleed dark, the
  // account form is a bare centred card, and only the wizard earns a stepper.
  // Keyed by vendor.id at the call site, so switching vendors starts over.
  const [gate, setGate] = useState('invite');
  const { restartOnboarding } = useNexus();
  // Same helper the wizard body uses. Reading `vendor.onboardingStep` here
  // independently is what let the header advertise "step 3 of 4" while the body
  // rendered step 1.
  const step = allowedStep(vendor);
  const inWizard = gate === 'done';

  // Begin the application from the top: step 0, no method chosen, empty
  // evidence pack.
  //
  // THIS RUNS ON SIGN-IN, not just from the header button, and that is the
  // whole point. `onboardingStep` is persisted, so a returning supplier was
  // dropped straight onto Documents with every row already "Uploaded" - past
  // the method choice they had never been offered on this run, with nothing
  // left to interact with. Clearing the pack when a method is picked did not
  // help, because they never reached the screen that picks one.
  //
  // The two gates are session-only and replay on every load, so finishing the
  // account form is the natural start-of-run boundary. Nothing real is lost:
  // "Save draft" is a toast, not persistence - there is no draft to protect.
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

        {/* The stepper is wayfinding, so it sits with the other persistent
            wayfinding rather than on top of the content column, where it used
            to push the screen's actual heading below the fold. */}
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
        <button type="button" className="onboarding-exit" onClick={() => onSwitch('admin')}>
          Prototype: view as the StyleSphere team
        </button>
      </footer>
    </div>
  );
}

// The vendor-side workspace picker. In the customer workspace this is a static
// company lockup; in the vendor portal it is a real switcher, because "which
// vendor am I looking through?" is the question that decides whether you see
// the onboarding wizard or a live supplier dashboard. Vendors who have not
// submitted are listed first and labelled with the exact step they are on, so
// the earliest part of the journey is always one click away.
function WorkspacePicker({ persona, collapsed, onViewAsVendor }) {
  const { vendors, getVendor, activeVendorId } = useNexus();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close);

  if (collapsed) return null;

  if (persona !== 'vendor') {
    return (
      <div className="workspace-picker static">
        <span>SF</span>
        <span><strong>StyleSphere Fashion</strong><small>{ROLE_LABEL[persona]}</small></span>
      </div>
    );
  }

  const active = getVendor(activeVendorId);
  const ordered = [...vendors].sort((a, b) => Number(a.hasSubmittedApplication) - Number(b.hasSubmittedApplication));

  return (
    <div className="workspace-picker-wrap">
      <button className={cx('workspace-picker', open && 'is-open')} onClick={() => setOpen(!open)}>
        <span className="company-avatar">{active?.initials}</span>
        <span>
          <strong>{active?.shortName || active?.name}</strong>
          <small>{active?.hasSubmittedApplication ? 'Vendor workspace' : `Onboarding  /  step ${Math.min((active?.onboardingStep ?? 0) + 1, 4)} of 4`}</small>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="workspace-pop">
          <header>Viewing the portal as</header>
          {ordered.map((vendor) => (
            <button
              key={vendor.id}
              className={cx(vendor.id === activeVendorId && 'active')}
              onClick={() => { close(); onViewAsVendor?.(vendor.id); }}
            >
              <span className="company-avatar">{vendor.initials}</span>
              <span>
                <strong>{vendor.shortName || vendor.name}</strong>
                <small>{ONBOARDING_LABELS[vendor.onboardingStep] || 'Application submitted'}</small>
              </span>
              {vendor.id === activeVendorId && <Check size={14} />}
            </button>
          ))}
          <footer>Vendors still onboarding appear first. Pick one to see exactly what they see.</footer>
        </div>
      )}
    </div>
  );
}

// What a vendor is looking at, by wizard step  -  used wherever onboarding
// progress is described so the customer and vendor sides use the same words.
const ONBOARDING_LABELS = [
  'Invited  /  link not opened yet',
  'Reading the welcome brief',
  'Filling in the company profile',
  'Uploading documents',
  'Application submitted',
];

function Sidebar({ persona, nav, page, collapsed, mobileNav, onNavigate, onCollapse, onClose, onModal, onViewAsVendor }) {
  const { resetDemo, vendors, activeVendorId, getVendor } = useNexus();
  const activeVendor = persona === 'vendor' ? getVendor(activeVendorId) : null;
  const reviewedDocuments = persona === 'vendor'
    ? activeVendor?.verifiedCount || 0
    : vendors.reduce((sum, vendor) => sum + vendor.documents.filter((doc) => doc.status === 'Verified').length, 0);
  const footerAction = persona === 'admin'
    ? ['ai-review', 'Open review']
    : persona === 'supervisor'
      ? ['oversight', 'Open oversight']
      : ['onboarding', 'View application'];
  return (
    <aside className={cx('nexus-sidebar', collapsed && 'collapsed', mobileNav && 'mobile-open')}>
      <div className="sidebar-brand">
        <span className="brand-glyph">S</span>
        {!collapsed && <span><strong>StyleSphere</strong><small>Vendor Nexus</small></span>}
        <button className="mobile-close" aria-label="Close navigation" onClick={onClose}><X size={18} /></button>
      </div>
      <WorkspacePicker persona={persona} collapsed={collapsed} onViewAsVendor={onViewAsVendor} />
      <nav>
        {!collapsed && <label>{persona === 'admin' ? 'Manage' : persona === 'supervisor' ? 'Oversee' : 'Workspace'}</label>}
        {nav.map(([id, title, Icon]) => <button key={id}
          className={cx('sidebar-link', page === id && 'active')} onClick={() => onNavigate(id)}
          title={collapsed ? title : undefined} aria-current={page === id ? 'page' : undefined}>
          <Icon size={18} />{!collapsed && <span>{title}</span>}
        </button>)}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && <div className="ai-savings"><span><Zap size={15} /></span><strong>{reviewedDocuments} documents reviewed</strong><small>Current simulated review state</small><button onClick={() => onNavigate(footerAction[0])}>{footerAction[1]} <ArrowRight size={12} /></button></div>}
        <button className="sidebar-link" onClick={() => onModal({ type: 'help' })}><HelpCircle size={18} />{!collapsed && <span>Help center</span>}</button>
        <button className="sidebar-link" onClick={() => onModal({ type: 'settings' })}><Settings size={18} />{!collapsed && <span>Settings</span>}</button>
        <button className="sidebar-link" onClick={() => { if (window.confirm('Reset all demo data back to its original state?')) resetDemo(); }}>
          <RefreshCw size={18} />{!collapsed && <span>Reset demo data</span>}
        </button>
        <button className="sidebar-link collapse-link" onClick={onCollapse}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}

// Builds the notification feed from live state rather than a canned list, so
// the bell always reflects what is actually outstanding right now. Resolve a
// finding or upload a document and the corresponding notification disappears.
function useNotifications(persona) {
  const {
    vendors, auditLogs, activeVendorId, supervisorRequests, exceptions, pendingApprovals,
  } = useNexus();
  return useMemo(() => {
    // ---------------------------------------------------------------------
    // The supervisor's feed is grouped by what each item DEMANDS, not by what
    // it is or where it came from.
    //
    // A supervisor's question on opening the bell is never "what happened"  -
    // it is "what happens if I close the laptop now". So the three groups are:
    //
    //   Waiting on you    you must decide; nothing moves until you do
    //   Lapsing soon      you already decided, and that decision is expiring
    //   For your awareness you must know, but must not act
    //
    // That third group is the one most products get wrong. Governance events  -
    // a sealed gate refusing an activation, an agent being blocked by policy  -
    // are exactly what a supervisor is accountable for and exactly what they
    // must not "handle". Mixing them into an actionable list invites someone
    // to try to clear them, which is how a control gets quietly worked around.
    // ---------------------------------------------------------------------
    if (persona === 'supervisor') {
      const items = [];
      const now = Date.now();

      // Overdue is split out of "Waiting on you" rather than sorted to the top
      // of it. A broken promise is a different kind of fact from a pending one,
      // and burying it inside a longer list is how it stays broken.
      const open = supervisorRequests.filter((r) => r.status === 'open');
      for (const request of open) {
        const ageHours = Math.round((now - new Date(request.raisedAt).getTime()) / 3600000);
        const breached = ageHours > (request.slaHours || 24);
        const meta = REQUEST_TYPES[request.type] || {};
        items.push({
          id: `req-${request.id}`,
          group: breached ? 'Overdue' : 'Waiting on you',
          tone: breached ? 'red' : meta.tone || 'amber', icon: AlertCircle,
          title: `${meta.label}  /  ${request.vendorShortName}`,
          detail: breached
            ? `${ageHours - request.slaHours}h past its ${request.slaHours}h SLA  /  ${request.raisedBy}`
            : `${ageHours}h old  /  raised by ${request.raisedBy}`,
          page: 'requests', vendorId: request.vendorId,
          sort: breached ? -(ageHours - request.slaHours) : 1,
        });
      }
      for (const approval of pendingApprovals) {
        items.push({
          id: `apr-${approval.id}`, group: 'Waiting on you', tone: 'violet', icon: Bot,
          title: approval.summary || 'An agent action is held for approval',
          detail: `Held by policy  /  ${approval.vendorName || 'Platform'}`,
          page: 'requests', vendorId: approval.vendorId, sort: 2,
        });
      }

      // Things you already decided that are running out of time. An exception
      // that lapses unnoticed leaves a vendor approved on a waiver that no
      // longer holds  -  which is why the lapsed ones lead this group.
      for (const exception of exceptions.filter((e) => e.lapsed || e.lapsingSoon)) {
        items.push({
          id: `exc-${exception.id}`, group: 'Lapsing soon',
          tone: exception.lapsed ? 'red' : 'amber', icon: ShieldCheck,
          title: exception.lapsed
            ? `${exception.vendorShortName}  /  exception lapsed ${Math.abs(exception.daysLeft)}d ago`
            : `${exception.vendorShortName}  /  exception expires in ${exception.daysLeft}d`,
          detail: exception.detail?.control || 'Risk acceptance you granted',
          page: 'requests', vendorId: exception.vendorId, sort: exception.lapsed ? 0 : 1,
        });
      }
      for (const vendor of vendors.filter((v) => v.slaHours <= 6 && !v.finalStatus)) {
        items.push({
          id: `sla-${vendor.id}`, group: 'Lapsing soon', tone: 'amber', icon: Clock3,
          title: `${vendor.shortName || vendor.name}  /  ${vendor.sla} of review SLA left`,
          detail: `${vendor.stage}  /  owned by ${vendor.owner}`,
          page: 'vendors', vendorId: vendor.id, sort: 2,
        });
      }

      // Decisions your reviewers took alone, under their own delegated
      // authority. Nothing here needs doing  -  but this is the spot-check
      // surface a supervisor is accountable for, and if it only existed in the
      // audit trail nobody would ever go and look at it.
      const teamCalls = auditLogs.filter((log) => log.actionType === 'DECISION'
        && log.actorName !== CURRENT_USERS.supervisor.name);
      for (const log of teamCalls.slice(0, 3)) {
        items.push({
          id: `team-${log.id}`, group: "Your team's calls", tone: 'neutral', icon: Users,
          title: `${log.vendorName}  /  ${log.humanValue || log.fieldLabel}`,
          detail: `${log.actorName}  /  ${shortTime(log.timestamp)}`,
          page: 'activity', vendorId: log.vendorId, sort: 0,
        });
      }

      // Vendors that have actually gone live in the ERP supplier master. This
      // is the moment money can move against them, so it is worth its own
      // group rather than being one more line in a general activity feed.
      for (const vendor of vendors.filter((v) => v.finalStatus === 'Active')) {
        items.push({
          id: `live-${vendor.id}`, group: 'Vendors going live', tone: 'green', icon: PackageCheck,
          title: `${vendor.shortName || vendor.name} is active in the ERP`,
          detail: `${vendor.erpId || 'Supplier master'}  /  ${vendor.category}`,
          page: 'vendors', vendorId: vendor.id, sort: 0,
        });
      }

      // Awareness only. These are governance events: the platform refusing
      // something, or a policy being changed by someone else. A supervisor
      // needs to see them; none of them is theirs to clear.
      const awareness = auditLogs.filter((log) => ['GATE_BLOCKED', 'AGENT_BLOCKED', 'AGENT_CONFIG'].includes(log.actionType));
      for (const log of awareness.slice(0, 4)) {
        const [Icon] = ACTION_META[log.actionType] || [Activity];
        items.push({
          id: `gov-${log.id}`, group: 'For your awareness', tone: 'neutral', icon: Icon,
          title: `${log.vendorName}  /  ${log.fieldLabel}`,
          detail: `${log.actorName}  /  ${shortTime(log.timestamp)}`,
          page: 'activity', sort: 3,
        });
      }

      // Group order is the order of obligation: what you have already broken,
      // what you owe, what is expiring, then three groups you only need to
      // know about. Sorting happens inside a group, never across them.
      const order = [
        'Overdue', 'Waiting on you', 'Lapsing soon',
        "Your team's calls", 'Vendors going live', 'For your awareness',
      ];
      return items.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || (a.sort ?? 9) - (b.sort ?? 9));
    }
    if (persona === 'vendor') {
      const vendor = vendors.find((v) => v.id === activeVendorId) || vendors[0];
      if (!vendor) return [];
      const items = [];
      if (!vendor.hasSubmittedApplication) {
        items.push({ id: 'wiz', tone: 'amber', icon: FolderKanban, title: 'Your application is not submitted yet', detail: `Step ${Math.min((vendor.onboardingStep ?? 0) + 1, 4)} of 4  /  pick up where you left off`, page: 'onboarding' });
      }
      for (const doc of vendor.documents.filter((d) => d.status === 'Missing')) {
        items.push({ id: `miss-${doc.id}`, tone: 'red', icon: AlertCircle, title: `${doc.title} is outstanding`, detail: `Requested by ${vendor.owner}  /  ${vendor.sla} SLA left`, page: 'documents' });
      }
      for (const field of vendor.documents.flatMap((d) => d.fields).filter((f) => f.crossDocMismatch && !f.resolved)) {
        items.push({ id: `fix-${field.key}`, tone: 'red', icon: AlertCircle, title: `${field.label} needs correcting`, detail: field.mismatchNote || 'Your reviewer flagged a mismatch across your documents.', page: 'actions' });
      }
      if (vendor.finalStatus === 'Active') {
        items.push({ id: 'active', tone: 'green', icon: CheckCircle2, title: 'You are an approved supplier', detail: `Activated as ${vendor.erpId || 'a supplier record'}.`, page: 'overview' });
      }
      return items;
    }
    const items = attentionItems(vendors).map((item, index) => ({
      id: `att-${index}`, tone: item.tone, icon: item.icon, title: item.title, detail: item.detail,
      page: item.target, vendorId: item.vendorId,
    }));
    for (const vendor of vendors.filter((v) => !v.hasSubmittedApplication)) {
      items.push({ id: `pend-${vendor.id}`, tone: 'blue', icon: Users, title: `${vendor.shortName || vendor.name} has not submitted yet`, detail: 'Their onboarding link is waiting on the vendor directory.', page: 'vendors' });
    }
    for (const log of auditLogs.slice(0, 3)) {
      items.push({ id: log.id, tone: 'neutral', icon: (ACTION_META[log.actionType] || [Activity])[0], title: `${log.vendorName}  /  ${log.fieldLabel}`, detail: `${log.actorName}  /  ${shortTime(log.timestamp)}`, page: 'activity' });
    }
    return items;
  }, [persona, vendors, auditLogs, activeVendorId, supervisorRequests, exceptions, pendingApprovals]);
}

// Searches everything the current persona can actually see, so the search box
// is useful on every page rather than only filtering the vendor table.
function useSearchResults(query, persona) {
  const { vendors, activeVendorId } = useNexus();
  return useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const scope = persona === 'vendor' ? vendors.filter((v) => v.id === activeVendorId) : vendors;
    const results = [];
    for (const vendor of scope) {
      if (persona !== 'vendor' && `${vendor.name} ${vendor.id} ${vendor.country} ${vendor.category} ${vendor.stage}`.toLowerCase().includes(term)) {
        results.push({ id: vendor.id, kind: 'Vendor', icon: Building2, title: vendor.name, detail: `${vendor.country}  /  ${vendor.stage}`, page: 'ai-review', vendorId: vendor.id });
      }
      for (const doc of vendor.documents) {
        if (`${doc.title} ${doc.code} ${doc.fileName || ''} ${doc.status}`.toLowerCase().includes(term)) {
          results.push({ id: doc.id, kind: 'Document', icon: FileText, title: doc.title, detail: `${vendor.shortName || vendor.name}  /  ${doc.status}`, page: persona === 'vendor' ? 'documents' : 'ai-review', vendorId: vendor.id });
        }
      }
    }
    // Procurement requests are no longer a destination, so search no longer
    // offers them - a result that navigates nowhere is worse than no result.
    return results.slice(0, 8);
  }, [query, persona, vendors, activeVendorId]);
}

// Closes a dropdown on outside click and on Escape  -  without this, opening the
// bell and clicking elsewhere would leave it stuck open.
function useDismiss(open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!event.target.closest('.topbar-pop, .topbar-trigger, .global-search, .workspace-pop, .workspace-picker')) close(); };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
}

function Topbar({ persona, page, query, setQuery, onSwitch, onMobile, onHelp, onNavigate, onOpenVendor, onModal }) {
  const { resetDemo, notify, getVendor, activeVendorId, restartOnboarding } = useNexus();
  const [open, setOpen] = useState(null); // 'bell' | 'account' | 'search'
  const notifications = useNotifications(persona);
  const results = useSearchResults(query, persona);
  const searchRef = useRef(null);
  const close = useCallback(() => setOpen(null), []);
  useDismiss(Boolean(open), close);

  // The CmdK / Ctrl-K hint in the search field is now real.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        setOpen('search');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const personaVendor = persona === 'vendor' ? getVendor(activeVendorId) : null;

  // One place that answers "who am I signed in as", so the avatar, the account
  // card and the audit trail can never disagree about it.
  const identity = persona === 'vendor'
    ? {
      initials: personaVendor?.initials || CURRENT_USERS.vendor.initials,
      name: personaVendor?.profile?.contactName || CURRENT_USERS.vendor.name,
      subtitle: `Vendor contact  /  ${personaVendor?.shortName || personaVendor?.name || 'Your company'}`,
    }
    : {
      initials: CURRENT_USERS[persona].initials,
      name: CURRENT_USERS[persona].name,
      subtitle: `${CURRENT_USERS[persona].role}  /  StyleSphere Fashion`,
    };

  const go = (item) => {
    close();
    if (item.vendorId && persona !== 'vendor') onOpenVendor(item.vendorId, item.page);
    else onNavigate(item.page);
  };

  return (
    <header className="nexus-topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMobile}><Menu size={20} /></button>
      <div className="page-context"><small>{ROLE_LABEL[persona]}</small><strong>{pageNamesByPersona[persona][page]}</strong></div>

      <div className="global-search-wrap">
        <label className="global-search">
          <Search size={16} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(e.target.value.trim() ? 'search' : null); }}
            onFocus={() => query.trim() && setOpen('search')}
            aria-label={persona === 'vendor' ? 'Search your documents' : 'Search vendors and documents'}
            placeholder={persona === 'vendor' ? 'Search your documents...' : 'Search vendors and documents...'}
          />
          {query ? <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(''); close(); }}><X size={14} /></button> : <kbd>Ctrl K</kbd>}
        </label>
        {open === 'search' && query.trim().length >= 2 && (
          <div className="topbar-pop search-pop">
            {results.length === 0 && <p className="pop-empty">Nothing matches "{query}".</p>}
            {results.map((item) => (
              <button key={item.kind + item.id} onClick={() => go(item)}>
                <span className="pop-icon"><item.icon size={15} /></span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <em>{item.kind}</em>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="persona-toggle">
        <button className={persona === 'admin' ? 'active' : ''} aria-label="Switch to admin workspace" aria-pressed={persona === 'admin'} onClick={() => onSwitch('admin')}><Building2 size={15} /><span>Admin</span></button>
        <button className={persona === 'supervisor' ? 'active' : ''} aria-label="Switch to supervisor workspace" aria-pressed={persona === 'supervisor'} onClick={() => onSwitch('supervisor')}><ShieldCheck size={15} /><span>Supervisor</span></button>
        <button className={persona === 'vendor' ? 'active' : ''} aria-label="Switch to vendor workspace" aria-pressed={persona === 'vendor'} onClick={() => onSwitch('vendor')}><PackageCheck size={15} /><span>Vendor</span></button>
      </div>

      <button className="topbar-button" onClick={onHelp} aria-label="Contact support"><Headphones size={17} /></button>

      <div className="topbar-menu notification-menu">
        <button
          className={cx('topbar-button notification topbar-trigger', open === 'bell' && 'is-open')}
          aria-label={`Notifications (${notifications.length})`}
          aria-expanded={open === 'bell'}
          onClick={() => setOpen(open === 'bell' ? null : 'bell')}
        >
          <Bell size={17} />{notifications.length > 0 && <i />}
        </button>
        {open === 'bell' && (
          <div className="topbar-pop notification-pop">
            <header><strong>Notifications</strong><span>{notifications.length}</span></header>
            {notifications.length === 0 && <p className="pop-empty">No new notifications.</p>}
            {notifications.map((item, index) => (
              <Fragment key={item.id}>
                {/* Group headers only appear where the feed is genuinely
                    grouped (the supervisor's). Rendering a header per item
                    would be noise on the other roles' chronological feeds. */}
                {item.group && item.group !== notifications[index - 1]?.group && (
                  <p className="pop-group">{item.group}</p>
                )}
                <button onClick={() => go(item)}>
                  <span className={cx('attention-icon', item.tone)}><item.icon size={15} /></span>
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                  <ChevronRight size={14} />
                </button>
              </Fragment>
            ))}
            <footer>
              <button onClick={() => { close(); onNavigate(BELL_FOOTER[persona].page); }}>
                {BELL_FOOTER[persona].label} <ArrowRight size={13} />
              </button>
            </footer>
          </div>
        )}
      </div>

      <div className="topbar-menu account-menu">
        <button
          className={cx('user-avatar topbar-trigger', open === 'account' && 'is-open')}
          aria-label="Account menu"
          aria-expanded={open === 'account'}
          onClick={() => setOpen(open === 'account' ? null : 'account')}
        >
          {identity.initials}
        </button>
        {open === 'account' && (
          <div className="topbar-pop account-pop">
            <header className="account-identity">
              <span className="user-avatar">{identity.initials}</span>
              <span>
                <strong>{identity.name}</strong>
                <small>{identity.subtitle}</small>
              </span>
            </header>
            <button onClick={() => { close(); onModal({ type: 'settings' }); }}><Settings size={15} /> Workspace settings</button>
            {/* Switching is now a three-way choice, so it lists the two roles
                you are not in rather than toggling a binary. */}
            {['admin', 'supervisor', 'vendor'].filter((role) => role !== persona).map((role) => (
              <button key={role} onClick={() => { close(); onSwitch(role); }}>
                {role === 'admin' ? <Building2 size={15} /> : role === 'supervisor' ? <ShieldCheck size={15} /> : <PackageCheck size={15} />}
                Switch to {ROLE_LABEL[role].toLowerCase()}
              </button>
            ))}
            {persona === 'vendor' && personaVendor?.hasSubmittedApplication && (
              <button onClick={() => {
                close();
                if (window.confirm(`Start ${personaVendor.shortName || personaVendor.name}'s onboarding again from step 1? Their profile and uploaded documents will be cleared.`)) {
                  restartOnboarding(personaVendor.id);
                  onNavigate('onboarding');
                }
              }}><FolderKanban size={15} /> Restart onboarding</button>
            )}
            <button onClick={() => { close(); onHelp(); }}><Headphones size={15} /> Contact support</button>
            <button className="danger" onClick={() => { close(); if (window.confirm('Reset all demo data back to its original state?')) resetDemo(); }}>
              <RefreshCw size={15} /> Reset demo data
            </button>
            <footer><button onClick={() => { close(); notify('This prototype keeps you signed in  -  there is no account to sign out of.'); }}>Sign out</button></footer>
          </div>
        )}
      </div>
    </header>
  );
}

function Page({ persona, page, query, selectedVendorId, onNavigate, onModal, onOpenVendor, onViewAsVendor, onOpenAsAdmin }) {
  if (persona === 'vendor') {
    if (page === 'overview') return <VendorDashboard onNavigate={onNavigate} onModal={onModal} />;
    if (page === 'onboarding') return <VendorOnboarding onModal={onModal} onNavigate={onNavigate} />;
    if (page === 'actions') return <VendorActions onModal={onModal} />;
    return <VendorDocuments onModal={onModal} />;
  }

  // --- Supervisor -----------------------------------------------------------
  // Oversight is the landing page, not a step after a dashboard. The KPI strip
  // lives inside it. Everything a supervisor can act on is one page:
  // `requests` carries every kind of supervisor decision plus the held agent
  // actions, because to the supervisor they are the same job  -  "something is
  // waiting on me".
  if (persona === 'supervisor') {
    if (page === 'oversight') return <SupervisorOversight onNavigate={onNavigate} onOpenVendor={onOpenVendor} onOpenAsAdmin={onOpenAsAdmin} />;
    if (page === 'requests') return <SupervisorRequests onOpenVendor={onOpenVendor} onOpenAsAdmin={onOpenAsAdmin} />;
    if (page === 'vendors') return <VendorsPage query={query} onOpenVendor={onOpenVendor} onModal={onModal} onViewAsVendor={onViewAsVendor} readOnly />;
    if (page === 'ai-review') return <ReviewWorkspace vendorId={selectedVendorId} readOnly onBack={() => onNavigate('requests')} onOpenAudit={() => onNavigate('activity')} />;
    if (page === 'agents') return <AgentConsole persona="supervisor" />;
    return <AuditTrail onNavigateVendor={(vendorId) => onOpenVendor(vendorId, 'ai-review')} />;
  }

  // --- Admin ----------------------------------------------------------------
  if (page === 'overview') return <CustomerDashboard onNavigate={onNavigate} onModal={onModal} onOpenVendor={onOpenVendor} />;
  if (page === 'vendors') return <VendorsPage query={query} onOpenVendor={onOpenVendor} onModal={onModal} onViewAsVendor={onViewAsVendor} />;
  if (page === 'onboarding') return <OnboardingPipeline onOpenVendor={onOpenVendor} onModal={onModal} />;
  if (page === 'compliance') return <CompliancePage onNavigate={onNavigate} onOpenVendor={onOpenVendor} />;
  if (page === 'ai-review') {
    return (
      <ReviewWorkspace
        vendorId={selectedVendorId}
        onBack={() => onNavigate('vendors')}
        onOpenAudit={() => onNavigate('activity')}
        onCollectDocuments={() => onNavigate('onboarding')}
        onNextVendor={onOpenVendor}
      />
    );
  }
  if (page === 'agents') return <AgentConsole persona="admin" />;
  return <AuditTrail onNavigateVendor={(vendorId) => onOpenVendor(vendorId, 'ai-review')} />;
}

function CustomerDashboard({ onNavigate, onModal, onOpenVendor }) {
  const { vendors, auditLogs, getTriage, getAssessment, pendingApprovals, agentConfig } = useNexus();

  // Agent impact, computed from the live assessments rather than hardcoded  -  so
  // resolving a finding or ingesting a document moves these numbers.
  const agentImpact = useMemo(() => {
    let checked = 0; let cleared = 0; let human = 0; let chasing = 0;
    for (const vendor of vendors) {
      const a = getAssessment(vendor.id);
      checked += a.stats.checked || 0;
      cleared += a.stats.autoCleared || 0;
      human += a.stats.needsHuman || 0;
      chasing += a.blockers.filter((b) => b.kind === 'missing').length;
    }
    return {
      checked, cleared, human, chasing,
      rate: checked ? Math.round((cleared / checked) * 100) : 0,
      needsHuman: vendors.filter((v) => ['decide', 'blocked'].includes(getTriage(v.id).band)).length,
    };
  }, [vendors, getAssessment, getTriage]);

  const metrics = [
    ['Needs a human today', String(agentImpact.needsHuman), `${vendors.filter((v) => !v.finalStatus).length} applications in progress`, Users, 'blue'],
    ['Documents reviewed', String(vendors.reduce((sum, vendor) => sum + vendor.verifiedCount, 0)), `${vendors.reduce((sum, vendor) => sum + vendor.documents.filter((doc) => doc.status === 'Processing').length, 0)} processing now`, CalendarClock, 'green'],
    ['Documents being chased', String(agentImpact.chasing), 'No team action needed', MessageSquareText, 'amber'],
    ['Agent configuration', `v${agentConfig.version}`, `${agentConfig.agents.filter((a) => a.enabled).length} of ${agentConfig.agents.length} agents active`, Bot, 'violet'],
  ];
  const attention = attentionItems(vendors);
  const recent = auditLogs.slice(0, 3);

  return (
    <div className="nexus-page">
      <PageHero eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })} title="Overview"
        description="Decisions waiting on your team.">
        <button className="button secondary" onClick={() => onModal({ type: 'invite' })}><Plus size={15} /> Invite vendor</button>
        <button className="button primary" onClick={() => onModal({ type: 'request' })}><ShoppingBag size={15} /> Create request</button>
      </PageHero>
      <section className="metric-grid">
        {metrics.map(([label, value, note, Icon, tone]) => <article className="metric-card" key={label}>
          <span className={cx('metric-icon', tone)}><Icon size={18} /></span>
          <span><small>{label}</small><strong>{value}</strong><em>{note}</em></span>
        </article>)}
      </section>
      <section className="dashboard-grid">
        <article className="panel onboarding-panel">
          <PanelHeading eyebrow={`${vendors.filter((v) => !v.finalStatus).length} in progress`} title="Onboarding progress" action="View pipeline" onAction={() => onNavigate('onboarding')} />
          <div className="portfolio-stats">
            <span><strong>{vendors.filter((v) => !v.finalStatus).length}</strong><small>In progress</small></span>
            <span><strong>{vendors.filter((v) => v.missingCount > 0).length}</strong><small>Need action</small></span>
            <span><strong>{vendors.filter((v) => v.status === 'Ready').length}</strong><small>Ready this week</small></span>
            <span><strong>{vendors.filter((v) => v.finalStatus).length}</strong><small>Decided</small></span>
          </div>
          <div className="stage-bar"><i /><i /><i /><i /><i /></div>
          <div className="stage-labels"><span>Invited</span><span>Documents</span><span>Review</span><span>Approval</span><span>Activation</span></div>
          <div className="vendor-rows">{vendors.slice(0, 3).map((vendor) => <button key={vendor.id} onClick={() => onOpenVendor(vendor.id)}><VendorIdentity vendor={vendor} /><span><strong>{vendor.stage}</strong><small>{vendor.docs} documents  /  {vendor.sla} SLA</small></span><Progress value={vendor.progress} /><ChevronRight size={16} /></button>)}</div>
        </article>
        <article className="panel attention-panel">
          <PanelHeading eyebrow="Priority queue" title="Needs attention" action="Open queue" onAction={() => onNavigate('ai-review')} />
          <div className="attention-list">
            {attention.length === 0 && <p className="attention-empty"><CheckCircle2 size={16} /> No items need attention.</p>}
            {attention.map((item) => (
              <Attention key={item.vendorId + item.title} tone={item.tone} icon={item.icon} title={item.title} detail={item.detail} badge={item.badge} onClick={() => onOpenVendor(item.vendorId, item.target)} />
            ))}
          </div>
          <div className="ai-impact">
            <span><Bot size={20} /></span>
            <div>
              <small>Agent activity</small>
              <strong>{agentImpact.checked} checks across the portfolio</strong>
              <em>{agentImpact.rate}% auto-cleared  /  {agentImpact.human} routed to a human  /  {agentImpact.chasing} documents being chased</em>
            </div>
          </div>
          {pendingApprovals.length > 0 && (
            <button className="approval-nudge" onClick={() => onNavigate('agents')}>
              <ShieldCheck size={15} />
              <span><strong>{pendingApprovals.length} agent action{pendingApprovals.length > 1 ? 's' : ''} held for your approval</strong>
                <small>Human-in-the-loop gate  /  review in the Agent console</small></span>
              <ChevronRight size={15} />
            </button>
          )}
        </article>
        <article className="panel activity-snapshot">
          <PanelHeading eyebrow="Live workspace" title="Recent activity" action="View audit" onAction={() => onNavigate('activity')} />
          <div className="mini-activity">{recent.map((log) => {
            const [Icon, tone] = ACTION_META[log.actionType] || [Sparkles, 'blue'];
            return <div key={log.id}><span className={cx('activity-icon', tone)}><Icon size={14} /></span><span><strong>{log.vendorName}</strong><small>{log.fieldLabel}{log.documentName ? `  /  ${log.documentName}` : ''}</small></span><time>{shortTime(log.timestamp)}</time></div>;
          })}</div>
        </article>
      </section>
    </div>
  );
}

function VendorDashboard({ onNavigate, onModal }) {
  const { getVendor, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const correctionDoc = vendor.documents.find((d) => d.rejection);
  const missingDoc = vendor.documents.find((d) => d.status === 'Missing');
  const reviewRunning = vendor.documents.some((d) => d.status === 'Processing');
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
            : 'Review is complete and waiting for a human decision.';
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
            {/* The hero's second action is "help me understand this", not
                "go to another page". A supplier reading a status headline
                wants it explained, and the assistant answers from this
                vendor's own record. */}
            <button className="button ghost-white" onClick={() => onModal({ type: 'assistant' })}><Sparkles size={15} /> Ask a question</button>
          </div>
        </div>
        <div className="readiness-ring" style={{ background: `conic-gradient(#5dd2a5 0 ${vendor.progress}%, #ffffff16 ${vendor.progress}%)` }}><strong>{vendor.progress}%</strong><span>{ringLabel}</span></div>
      </section>
      {/* The third tile used to count open procurement requests  -  a sourcing
          metric on a screen a supplier opens to ask "what is happening to my
          application?". It now answers that question instead. */}
      <section className="vendor-metrics">
        {[
          [CheckCircle2, 'green', `${vendor.verifiedCount}/${vendor.documents.length}`, 'Documents reviewed'],
          [Inbox, actionRequired ? 'amber' : 'green', `${openActionCount} action${openActionCount === 1 ? '' : 's'}`, 'Needs your attention'],
          [Clock3, 'blue', stageLabel, 'Current stage'],
        ].map(([Icon, tone, value, label]) => <article key={label}><span className={cx('metric-icon', tone)}><Icon size={18} /></span><span><strong>{value}</strong><small>{label}</small></span></article>)}
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
        {/* Two ways to get unstuck, in the order a supplier should try them:
            the assistant answers "what is happening to me" instantly from the
            record, and email reaches a person when a decision or an exception
            is actually needed. */}
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
        <article className="panel ai-explainer"><span className="ai-orb"><Sparkles size={22} /></span><div><span className="section-kicker">Review method</span><h3>AI checks; a person decides</h3><p>AI checks dates and mismatches. A compliance reviewer makes the decision.</p><button onClick={() => onNavigate('onboarding')}>View review status <ArrowRight size={13} /></button></div></article>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 1  -  the worklist.
//
// The change that matters is the sort order. A date-sorted table of 47 vendors
// makes triage the reviewer's first job every morning; a table banded by "what
// needs a human" makes triage the machine's job and hands the reviewer six
// rows. That reordering *is* the AI feature  -  no new model, just the agents'
// assessment used as the organising principle instead of decoration.
//
// Each row says what the agents last did and what they are waiting on, so a
// vendor sitting in "agents working" needs no click to be understood.
// ---------------------------------------------------------------------------
function WorklistRow({ vendor, triage, onOpenVendor }) {
  const { getCaseOwner } = useNexus();
  const agent = triage.agentId ? AGENTS_BY_ID[triage.agentId] : null;
  // The queue has to agree with the workspace about who owns the case. A row
  // that still reads "waiting on your judgement" for something already sent up
  // is how a reviewer ends up chasing a decision that is not theirs.
  const ownership = getCaseOwner(vendor.id);
  return (
    <button className="worklist-row" onClick={() => onOpenVendor(vendor.id)}>
      <VendorIdentity vendor={vendor} />
      <span className="worklist-headline">
        <strong>{ownership.decisionAway
          ? `With ${ownership.ownerName} - ${(REQUEST_TYPES[ownership.request.type] || {}).label || 'sent up'}`
          : triage.headline}</strong>
        <small>
          {ownership.decisionAway ? (
            `${ownership.request.id}  /  the decision is not yours on this one`
          ) : (
            <>
              {agent && <><span className={cx('agent-glyph', 'mini', agent.tone)}>{agent.glyph}</span> {agent.name}  /  </>}
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

// `readOnly` is how one page serves two roles instead of being duplicated. A
// supervisor sees the same worklist the admin works from  -  same data, same
// bands, same ordering  -  but without the actions that belong to the person
// doing the work. Building a second "supervisor vendor list" would have meant
// two things to keep in sync and two places for them to disagree.
function VendorsPage({ query, onOpenVendor, onModal, onViewAsVendor, readOnly = false }) {
  const { vendors, getTriage, getAssessment, runAgentPass, notify } = useNexus();
  const [filter, setFilter] = useState('all');
  const awaitingVendor = vendors.filter((v) => !v.hasSubmittedApplication);
  const filtered = vendors.filter((vendor) => {
    const matchesQuery = `${vendor.name} ${vendor.country} ${vendor.category}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filter === 'onboarding') return !vendor.finalStatus;
    if (filter === 'active') return vendor.finalStatus === 'Active' || vendor.finalStatus === 'Approved';
    if (filter === 'risk') return vendor.risk === 'High';
    return true;
  });
  const counts = {
    all: vendors.length,
    onboarding: vendors.filter((v) => !v.finalStatus).length,
    active: vendors.filter((v) => v.finalStatus === 'Active' || v.finalStatus === 'Approved').length,
    risk: vendors.filter((v) => v.risk === 'High').length,
  };

  const banded = BANDS.map(([id, title, blurb]) => [
    id, title, blurb,
    filtered.filter((v) => getTriage(v.id).band === id),
  ]);
  const needsHuman = banded.filter(([id]) => id === 'decide' || id === 'blocked')
    .reduce((sum, [, , , rows]) => sum + rows.length, 0);

  return <div className="nexus-page">
    <PageHero
      eyebrow={`${vendors.length} suppliers in this workspace  /  ${needsHuman} need a human`}
      title={readOnly ? 'All vendors' : 'Vendor queue'}
      description={readOnly
        ? 'Read-only, prioritized by human action and SLA.'
        : 'Prioritized by human action, then SLA.'}
    >
      {!readOnly && <>
        <button
          className="button secondary"
          onClick={() => {
            const open = vendors.filter((vendor) => !vendor.finalStatus);
            const outcomes = open.map((vendor) => runAgentPass(vendor.id));
            const queued = outcomes.filter((outcome) => outcome?.queued).length;
            const duplicates = outcomes.filter((outcome) => outcome?.duplicate).length;
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
      {banded.map(([id, title, blurb, rows]) => {
        if (!rows.length) return null;
        return (
          <div className={cx('worklist-band', id)} key={id}>
            <header>
              <span className="band-dot" />
              <div><strong>{title}</strong><small>{blurb}</small></div>
              <b>{rows.length}</b>
            </header>
            <div className="worklist-rows">
              {rows.map((vendor) => (
                <WorklistRow key={vendor.id} vendor={vendor} triage={getTriage(vendor.id)} onOpenVendor={onOpenVendor} />
              ))}
            </div>
            {id === 'working' && (
              <p className="band-footnote">
                {rows.reduce((sum, v) => sum + getAssessment(v.id).blockers.filter((b) => b.kind === 'missing').length, 0)} documents
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
          {awaitingVendor.map((vendor) => (
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
      {filtered.map((vendor) => <button className="vendor-table table-row" key={vendor.id} onClick={() => onOpenVendor(vendor.id)}><VendorIdentity vendor={vendor} /><span><StatusPill tone={vendor.status === 'Blocked' ? 'red' : vendor.status === 'Ready' || vendor.status === 'Approved' ? 'green' : 'blue'}>{vendor.stage}</StatusPill><Progress value={vendor.progress} /></span><span><strong>{vendor.docs}</strong><small>Documents</small></span><RiskPill vendor={vendor} /><span>{vendor.owner}</span><span className={vendor.slaHours <= 6 ? 'urgent' : ''}>{vendor.sla}</span><ChevronRight size={16} /></button>)}
    </section>
  </div>;
}

// ---------------------------------------------------------------------------
// SUPERVISOR  -  Oversight (the landing page)
//
// The original flow put a KPI dashboard *before* an oversight landing page.
// That is backwards: a dashboard is a panel, not a destination you pass
// through. Here oversight IS the landing page and the KPI strip sits inside it,
// above the only two things a supervisor can actually act on.
//
// Every number on this page is a link. A metric a supervisor cannot follow into
// the work behind it is decoration.
// ---------------------------------------------------------------------------
function SupervisorOversight({ onNavigate, onOpenVendor, onOpenAsAdmin }) {
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
    const open = supervisorRequests.filter((r) => r.status === 'open');
    const breached = open.filter((r) => (Date.now() - new Date(r.raisedAt).getTime()) / 3600000 > (r.slaHours || 24));
    return {
      open: open.length,
      breached: breached.length,
      approvals: pendingApprovals.length,
      liveExceptions: exceptions.filter((e) => !e.lapsed).length,
      lapsed: exceptions.filter((e) => e.lapsed).length,
      slaAtRisk: vendors.filter((v) => v.slaHours <= 6 && !v.finalStatus).length,
      needsHuman: vendors.filter((v) => ['decide', 'blocked'].includes(getTriage(v.id).band)).length,
      assistRate: checked ? Math.round((autoCleared / checked) * 100) : 0,
    };
  }, [vendors, supervisorRequests, exceptions, pendingApprovals, getAssessment, getTriage]);

  const openRequests = supervisorRequests.filter((r) => r.status === 'open');
  const returned = vendors.filter((v) => v.supervisorNote);

  // Four numbers, chosen because each one is a different kind of exposure:
  // work you owe an answer to, work you have already answered but which is
  // still live on your signature, work your team may miss, and how much of the
  // whole operation is running without a human at all.
  const kpis = [
    {
      label: stats.breached ? `Waiting on you  /  ${stats.breached} past SLA` : 'Waiting on you',
      value: stats.open, tone: stats.breached ? 'red' : stats.open ? 'amber' : 'green',
      icon: Inbox, page: 'requests',
    },
    {
      label: stats.lapsed ? `Live exceptions  /  ${stats.lapsed} lapsed` : 'Live exceptions on your signature',
      value: stats.liveExceptions + stats.lapsed, tone: stats.lapsed ? 'red' : 'violet',
      icon: ShieldCheck, page: 'requests',
    },
    { label: 'SLA at risk across the team', value: stats.slaAtRisk, tone: stats.slaAtRisk ? 'amber' : 'green', icon: Clock3, page: 'vendors' },
    { label: 'AI-assist rate', value: `${stats.assistRate}%`, tone: 'blue', icon: Gauge, page: 'agents' },
  ];

  return <div className="nexus-page supervisor-overview-page">
    <PageHero
      eyebrow={`${CURRENT_USERS.supervisor.name}  /  ${CURRENT_USERS.supervisor.role}`}
      title="Oversight"
      description="Your decisions, active exceptions, and team risk."
    >
      <button className="button primary" onClick={() => onNavigate('requests')}>
        <Inbox size={15} /> Open requests ({stats.open + stats.approvals})
      </button>
    </PageHero>

    {/* Every KPI is a button. A number a supervisor cannot follow into the
        work behind it is decoration, so there are no inert metrics here. */}
    <section className="metric-grid">
      {kpis.map((kpi) => (
        <button className="metric-card is-link" key={kpi.label} onClick={() => onNavigate(kpi.page)}>
          <span className={cx('metric-icon', kpi.tone)}><kpi.icon size={18} /></span>
          <span><strong>{kpi.value}</strong><em>{kpi.label}</em></span>
          <ChevronRight size={16} />
        </button>
      ))}
    </section>

    {/* Work this supervisor has already handed back. Without this the RETURN
        outcome would be fire-and-forget  -  you would have no way to see whether
        the thing you sent back was ever picked up. */}
    {returned.length > 0 && (
      <section className="panel">
        <PanelHeading eyebrow="Handed back" title={`${returned.length} case${returned.length > 1 ? 's' : ''} returned to an admin`} />
        <div className="awaiting-list">
          {returned.map((vendor) => (
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
          {openRequests.slice(0, 4).map((request) => {
            const meta = REQUEST_TYPES[request.type] || {};
            return (
              <button key={request.id} onClick={() => onNavigate('requests')}>
                <span className={cx('attention-icon', meta.tone)}><AlertCircle size={15} /></span>
                <span><strong>{request.vendorShortName}  /  {meta.label}</strong><small>{request.title}</small></span>
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
          {auditLogs.slice(0, 5).map((log) => {
            const [Icon, tone] = ACTION_META[log.actionType] || [Activity, 'neutral'];
            return (
              <button key={log.id} onClick={() => onOpenVendor(log.vendorId, 'ai-review')}>
                <span className={cx('attention-icon', tone)}><Icon size={15} /></span>
                <span><strong>{log.vendorName}  /  {log.fieldLabel}</strong><small>{log.actorName}  /  {shortTime(log.timestamp)}</small></span>
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

// ---------------------------------------------------------------------------
// SUPERVISOR  -  Requests
//
// One queue for every kind of decision that needs this person's authority.
// The five kinds are defined in REQUEST_TYPES (see mockData for why each one
// belongs to a supervisor rather than a reviewer); this page's only job is to
// put the evidence for each decision on screen next to the decision itself.
//
// Two things drive the design:
//
// 1. A supervisor answers requests they did not raise, about vendors they have
//    not read. So every card carries its own evidence  -  the control being
//    waived, the threshold that fired, the config diff, the monitoring hit  -
//    rather than a summary plus a link to go and find out. If a decision can
//    only be made by leaving the page, the page has failed.
//
// 2. The queue is ordered by SLA breach, then by age. Not by type, and not by
//    when it arrived. A supervisor's failure mode is not missing a request,
//    it is answering the wrong one first.
//
// There is no "mark as read". Acknowledging a request is not resolving it, and
// a queue that can be emptied without deciding anything is a queue that will be.// ---------------------------------------------------------------------------
// SUPERVISOR  -  Requests
//
// One queue for every kind of decision that needs this person's authority.
// The five kinds are defined in REQUEST_TYPES (see mockData for why each one
// belongs to a supervisor rather than a reviewer); this page's job is to put
// the evidence for each decision on screen next to the decision itself, and to
// stay usable whether two things are waiting or twenty.
//
// The design problem here is density. A supervisor's queue is not a steady
// four items  -  it is empty on Friday and sixteen deep on Monday, and a layout
// that only reads well at one of those is not finished. So:
//
//    /  Below the density threshold, every request is an open card with its full
//     evidence visible. Nothing to click, because there is room.
//    /  Above it, requests collapse to rows and you expand the one you are
//     working. Sixteen full cards is a wall nobody reads.
//    /  Grouping is a lens, not a mode: flat is SLA-ordered (answer the most
//     overdue thing first), by type batches like-for-like decisions, by vendor
//     pulls one supplier's three requests together so you judge them once.
//    /  Selection enables bulk, but only for outcomes every selected type shares,
//     and never for granting an exception  -  each of those needs its own expiry.
//
// The generator is a demo affordance, deliberately visible: you cannot tell
// whether this page survives a backlog by looking at a fixture of four.
// ---------------------------------------------------------------------------

// At three open requests the queue starts as compact rows. One request can be
// expanded without pushing the rest of the supervisor's priorities below it.
const DENSITY_THRESHOLD = 3;

function SupervisorRequests({ onOpenVendor, onOpenAsAdmin }) {
  const {
    supervisorRequests, exceptions, pendingApprovals, resolveRequest, resolveManyRequests,
    resolveApproval, simulateInboundRequest, getVendor,
  } = useNexus();

  const [filter, setFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none');
  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [acting, setActing] = useState(null);   // single: { request, outcome }
  const [bulkOutcome, setBulkOutcome] = useState(null);
  const [note, setNote] = useState('');
  const [expiry, setExpiry] = useState('');

  const open = supervisorRequests.filter((r) => r.status === 'open');
  const closed = supervisorRequests.filter((r) => r.status === 'resolved');

  // Age and breach are computed per render rather than stored, so a request
  // that goes past its SLA while the page is open starts reading as breached.
  const withAge = useMemo(() => open.map((r) => {
    const ageHours = Math.max(0, Math.round((Date.now() - new Date(r.raisedAt).getTime()) / 3600000));
    return { ...r, ageHours, breached: ageHours > (r.slaHours || 24) };
  }).sort((a, b) => Number(b.breached) - Number(a.breached) || b.ageHours - a.ageHours), [open]);

  const counts = useMemo(() => {
    const byType = {};
    for (const r of withAge) byType[r.type] = (byType[r.type] || 0) + 1;
    return byType;
  }, [withAge]);

  const visible = filter === 'all' ? withAge : withAge.filter((r) => r.type === filter);
  const breachedCount = withAge.filter((r) => r.breached).length;
  const liveExceptions = exceptions.filter((e) => !e.lapsed);
  const lapsed = exceptions.filter((e) => e.lapsed);

  // Density is automatic, with a manual override  -  the page should do the right
  // thing unattended, but a supervisor who wants everything open can say so.
  const [densityOverride, setDensityOverride] = useState(null);
  const dense = densityOverride ?? (visible.length >= DENSITY_THRESHOLD);

  // Grouping. `none` keeps the SLA order, which is the safest default because
  // it answers "what is most overdue" without the supervisor choosing anything.
  const groups = useMemo(() => {
    if (groupBy === 'none') return [['', visible]];
    if (groupBy === 'type') {
      return Object.entries(REQUEST_TYPES)
        .map(([id, meta]) => [meta.label, visible.filter((r) => r.type === id)])
        .filter(([, rows]) => rows.length);
    }
    const byVendor = new Map();
    for (const request of visible) {
      const key = request.vendorShortName || 'Platform';
      if (!byVendor.has(key)) byVendor.set(key, []);
      byVendor.get(key).push(request);
    }
    // Vendors carrying the most requests first  -  that concentration is itself
    // a signal worth surfacing.
    return [...byVendor.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [visible, groupBy]);

  const toggleExpanded = (id) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelected = (id) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectedRequests = withAge.filter((r) => selected.has(r.id));

  // Only outcomes that every selected request's type supports. This is the
  // governance rule made structural: you cannot bulk-suspend a policy change,
  // because SUSPEND is not in POLICY_CHANGE's outcome list and the intersection
  // simply will not contain it.
  //
  // GRANT is withheld from bulk on purpose  -  every exception needs its own
  // expiry date and compensating control, so waiving five things on one date
  // would defeat the type.
  const sharedOutcomes = useMemo(() => {
    if (!selectedRequests.length) return [];
    const lists = selectedRequests.map((r) => REQUEST_TYPES[r.type]?.outcomes || []);
    return lists.reduce((acc, list) => acc.filter((o) => list.includes(o)))
      .filter((o) => o !== 'GRANT');
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
      eyebrow={`${withAge.length} open  /  ${breachedCount} past SLA  /  ${pendingApprovals.length} agent action${pendingApprovals.length === 1 ? '' : 's'} held`}
      title="Requests"
      description="Ordered by SLA breach, then age."
    >
      {/* Visible on purpose. A queue design has to be judged under load, and a
          fixed fixture of four never shows you that. */}
      <button className="button secondary" onClick={simulateInboundRequest}>
        <Plus size={15} /> Simulate request
      </button>
    </PageHero>

    {/* Type filter. Counts are on the chips because "how much of each kind is
        waiting" is itself the answer to a supervisor's first question. */}
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

    {/* View controls sit under the filter, not in it: filtering changes WHAT
        you are looking at, these change HOW. Conflating them is why toolbars
        become unreadable. */}
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
          onClick={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((r) => r.id)))}
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
      {groups.map(([label, rows]) => (
        <Fragment key={label || 'all'}>
          {label && (
            <header className="queue-group-head">
              <strong>{label}</strong>
              <span>{rows.length}</span>
              {/* Concentration is a finding in itself: three requests against
                  one supplier is a different conversation from three against
                  three, and the grouped view is where that becomes visible. */}
              {groupBy === 'vendor' && rows.length > 1 && <em>{rows.length} decisions on one supplier</em>}
            </header>
          )}
          {rows.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              vendor={request.vendorId ? getVendor(request.vendorId) : null}
              dense={dense && !expanded.has(request.id)}
              selected={selected.has(request.id)}
              onSelect={() => toggleSelected(request.id)}
              onToggle={() => toggleExpanded(request.id)}
              onOpenVendor={onOpenVendor}
              onAct={(outcome) => {
                setActing({ request, outcome });
                setNote('');
                setExpiry(request.detail?.proposedExpiry ? request.detail.proposedExpiry.slice(0, 10) : '');
              }}
            />
          ))}
        </Fragment>
      ))}
    </section>

    {/* Agent actions sit below the human requests deliberately. They are
        higher-volume and lower-stakes: deciding one is a governed proposal review,
        not a risk decision, and should not compete for the same attention. */}
    <section className="panel">
      <PanelHeading eyebrow="Held by policy" title="Agent proposals" />
      {pendingApprovals.length === 0 && <div className="table-empty">No agent action is waiting on a human.</div>}
      <div className="approval-list">
        {pendingApprovals.map((item) => (
          <div className="approval-row" key={item.id}>
            <span className="attention-icon violet"><Bot size={15} /></span>
            <span><strong>{item.summary || item.actionId}</strong><small>{item.vendorName || 'Platform'}  /  {item.agentName || item.agentId}</small></span>
            <button className="button secondary compact" onClick={() => resolveApproval(item.id, 'decline', 'Declined by supervisor.')}>Decline</button>
            <button className="button primary compact" onClick={() => resolveApproval(item.id, 'accept', 'Accepted by supervisor.')}>{item.agentId === 'compliance' ? 'Approve recommendation' : 'Accept proposal'}</button>
          </div>
        ))}
      </div>
    </section>

    {/* Live exceptions are the supervisor's standing liability: vendors that
        are only approved because this person signed a waiver. Showing them
        here, with a countdown, is what stops an exception becoming permanent
        by nobody ever looking at it again. */}
    {(liveExceptions.length > 0 || lapsed.length > 0) && (
      <section className="panel">
        <PanelHeading
          eyebrow="Granted by you"
          title={`${liveExceptions.length + lapsed.length} risk acceptance${liveExceptions.length + lapsed.length === 1 ? '' : 's'} on the book`}
        />
        <div className="exception-list">
          {[...lapsed, ...liveExceptions].map((exception) => (
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
          {closed.slice(0, 6).map((request) => {
            const meta = REQUEST_OUTCOMES[request.outcome] || {};
            const tone = meta.tone === 'danger' ? 'red' : meta.tone === 'secondary' ? 'amber' : 'green';
            return (
              <button key={request.id} onClick={() => request.vendorId && onOpenVendor(request.vendorId, 'ai-review')}>
                <span className={cx('attention-icon', tone)}>
                  {tone === 'red' ? <XCircle size={15} /> : tone === 'amber' ? <CornerUpLeft size={15} /> : <CheckCircle2 size={15} />}
                </span>
                <span><strong>{request.vendorShortName}  /  {meta.audit || request.outcome}</strong><small>{request.supervisorNote || ' - '}</small></span>
                <em>{shortTime(request.resolvedAt)}</em>
              </button>
            );
          })}
        </div>
      </section>
    )}

    {/* Sticky bulk bar. Only appears when something is selected, and only
        offers outcomes every selected type actually supports. */}
    {selected.size > 0 && (
      <div className="bulk-bar">
        <strong>{selected.size} selected</strong>
        <span className="bulk-detail">
          {sharedOutcomes.length === 0
            ? 'These types share no common outcome  -  narrow the selection.'
            : `${new Set(selectedRequests.map((r) => r.type)).size} type(s)  /  one rationale, recorded against each`}
        </span>
        {sharedOutcomes.map((outcome) => {
          const meta = REQUEST_OUTCOMES[outcome] || {};
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

// What each request type wants shown as its evidence row. Declared per type so
// a card never renders an empty " - " for a field that does not apply to it.
const REQUEST_DETAIL_FIELDS = {
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

function RequestCard({ request, vendor, dense, selected, onSelect, onToggle, onOpenVendor, onAct }) {
  const meta = REQUEST_TYPES[request.type] || {};
  const fields = REQUEST_DETAIL_FIELDS[request.type] || [];

  // Compact mode keeps identity, type, age and one action affordance  -  enough
  // to triage  -  and hides the evidence until asked for. The row stays a real
  // summary rather than a truncated card.
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
            : `${request.ageHours}h old  /  ${request.slaHours}h SLA`}
        </span>
        <button className="icon-button compact" onClick={onToggle} aria-label="Collapse">
          <ChevronDown size={16} />
        </button>
      </header>

      <h3 className="request-title">{request.title}</h3>
      <p className="request-reason">"{request.reason}"</p>

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
        {/* Outcomes come from the type, so a monitoring alert can never offer
            "hand back to the reviewer" and a policy change can never offer
            "suspend the vendor". */}
        {(meta.outcomes || []).map((outcome) => {
          const oMeta = REQUEST_OUTCOMES[outcome] || {};
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

function RequestDialog({ request, outcome, note, onNote, expiry, onExpiry, onCancel, onConfirm }) {
  const cardRef = useRef(null);
  useDialog(cardRef, onCancel, { autoFocus: false });
  const meta = REQUEST_OUTCOMES[outcome] || {};
  // An exception with no end date is the thing this whole request type exists
  // to prevent, so the date is required rather than defaulted silently.
  const needsExpiry = Boolean(meta.needsExpiry);
  const ready = note.trim() && (!needsExpiry || expiry);

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal-card" role="dialog" aria-modal="true" aria-labelledby="request-dialog-title"
        tabIndex={-1} ref={cardRef} onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-kicker">{request.id}  /  {request.vendorShortName}</span>
            <h2 id="request-dialog-title">{meta.label}</h2>
            <p>{meta.copy}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          {needsExpiry && (
            <label className="form-field">
              <span>Expiry date (required  -  the exception lapses on this date)</span>
              <input type="date" value={expiry} onChange={(event) => onExpiry(event.target.value)} />
            </label>
          )}
          <label className="form-field">
            <span>{outcome === 'RETURN'
              ? 'What do you need the reviewer to do? (required)'
              : 'Rationale (required  -  written to the audit trail)'}</span>
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

// Bulk confirmation. It lists exactly what is about to be decided, because
// "Reject 6" with no manifest is how someone rejects the wrong five.
function BulkDialog({ outcome, count, requests, note, onNote, onCancel, onConfirm }) {
  const cardRef = useRef(null);
  useDialog(cardRef, onCancel, { autoFocus: false });
  const meta = REQUEST_OUTCOMES[outcome] || {};

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal-card" role="dialog" aria-modal="true" aria-labelledby="bulk-dialog-title"
        tabIndex={-1} ref={cardRef} onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-kicker">{count} requests</span>
            <h2 id="bulk-dialog-title">{meta.label}  /  {count} requests</h2>
            <p>{meta.copy}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          <ul className="bulk-manifest">
            {requests.map((request) => (
              <li key={request.id}>
                <span className={cx('request-type', (REQUEST_TYPES[request.type] || {}).tone)}>
                  {(REQUEST_TYPES[request.type] || {}).label}
                </span>
                <strong>{request.vendorShortName}</strong>
                <small>{request.title}</small>
              </li>
            ))}
          </ul>
          <label className="form-field">
            <span>Rationale (required  -  recorded against every one of these)</span>
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

const PIPELINE_COLUMNS = [
  ['Invited', ['Invited']],
  ['Vendor action', ['Vendor action']],
  ['Verification', ['AI verification', 'Compliance review']],
  ['Approval', ['Ready to approve', 'With supervisor', 'Approved']],
  ['Activated', ['Active', 'Rejected']],
];

function OnboardingPipeline({ onOpenVendor, onModal }) {
  const { vendors } = useNexus();
  return <div className="nexus-page wide">
    <PageHero eyebrow={`${vendors.filter((vendor) => !vendor.finalStatus).length} applications in progress`} title="Document collection" description="Grouped by onboarding stage and next action."><button className="button primary" onClick={() => onModal({ type: 'invite' })}><Plus size={15} /> Invite vendor</button></PageHero>
    <section className="pipeline">
      {PIPELINE_COLUMNS.map(([title, stages]) => {
        const cards = vendors.filter((v) => stages.includes(v.stage));
        return (
          <div className="pipeline-column" key={title}>
            <header><span><i />{title}</span><strong>{cards.length}</strong></header>
            {cards.map((vendor) => <button className="pipeline-card" key={vendor.id} onClick={() => onOpenVendor(vendor.id)}><VendorIdentity vendor={vendor} /><div><span>{vendor.id}</span><span className={vendor.slaHours <= 6 ? 'urgent' : ''}><Clock3 size={12} /> {vendor.sla}</span></div><Progress value={vendor.progress} /><footer><RiskPill vendor={vendor} /><span>{vendor.docs} docs</span></footer></button>)}
            <button className="pipeline-add" onClick={() => onModal({ type: 'invite' })}><Plus size={14} /> Add vendor</button>
          </div>
        );
      })}
    </section>
  </div>;
}

function ProcurementPage({ onModal }) {
  const { requests } = useNexus();
  const totals = {
    draft: requests.filter((r) => r.status === 'Draft').length,
    awaiting: requests.filter((r) => r.status === 'Vendor reviewing').length,
    approving: requests.filter((r) => r.status === 'Quote received').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
  };
  return <div className="nexus-page">
    <PageHero eyebrow={`${requests.length} requests in this workspace`} title="Procurement requests" description="Vendor responses and approval status."><button className="button primary" onClick={() => onModal({ type: 'request' })}><Plus size={15} /> Create request</button></PageHero>
    <section className="summary-metrics">{[['Draft', String(totals.draft), 'Not yet sent'], ['Vendor reviewing', String(totals.awaiting), 'Awaiting response'], ['Quote received', String(totals.approving), 'Ready to approve'], ['Approved', String(totals.approved), 'Committed']].map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="panel table-panel"><RequestTable items={requests} onClick={(request) => onModal({ type: 'request-detail', request })} /></section>
  </div>;
}

// Builds a real CSV export from live state and hands it to the browser as a
// download. Uses a Blob + object URL so it works from a local file:// document
// as well as from a server.
function downloadComplianceReport(vendors, auditLogs) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
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

function CompliancePage({ onNavigate, onOpenVendor }) {
  const { vendors, auditLogs, notify } = useNexus();
  const coverage = (codes) => {
    const documents = vendors.flatMap((vendor) => vendor.documents).filter((doc) => codes.includes(doc.code));
    const verified = documents.filter((doc) => doc.status === 'Verified').length;
    return { value: documents.length ? `${Math.round((verified / documents.length) * 100)}%` : 'N/A', detail: `${verified} of ${documents.length} verified` };
  };
  const identityCoverage = coverage(['TAX', 'IEC', 'REG', 'LICENSE']);
  const financialCoverage = coverage(['TAX', 'BANK']);
  const socialCoverage = coverage(['AUDIT']);
  const productCoverage = coverage(['REACH', 'ISO17075', 'SAFETY', 'MATERIAL', 'FSC', 'QUALITY']);
  const controls = [
    [Building2, 'green', 'Business identity', identityCoverage.value, identityCoverage.detail],
    [WalletCards, 'amber', 'Tax & financial', financialCoverage.value, financialCoverage.detail],
    [Users, 'violet', 'Social responsibility', socialCoverage.value, socialCoverage.detail],
    [ShieldCheck, 'blue', 'Product & environmental', productCoverage.value, productCoverage.detail],
  ]; const expiring = vendors.flatMap((v) => v.documents.flatMap((d) => d.fields.map((f) => ({ ...f, vendor: v, doc: d }))))
    .filter((f) => !f.resolved && /expir/i.test(f.diagnostic || ''));
  return <div className="nexus-page">
    <PageHero eyebrow="Portfolio health" title="Compliance" description="Coverage, exceptions, and expiring evidence."><button className="button secondary" onClick={() => { downloadComplianceReport(vendors, auditLogs); notify(`Compliance report exported  -  ${vendors.length} vendors, ${auditLogs.length} audit entries.`); }}>Export compliance report</button></PageHero>
    <section className="compliance-grid">{controls.map(([Icon, tone, title, value, note]) => <article className="panel compliance-card" key={title}><span className={cx('metric-icon', tone)}><Icon size={18} /></span><span><small>{title}</small><strong>{value}</strong><em>{note}</em><Progress value={Number(value.slice(0, -1))} /></span></article>)}</section>
    <section className="compliance-layout">
      <article className="panel expiry-panel"><PanelHeading eyebrow="Upcoming risk" title="Expiring evidence" action="Review all" onAction={() => onNavigate('ai-review')} />
        {expiring.length === 0 && <p className="attention-empty">No evidence expires soon.</p>}
        {expiring.map((f) => <button key={f.key + f.vendor.id} onClick={() => onOpenVendor(f.vendor.id)}><span className={cx('file-icon', 'red')}><FileText size={17} /></span><span><strong>{f.doc.title}</strong><small>{f.vendor.shortName || f.vendor.name}</small></span><em>{f.diagnostic}</em><ChevronRight size={15} /></button>)}
      </article>
      <article className="panel human-control"><span className="control-graphic"><Sparkles size={24} /><i><ShieldCheck size={16} /></i></span><span className="section-kicker">AI-assisted, human-controlled</span><h3>Every automated check has evidence.</h3><p>AI extracts and compares. Your team resolves exceptions and owns the approval.</p><div><span><Check size={13} /> Source linked</span><span><Check size={13} /> Confidence shown</span><span><Check size={13} /> Decision logged</span></div><button className="button secondary full" onClick={() => onNavigate('ai-review')}>Open AI review workspace</button></article>
    </section>
  </div>;
}

function VendorOnboarding({ onModal, onNavigate }) {
  const { getVendor, getAssessment, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const assessment = getAssessment(activeVendorId);
  const reviewMetrics = reviewMetricsFor(vendor, assessment);

  if (!vendor.hasSubmittedApplication) {
    return <OnboardingWizard key={vendor.id} vendor={vendor} onFinish={() => onNavigate?.('overview')} />;
  }

  const processing = vendor.documents.some((d) => d.status === 'Processing');
  const correctionDoc = vendor.documents.find((d) => d.rejection);
  const missingDoc = vendor.documents.find((d) => d.status === 'Missing');
  const profileComplete = Boolean(vendor.profile) || vendor.onboardingStep >= STEP_SUBMITTED;
  const reviewCleared = vendor.verifiedCount === vendor.documents.length && !processing && !correctionDoc && !missingDoc;
  const steps = [
    {
      title: 'Company profile',
      status: profileComplete ? 'Complete' : 'Incomplete',
      detail: vendor.profile
        ? `${vendor.profile.legalName}  /  ${vendor.profile.country || 'Country not stated'}  /  Tax ID ${vendor.profile.taxId || 'not supplied'}.`
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

function VendorActions({ onModal }) {
  const { getVendor, getThreads, requests, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const correctionDoc = vendor.documents.find((d) => d.rejection);
  const missingDoc = vendor.documents.find((d) => d.status === 'Missing');
  const actionDoc = correctionDoc || missingDoc;
  const actionThread = actionDoc ? getThreads(activeVendorId).find((thread) => thread.docId === actionDoc.id) : null;
  const myOpenRequest = requests.find((r) => r.vendorId === activeVendorId && r.status !== 'Approved');
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

function VendorDocuments({ onModal }) {
  const { getVendor, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  return <div className="nexus-page"><PageHero eyebrow={`${vendor.verifiedCount}/${vendor.documents.length} reviewed`} title="Documents" description="Submitted files and replacement requests."><button className="button primary" onClick={() => onModal({ type: 'upload' })}><Upload size={15} /> Upload document</button></PageHero><section className="document-grid">
    {vendor.documents.map((doc) => {
      const tone = doc.status === 'Verified' ? 'green' : doc.status === 'Missing' ? 'red' : doc.status === 'Processing' || doc.status === 'Uploaded' ? 'blue' : 'amber';
      return <article className="panel document-card" key={doc.id}><header><span className={cx('file-icon', tone)}><FileText size={19} /></span><button aria-label={`Open ${doc.title}`} onClick={() => onModal({ type: 'document', doc, vendor })}>...</button></header><strong>{doc.title}</strong><small>{doc.rejection?.reason || doc.fileName || 'Not yet received'}</small><StatusPill tone={tone}>{doc.status}</StatusPill>{doc.status !== 'Verified' && doc.status !== 'Processing' && <button onClick={() => onModal({ type: 'upload', docId: doc.id })}>{doc.status === 'Missing' ? 'Upload now' : doc.status === 'Flagged' ? 'Upload correction' : 'Replace file'} <ArrowRight size={13} /></button>}</article>;
    })}
  </section></div>;
}

function VendorRequests({ onModal }) {
  const { requests, activeVendorId } = useNexus();
  const mine = requests.filter((r) => r.vendorId === activeVendorId);
  return <div className="nexus-page"><PageHero eyebrow={`${mine.length} request${mine.length === 1 ? '' : 's'} from StyleSphere`} title="Requests" description="Quotes and customer decisions." /><section className="request-grid">
    {mine.length === 0 && <p className="attention-empty">No procurement requests yet.</p>}
    {mine.map((request) => <article className="panel vendor-request-card" key={request.id}><header><span>{request.id}</span><StatusPill tone={request.tone}>{request.status}</StatusPill></header><h3>{request.title}</h3><p>Product specification and delivery terms are available in the request.</p><div><span><small>Estimated value</small><strong>{request.amount}</strong></span><span><small>Response due</small><strong>{request.due}</strong></span></div>{request.status === 'Draft' || request.status === 'Vendor reviewing' ? <button className="button primary full" onClick={() => onModal({ type: 'quote', request })}>Prepare quote <ArrowRight size={14} /></button> : <button className="button secondary full" onClick={() => onModal({ type: 'request-detail', request })}>View request</button>}</article>)}
  </section></div>;
}

// A working, stateful inbox. Conversations, unread counts, search, and the
// composer are all real: sending a message appends it to the thread, clears
// the field, marks the thread read, and scrolls the transcript.
const SEED_CONVERSATIONS = [
  {
    id: 'elena', initials: 'ER', name: 'Elena Rostova', role: 'Vendor onboarding executive',
    online: true, unread: 2,
    messages: [
      { from: 'them', text: 'Hi Chen  -  your licence and REACH certificate are through. We still need the ISO 17075 chromium VI test for the calfskin before we can approve you.', at: '4:18 PM' },
      { from: 'me', text: 'Understood. Our lab issues the chromium VI report per hide batch  -  will a report covering the current calfskin lot be enough?', at: '4:22 PM' },
      { from: 'them', text: "Yes  -  batch-level is fine, as long as the lab accreditation and the test date are visible. I've added the exact requirements to your Action center.", at: '4:24 PM' },
    ],
  },
  {
    id: 'priya', initials: 'PS', name: 'Priya Shah', role: 'Sourcing manager',
    online: false, unread: 1,
    messages: [
      { from: 'them', text: 'We are shortlisting ateliers for the autumn handbag hardware programme  -  cast brass clasps and feet. Shall I include you?', at: '11:02 AM' },
    ],
  },
  {
    id: 'aarav', initials: 'AM', name: 'Aarav Mehta', role: 'Supplier relations',
    online: false, unread: 0,
    messages: [
      { from: 'them', text: 'Your onboarding tasks are in the Action center. Contact us if anything is unclear.', at: 'Yesterday' },
    ],
  },
];

function MessagesPage() {
  const { notify } = useNexus();
  const [conversations, setConversations] = useState(SEED_CONVERSATIONS);
  const [activeId, setActiveId] = useState(SEED_CONVERSATIONS[0].id);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const bodyRef = useRef(null);

  const active = conversations.find((c) => c.id === activeId) || conversations[0];
  const visible = conversations.filter((c) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${c.name} ${c.role} ${c.messages.map((m) => m.text).join(' ')}`.toLowerCase().includes(term);
  });

  // Keep the newest message in view whenever the thread changes or grows.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [activeId, active?.messages.length]);

  const openConversation = (id) => {
    setActiveId(id);
    setConversations((current) => current.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const at = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setConversations((current) => current.map((c) => (c.id === activeId
      ? { ...c, messages: [...c.messages, { from: 'me', text, at }], unread: 0 }
      : c)));
    setDraft('');
    notify(`Message sent to ${active.name}.`);
  };

  const startConversation = () => {
    const name = window.prompt('Who would you like to message?', 'StyleSphere support');
    if (!name?.trim()) return;
    const id = `c-${Date.now().toString(36)}`;
    const initials = name.trim().split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    setConversations((current) => [{ id, initials, name: name.trim(), role: 'New conversation', online: false, unread: 0, messages: [] }, ...current]);
    setActiveId(id);
    notify(`Conversation with ${name.trim()} started.`);
  };

  const lastLine = (conversation) => conversation.messages[conversation.messages.length - 1]?.text || 'No messages yet';

  return <div className="messages-shell">
    <aside className="conversation-list">
      <header><strong>Messages</strong><button aria-label="New conversation" onClick={startConversation}><Plus size={15} /></button></header>
      <label><Search size={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" /></label>
      {visible.length === 0 && <p className="attention-empty">No conversations match "{search}".</p>}
      {visible.map((conversation) => (
        <button className={conversation.id === activeId ? 'active' : ''} key={conversation.id} onClick={() => openConversation(conversation.id)}>
          <span className="user-avatar">{conversation.initials}</span>
          <span><strong>{conversation.name}</strong><small>{lastLine(conversation)}</small></span>
          <time>{conversation.messages[conversation.messages.length - 1]?.at || ''}{conversation.unread > 0 && <i />}</time>
        </button>
      ))}
    </aside>

    <section className="conversation">
      <header>
        <span className="user-avatar">{active.initials}</span>
        <span><strong>{active.name}</strong><small>{active.online && <i />} {active.online ? 'Online' : 'Offline'}  /  {active.role}</small></span>
        <button aria-label="Conversation help" onClick={() => notify(`${active.name} usually replies within 2 business hours.`)}><HelpCircle size={17} /></button>
      </header>
      <div className="chat-body" ref={bodyRef}>
        <div>Today</div>
        {active.messages.length === 0 && <p className="attention-empty">No messages. Start a conversation.</p>}
        {active.messages.map((message, index) => (
          <article className={cx('message', message.from === 'me' ? 'sent' : 'received')} key={`${message.at}-${index}`}>
            <p>{message.text}</p><span>{message.at}</span>
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={send}>
        <button type="button" aria-label="Attach a file" onClick={() => notify('Attachments open from your document vault in the full product.')}><Plus size={17} /></button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message..." />
        <button type="submit" className="send" aria-label="Send message" disabled={!draft.trim()}><Send size={16} /></button>
      </form>
    </section>

    <aside className="conversation-context">
      <span className="section-kicker">Related record</span>
      <div><span className="file-icon amber"><FileText size={17} /></span><span><strong>ISO 17075 leather test</strong><small>Outstanding  -  requested by your reviewer</small></span></div>
      <span className="section-kicker">Participants</span>
      {[[active.initials, active.name, active.role], ['CW', 'You', 'Export manager']].map(([initials, name, role]) => (
        <div key={name}><span className="user-avatar">{initials}</span><span><strong>{name}</strong><small>{role}</small></span></div>
      ))}
    </aside>
  </div>;
}

// Shown on any vendor-side screen that has nothing to display yet because the
// vendor is still partway through the wizard.
function ResumeOnboarding({ vendor, onNavigate }) {
  const step = vendor.onboardingStep ?? 0;
  const labels = ['getting started', 'your company profile', 'your documents', 'your final review'];
  return (
    <section className="panel wizard-card wizard-resume">
      <span className="wizard-badge"><Clock3 size={15} /> Application {vendor.id}  /  in progress</span>
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

// The shareable artefact at the centre of this flow: a link the customer sends
// and the vendor opens to start onboarding from a cold start.
function InviteLink({ vendor, compact }) {
  const { notify } = useNexus();
  const url = useMemo(() => inviteUrl(vendor), [vendor]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API is unavailable on insecure/file:// origins in some
      // browsers  -  fall back to selecting the text so the user can copy it.
      const field = document.getElementById(`invite-url-${vendor.id}`);
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

function PageHero({ eyebrow, title, description, children }) {
  return <section className="page-hero"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="page-actions">{children}</div>}</section>;
}

function PanelHeading({ eyebrow, title, action, onAction }) {
  return <header className="panel-heading"><div><span className="section-kicker">{eyebrow}</span><h2>{title}</h2></div>{action && <button onClick={onAction}>{action} <ArrowRight size={13} /></button>}</header>;
}

function Attention({ tone, icon: Icon, title, detail, badge, onClick }) {
  return <button onClick={onClick}><span className={cx('attention-icon', tone)}><Icon size={16} /></span><span><strong>{title}</strong><small>{detail}</small></span><em>{badge}</em><ChevronRight size={15} /></button>;
}

function VendorIdentity({ vendor }) {
  return <span className="vendor-identity"><span className="company-avatar">{vendor.initials}</span><span><strong>{vendor.name}</strong><small>{vendor.country}  /  {vendor.category}</small></span></span>;
}

function Progress({ value }) {
  return <span className="progress"><i style={{ width: `${value}%` }} /></span>;
}

function StatusPill({ tone = 'neutral', children }) {
  const toneMap = { Verified: 'green', Missing: 'red', Uploaded: 'blue', Processing: 'blue', Flagged: 'red', 'Needs Review': 'amber' };
  const label = children === 'Uploaded' ? 'Submitted' : children;
  return <span className={cx('status-pill', toneMap[children] || tone)}>{label}</span>;
}

function RiskPill({ vendor }) {
  const tone = vendor.risk === 'High' ? 'red' : vendor.risk === 'Medium' ? 'amber' : 'green';
  return <span className={cx('risk-pill', tone)}><i />{vendor.risk} <b>{vendor.riskScore}</b></span>;
}

function RequestTable({ items, compact, onClick = () => { } }) {
  return <div className={cx('request-table', compact && 'compact')}><div className="table-head"><span>Request</span><span>Vendor</span><span>Value</span><span>Due</span><span>Status</span>{!compact && <span />}</div>
    {items.length === 0 && <div className="table-empty">No requests yet.</div>}
    {items.map((request) => <button className="table-row" key={request.id} onClick={() => onClick(request)}><span><strong>{request.title}</strong><small>{request.id}</small></span><span>{request.vendor}</span><span className="money">{request.amount}</span><span>{request.due}</span><StatusPill tone={request.tone}>{request.status}</StatusPill>{!compact && <ChevronRight size={16} />}</button>)}</div>;
}

function Journey({ vendor }) {
  const reviewRunning = vendor.documents.some((d) => d.status === 'Processing');
  const correctionDoc = vendor.documents.find((d) => d.rejection);
  const missingDoc = vendor.documents.find((d) => d.status === 'Missing');
  const steps = [
    ['Submitted', vendor.submittedAt ? 'Received' : 'Draft', vendor.submittedAt ? 'done' : 'current'],
    ['AI review', reviewRunning ? 'In progress' : correctionDoc || missingDoc || vendor.verifiedCount === vendor.documents.length ? 'Complete' : 'Waiting', reviewRunning ? 'current' : (correctionDoc || missingDoc || vendor.verifiedCount === vendor.documents.length ? 'done' : 'next')],
    ['Compliance review', correctionDoc || missingDoc ? 'Waiting for your update' : vendor.finalStatus ? 'Complete' : reviewRunning ? 'Queued' : 'In progress', correctionDoc || missingDoc ? 'next' : vendor.finalStatus ? 'done' : (reviewRunning ? 'next' : 'current')],
    ['Final approval', vendor.finalStatus === 'Active' ? 'Activated' : vendor.finalStatus === 'Approved' ? 'Approved' : vendor.finalStatus === 'Rejected' ? 'Rejected' : 'Pending', vendor.finalStatus ? 'current' : 'next'],
  ];
  return <div className="journey">{steps.map(([title, note, state], index) => <div className={state} key={title}><span>{state === 'done' ? <Check size={14} /> : index + 1}</span><section><strong>{title}</strong><small>{note}</small></section></div>)}</div>;
}

function Task({ icon: Icon, urgent, label, tone, badge, title, detail, note, children }) {
  return <article className={cx('panel task-card', urgent && 'urgent')}><span className="task-icon"><Icon size={18} /></span><section><header><span className="section-kicker">{label}</span><StatusPill tone={tone}>{badge}</StatusPill></header><h3>{title}</h3><p>{detail}</p><small><FileText size={13} />{note}</small></section>{children}</article>;
}

function Modal({ modal, onClose, onOpenVendor, onViewAsVendor }) {
  const { addVendor, addRequest, uploadDocument, uploadNextActionable, respondToRequest, vendors, notify, settings, updateSettings, activeVendorId } = useNexus();
  const cardRef = useRef(null);
  useDialog(cardRef, onClose);
  // Holds the vendor just created by the invite form so the modal can switch
  // from "send an invitation" to "here is the link you send them" in place.
  const [invited, setInvited] = useState(null);
  // The vendor whose onboarding link this modal should display  -  either one
  // just created by the invite form, or one opened from the vendor directory.
  const linkVendor = invited || (modal.type === 'invite-link' ? modal.vendor : null);

  const content = useMemo(() => {
    if (linkVendor) return [linkVendor.id, 'Send onboarding link', 'No account is required.', 'Close'];
    if (modal.type === 'vendor') return [modal.vendor.id, modal.vendor.name, `${modal.vendor.country}  /  ${modal.vendor.category}`, 'Open vendor record'];
    if (modal.type === 'request-detail') return [modal.request.id, modal.request.title, `${modal.request.vendor}  /  ${modal.request.amount}  /  Response due ${modal.request.due}`, 'Open request workspace'];
    if (modal.type === 'settings') return ['Workspace', 'Workspace settings', 'Preferences apply immediately.', 'Save settings'];
    if (modal.type === 'document') return [modal.doc.code, modal.doc.title, `${modal.vendor.shortName || modal.vendor.name}  /  ${modal.doc.status}${modal.doc.fileName ? `  /  ${modal.doc.fileName}` : ''}`, modal.doc.status === 'Missing' ? 'Upload this document' : 'Replace this document'];
    if (modal.type === 'invite') return ['Vendor network', 'Create vendor invitation', 'Creates a secure onboarding link for the vendor.', 'Create invitation'];
    if (modal.type === 'contact') return ['Onboarding contact', 'Email Elena Rostova', 'Your onboarding executive. Usually replies within 2 business hours.', 'Send email'];
    if (modal.type === 'request') return ['Procurement', 'Create request', 'Sends a structured request to the selected vendor.', 'Create request'];
    if (modal.type === 'upload') return ['Document vault', 'Upload document', 'The file must show its key identifiers and issue date.', 'Upload and check'];
    if (modal.type === 'quote') return [modal.request.id, 'Prepare your quote', 'Add your price, lead time, MOQ, and delivery terms.', 'Save draft quote'];
    return ['Support', 'Help center', 'Search guides or contact support.', 'Open help center'];
  }, [modal, linkVendor]);

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (linkVendor) { onClose(); return; }
    if (modal.type === 'settings') {
      updateSettings({ notifications: Boolean(form.get('notifications')), density: form.get('density') });
      onClose(); return;
    }
    if (modal.type === 'document') {
      const file = form.get('file');
      if (!file || !file.name) { notify('Choose a file first.', 'critical'); return; }
      const verdict = await inspectUpload(file);
      uploadDocument(modal.vendor.id, modal.doc.id, file.name, verdict);
      onClose(); return;
    }
    if (modal.type === 'vendor') { onOpenVendor(modal.vendor.id); return; }
    if (modal.type === 'request-detail') { onOpenVendor(modal.request.vendorId); onClose(); return; }
    if (modal.type === 'invite') {
      const vendor = addVendor({
        name: form.get('name'), email: form.get('email'),
        country: form.get('country'), category: form.get('category'),
      });
      if (vendor) { setInvited(vendor); return; }
    } else if (modal.type === 'request') {
      addRequest({ title: form.get('title'), vendorId: form.get('vendorId'), due: form.get('due') });
    } else if (modal.type === 'upload') {
      // Read the FormData entry, but fall back to the input element's own file
      // list. FormData is populated from the control's internal value, which a
      // programmatically-assigned `files` property does not always update - so
      // the fallback is what makes this path drivable outside a real click,
      // and it costs nothing when the entry is already there.
      const file = form.get('file')?.name
        ? form.get('file')
        : (event.currentTarget.querySelector('input[type="file"]')?.files?.[0] || null);
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

  // The assistant is a conversation, not a form that submits once, so it owns
  // its own card rather than being bent into the shared header/body/footer
  // shape. Placed after every hook above, so the hook order never changes.
  if (modal.type === 'assistant') return <VendorAssistant onClose={onClose} />;

  return <div className="modal-backdrop" onMouseDown={onClose}><section
    className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"
    tabIndex={-1} ref={cardRef} onMouseDown={(e) => e.stopPropagation()}
  >
    <header><div><span className="section-kicker">{content[0]}</span><h2 id="modal-title">{content[1]}</h2><p>{content[2]}</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
    <form onSubmit={submit}>
      <div className="modal-body">
        {linkVendor ? <div className="invite-result">
          <div className="modal-summary"><span className="company-avatar large">{linkVendor.initials}</span><span><strong>{linkVendor.name}</strong><small>Invited  /  awaiting company profile and {linkVendor.documents.length} documents</small></span></div>
          <InviteLink vendor={linkVendor} />
          <button type="button" className="link-row" onClick={() => onViewAsVendor?.(linkVendor.id)}>Preview vendor portal <span><ArrowRight size={14} /></span></button>
        </div>
          : modal.type === 'settings' ? <div className="settings-body">
            <label className="settings-row"><span><strong>Notifications</strong><small>Show status messages. Required actions and errors always remain visible.</small></span><input name="notifications" type="checkbox" defaultChecked={settings.notifications} /></label>
            <label className="form-field"><span>Interface density</span><select name="density" defaultValue={settings.density}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
            <p className="modal-footnote">Preferences remain after refresh and demo reset.</p>
          </div> : modal.type === 'document' ? <div className="invite-result">
            <div className="modal-summary"><span className={cx('file-icon', modal.doc.status === 'Verified' ? 'green' : modal.doc.status === 'Missing' ? 'red' : 'amber')}><FileText size={19} /></span><span><strong>{modal.doc.status}</strong><small>{modal.doc.fileName || 'No file on record yet'}{modal.doc.pageCount ? `  /  ${modal.doc.pageCount} page(s)` : ''}</small></span></div>
            {modal.doc.fields.length > 0 && <dl className="doc-field-list">{modal.doc.fields.slice(0, 6).map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{f.value}{f.resolved ? '' : `  /  ${f.confidence}% confidence`}</dd></div>)}</dl>}
            <label className="upload-zone"><span><Upload size={22} /></span><strong>{modal.doc.status === 'Missing' ? 'Upload this document' : 'Upload a replacement'}</strong><small>PDF, PNG, or JPG  /  up to 10 MB</small><input name="file" type="file" /></label>
          </div>
            : modal.type === 'upload' ? <label className="upload-zone"><span><Upload size={22} /></span><strong>Choose a document</strong><small>PDF, PNG, or JPG  /  up to 10 MB</small><input name="file" type="file" /></label>
              : modal.type === 'contact' ? <><div className="modal-summary"><span className="user-avatar">ER</span><span><strong>Elena Rostova</strong><small>Vendor onboarding executive  /  elena.rostova@stylesphere.com</small></span></div><Field name="subject" label="Subject" placeholder="e.g. Question about my bank letter" required /><label className="form-field"><span>Message</span><textarea name="message" placeholder="Describe what you need help with. Your application reference is attached automatically." /></label></>
                : modal.type === 'invite' ? <><Field name="name" label="Vendor company" placeholder="e.g. Northstar Materials Ltd." required /><Field name="email" label="Primary contact email" placeholder="vendor@company.com" type="email" /><div className="form-grid"><Field name="country" label="Country (optional)" placeholder="e.g. China" /><Field name="category" label="Supply category (optional)" placeholder="e.g. Hardware & Leather" /></div></>
                  : modal.type === 'request' ? <><Field name="title" label="Request title" placeholder="What do you need to procure?" required /><div className="form-grid"><label className="form-field"><span>Vendor</span><select name="vendorId" defaultValue={vendors[0]?.id}>{vendors.map((v) => <option key={v.id} value={v.id}>{v.shortName || v.name}</option>)}</select></label><label className="form-field"><span>Response due</span><input name="due" type="date" /></label></div><label className="form-field"><span>Requirements</span><textarea name="requirements" placeholder="Specification, quantity, certifications, delivery terms..." /></label></>
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

function Field({ label, placeholder, name, type = 'text', required }) {
  return <label className="form-field"><span>{label}</span><input name={name} type={type} placeholder={placeholder} required={required} /></label>;
}

// ---------------------------------------------------------------------------
// The vendor's onboarding assistant.
//
// Every answer is derived from this vendor's actual record  -  which documents
// are missing, what a reviewer rejected and why, which stage the application
// sits in. That is the whole point: a supplier's real question is "where is my
// application and what is holding it up?", and the app already knows. A
// free-text box backed by a language model would answer the same question less
// reliably and with no access to this state.
//
// So it matches on keywords and falls back to the status summary rather than
// guessing, and it says plainly at the bottom that a human is one click away.
// Nothing here claims to be more than it is.
// ---------------------------------------------------------------------------
function vendorSituation(vendor) {
  const missing = vendor.documents.filter((d) => d.status === 'Missing');
  const rejected = vendor.documents.filter((d) => d.rejection);
  const processing = vendor.documents.filter((d) => d.status === 'Processing');
  const verified = vendor.documents.filter((d) => d.status === 'Verified');

  if (!vendor.hasSubmittedApplication) {
    return {
      tone: 'amber',
      stage: 'Not submitted yet',
      summary: `Your application is still a draft. ${missing.length ? `${missing.length} document(s) still needed.` : 'All documents are attached  -  you can submit whenever you are ready.'}`,
      blocking: missing.length ? `You still need: ${missing.map((d) => d.title).join(', ')}.` : 'Nothing is blocking you. Open the wizard and submit.',
    };
  }
  if (rejected.length) {
    return {
      tone: 'red',
      stage: 'Correction requested',
      summary: `A reviewer asked for a replacement of ${rejected.length} document(s).`,
      blocking: rejected.map((d) => `${d.title}: ${d.rejection.reason}. ${d.rejection.detail}`).join(' '),
    };
  }
  if (missing.length) {
    return {
      tone: 'red',
      stage: 'Waiting on you',
      summary: `${missing.length} required document(s) have not been supplied.`,
      blocking: `Upload: ${missing.map((d) => d.title).join(', ')}.`,
    };
  }
  if (processing.length) {
    return {
      tone: 'blue',
      stage: 'AI verification running',
      summary: `${processing.length} document(s) are being checked right now.`,
      blocking: 'Nothing  -  this step is automatic and usually finishes within a few minutes.',
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

function VendorAssistant({ onClose }) {
  const { getVendor, activeVendorId } = useNexus();
  const vendor = getVendor(activeVendorId);
  const cardRef = useRef(null);
  useDialog(cardRef, onClose);
  const situation = vendorSituation(vendor);
  const [log, setLog] = useState([]);
  const [draft, setDraft] = useState('');

  const answer = (question) => {
    const q = question.toLowerCase();
    if (/block|stuck|hold|wrong|reject|problem|issue/.test(q)) return [situation.blocking];
    if (/document|file|upload|missing|need/.test(q)) {
      const missing = vendor.documents.filter((d) => d.status === 'Missing');
      const flagged = vendor.documents.filter((d) => d.rejection);
      if (!missing.length && !flagged.length) return [`All ${vendor.documents.length} required documents are in. Nothing further is needed from you.`];
      return [
        missing.length ? `Not yet supplied: ${missing.map((d) => d.title).join(', ')}.` : null,
        flagged.length ? `Needs replacing: ${flagged.map((d) => `${d.title}  -  ${d.rejection.reason}`).join('; ')}.` : null,
      ].filter(Boolean);
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
      return ['On the AI-assisted path, your company details were read from the documents you uploaded and you confirmed them before submitting. If something was read wrongly, tell Elena and it can be corrected  -  the original file is always kept alongside the extracted values.'];
    }
    return [
      `Your application is at: ${situation.stage}. ${situation.summary}`,
      'You can ask about what is blocking you, which documents are outstanding, how long review takes, or who makes the decision. For anything else, email Elena Rostova.',
    ];
  };

  const ask = (question) => {
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
