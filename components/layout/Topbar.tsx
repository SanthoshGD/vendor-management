'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import {
  AlertCircle, ArrowRight, Bell, Bot, Building2, CalendarClock, CheckCircle2, ChevronRight, Clock3,
  FileText, FolderKanban, Headphones, Menu, PackageCheck, RefreshCw, Search, Settings, ShieldCheck,
  Users, Activity, Sparkles, Upload, X, PackageCheck as ERPCheck,
} from 'lucide-react';
import { useNexus } from '../../context/NexusContext';
import { CURRENT_USERS, REQUEST_TYPES } from '../../data/mockData';

const cx = (...items: (string | boolean | undefined | null)[]): string =>
  items.filter(Boolean).join(' ');

const shortTime = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const pageNamesByPersona: Record<string, Record<string, string>> = {
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

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin workspace', supervisor: 'Supervisor workspace', vendor: 'Vendor portal',
};

const BELL_FOOTER: Record<string, { page: string; label: string }> = {
  admin: { page: 'activity', label: 'Open audit record' },
  supervisor: { page: 'requests', label: 'Open requests' },
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

function attentionItems(vendors: any[]) {
  const items: any[] = [];
  for (const vendor of vendors) {
    if (vendor.finalStatus) continue;
    const mismatch = vendor.documents.flatMap((d: any) => d.fields).find((f: any) => f.crossDocMismatch && !f.resolved);
    if (mismatch) {
      items.push({ tone: 'red', icon: AlertCircle, title: 'Legal or entity name mismatch', detail: `${vendor.shortName || vendor.name} / ${mismatch.label}`, badge: 'High', vendorId: vendor.id, target: 'ai-review' });
      continue;
    }
    if (vendor.missingCount > 0) {
      items.push({ tone: 'amber', icon: Clock3, title: `${vendor.missingCount} document${vendor.missingCount > 1 ? 's' : ''} outstanding`, detail: `${vendor.shortName || vendor.name} / ${vendor.sla} SLA left`, badge: vendor.slaHours <= 6 ? 'Due today' : 'Open', vendorId: vendor.id, target: 'onboarding' });
      continue;
    }
    const expiring = vendor.documents.flatMap((d: any) => d.fields).find((f: any) => !f.resolved && /expir/i.test(f.diagnostic || ''));
    if (expiring) {
      items.push({ tone: 'violet', icon: ShieldCheck, title: `${expiring.label} needs confirmation`, detail: `${vendor.shortName || vendor.name}`, badge: 'Upcoming', vendorId: vendor.id, target: 'compliance' });
    }
  }
  return items.slice(0, 3);
}

function useNotifications(persona: string) {
  const { vendors, auditLogs, activeVendorId, supervisorRequests, exceptions, pendingApprovals } = useNexus();
  return useMemo(() => {
    if (persona === 'supervisor') {
      const items: any[] = [];
      const now = Date.now();

      const open = supervisorRequests.filter((r: any) => r.status === 'open');
      for (const request of open) {
        const ageHours = Math.round((now - new Date(request.raisedAt).getTime()) / 3600000);
        const breached = ageHours > (request.slaHours || 24);
        const meta = REQUEST_TYPES[request.type as keyof typeof REQUEST_TYPES] || {};
        items.push({
          id: `req-${request.id}`,
          group: breached ? 'Overdue' : 'Waiting on you',
          tone: breached ? 'red' : meta.tone || 'amber', icon: AlertCircle,
          title: `${meta.label} / ${request.vendorShortName}`,
          detail: breached
            ? `${ageHours - request.slaHours}h past its ${request.slaHours}h SLA / ${request.raisedBy}`
            : `${ageHours}h old / raised by ${request.raisedBy}`,
          page: 'requests', vendorId: request.vendorId,
          sort: breached ? -(ageHours - request.slaHours) : 1,
        });
      }
      for (const approval of pendingApprovals) {
        items.push({
          id: `apr-${approval.id}`, group: 'Waiting on you', tone: 'violet', icon: Bot,
          title: approval.summary || 'An agent action is held for approval',
          detail: `Held by policy / ${approval.vendorName || 'Platform'}`,
          page: 'requests', vendorId: approval.vendorId, sort: 2,
        });
      }

      for (const exception of exceptions.filter((e: any) => e.lapsed || e.lapsingSoon)) {
        items.push({
          id: `exc-${exception.id}`, group: 'Lapsing soon',
          tone: exception.lapsed ? 'red' : 'amber', icon: ShieldCheck,
          title: exception.lapsed
            ? `${exception.vendorShortName} / exception lapsed ${Math.abs(exception.daysLeft)}d ago`
            : `${exception.vendorShortName} / exception expires in ${exception.daysLeft}d`,
          detail: exception.detail?.control || 'Risk acceptance you granted',
          page: 'requests', vendorId: exception.vendorId, sort: exception.lapsed ? 0 : 1,
        });
      }
      for (const vendor of vendors.filter((v: any) => v.slaHours <= 6 && !v.finalStatus)) {
        items.push({
          id: `sla-${vendor.id}`, group: 'Lapsing soon', tone: 'amber', icon: Clock3,
          title: `${vendor.shortName || vendor.name} / ${vendor.sla} of review SLA left`,
          detail: `${vendor.stage} / owned by ${vendor.owner}`,
          page: 'vendors', vendorId: vendor.id, sort: 2,
        });
      }

      const teamCalls = auditLogs.filter((log: any) => log.actionType === 'DECISION'
        && log.actorName !== CURRENT_USERS.supervisor.name);
      for (const log of teamCalls.slice(0, 3)) {
        items.push({
          id: `team-${log.id}`, group: "Your team's calls", tone: 'neutral', icon: Users,
          title: `${log.vendorName} / ${log.humanValue || log.fieldLabel}`,
          detail: `${log.actorName} / ${shortTime(log.timestamp)}`,
          page: 'activity', vendorId: log.vendorId, sort: 0,
        });
      }

      for (const vendor of vendors.filter((v: any) => v.finalStatus === 'Active')) {
        items.push({
          id: `live-${vendor.id}`, group: 'Vendors going live', tone: 'green', icon: ERPCheck,
          title: `${vendor.shortName || vendor.name} is active in the ERP`,
          detail: `${vendor.erpId || 'Supplier master'} / ${vendor.category}`,
          page: 'vendors', vendorId: vendor.id, sort: 0,
        });
      }

      const awareness = auditLogs.filter((log: any) => ['GATE_BLOCKED', 'AGENT_BLOCKED', 'AGENT_CONFIG'].includes(log.actionType));
      for (const log of awareness.slice(0, 4)) {
        const [Icon] = ACTION_META[log.actionType] || [Activity];
        items.push({
          id: `gov-${log.id}`, group: 'For your awareness', tone: 'neutral', icon: Icon,
          title: `${log.vendorName} / ${log.fieldLabel}`,
          detail: `${log.actorName} / ${shortTime(log.timestamp)}`,
          page: 'activity', sort: 3,
        });
      }

      const order = [
        'Overdue', 'Waiting on you', 'Lapsing soon',
        "Your team's calls", 'Vendors going live', 'For your awareness',
      ];
      return items.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || (a.sort ?? 9) - (b.sort ?? 9));
    }
    if (persona === 'vendor') {
      const vendor = vendors.find((v: any) => v.id === activeVendorId) || vendors[0];
      if (!vendor) return [];
      const items: any[] = [];
      if (!vendor.hasSubmittedApplication) {
        items.push({ id: 'wiz', tone: 'amber', icon: FolderKanban, title: 'Your application is not submitted yet', detail: `Step ${Math.min((vendor.onboardingStep ?? 0) + 1, 4)} of 4 / pick up where you left off`, page: 'onboarding' });
      }
      for (const doc of vendor.documents.filter((d: any) => d.status === 'Missing')) {
        items.push({ id: `miss-${doc.id}`, tone: 'red', icon: AlertCircle, title: `${doc.title} is outstanding`, detail: `Requested by ${vendor.owner} / ${vendor.sla} SLA left`, page: 'documents' });
      }
      for (const field of vendor.documents.flatMap((d: any) => d.fields).filter((f: any) => f.crossDocMismatch && !f.resolved)) {
        items.push({ id: `fix-${field.key}`, tone: 'red', icon: AlertCircle, title: `${field.label} needs correcting`, detail: field.mismatchNote || 'Your reviewer flagged a mismatch across your documents.', page: 'actions' });
      }
      if (vendor.finalStatus === 'Active') {
        items.push({ id: 'active', tone: 'green', icon: CheckCircle2, title: 'You are an approved supplier', detail: `Activated as ${vendor.erpId || 'a supplier record'}.`, page: 'overview' });
      }
      return items;
    }
    const items: any[] = attentionItems(vendors).map((item, index) => ({
      id: `att-${index}`, tone: item.tone, icon: item.icon, title: item.title, detail: item.detail,
      page: item.target, vendorId: item.vendorId,
    }));
    for (const vendor of vendors.filter((v: any) => !v.hasSubmittedApplication)) {
      items.push({ id: `pend-${vendor.id}`, tone: 'blue', icon: Users, title: `${vendor.shortName || vendor.name} has not submitted yet`, detail: 'Their onboarding link is waiting on the vendor directory.', page: 'vendors' });
    }
    for (const log of auditLogs.slice(0, 3)) {
      items.push({ id: log.id, tone: 'neutral', icon: (ACTION_META[log.actionType] || [Activity])[0], title: `${log.vendorName} / ${log.fieldLabel}`, detail: `${log.actorName} / ${shortTime(log.timestamp)}`, page: 'activity' });
    }
    return items;
  }, [persona, vendors, auditLogs, activeVendorId, supervisorRequests, exceptions, pendingApprovals]);
}

function useSearchResults(query: string, persona: string) {
  const { vendors, activeVendorId } = useNexus();
  return useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const scope = persona === 'vendor' ? vendors.filter((v: any) => v.id === activeVendorId) : vendors;
    const results: any[] = [];
    for (const vendor of scope) {
      if (persona !== 'vendor' && `${vendor.name} ${vendor.id} ${vendor.country} ${vendor.category} ${vendor.stage}`.toLowerCase().includes(term)) {
        results.push({ id: vendor.id, kind: 'Vendor', icon: Building2, title: vendor.name, detail: `${vendor.country} / ${vendor.stage}`, page: 'ai-review', vendorId: vendor.id });
      }
      for (const doc of vendor.documents) {
        if (`${doc.title} ${doc.code} ${doc.fileName || ''} ${doc.status}`.toLowerCase().includes(term)) {
          results.push({ id: doc.id, kind: 'Document', icon: FileText, title: doc.title, detail: `${vendor.shortName || vendor.name} / ${doc.status}`, page: persona === 'vendor' ? 'documents' : 'ai-review', vendorId: vendor.id });
        }
      }
    }
    return results.slice(0, 8);
  }, [query, persona, vendors, activeVendorId]);
}

function useDismiss(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.topbar-pop, .topbar-trigger, .global-search, .workspace-pop, .workspace-picker')) close();
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
}

interface TopbarProps {
  persona: string;
  page: string;
  query: string;
  setQuery: (q: string) => void;
  onSwitch: (persona: string) => void;
  onMobile: () => void;
  onHelp: () => void;
  onNavigate: (page: string) => void;
  onOpenVendor: (id: string, targetPage?: string) => void;
  onModal: (modal: any) => void;
}

export function Topbar({ persona, page, query, setQuery, onSwitch, onMobile, onHelp, onNavigate, onOpenVendor, onModal }: TopbarProps) {
  const { resetDemo, notify, getVendor, activeVendorId, restartOnboarding } = useNexus();
  const [open, setOpen] = useState<'bell' | 'account' | 'search' | null>(null);
  const notifications = useNotifications(persona);
  const results = useSearchResults(query, persona);
  const searchRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(null), []);
  useDismiss(Boolean(open), close);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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

  const identity = persona === 'vendor'
    ? {
      initials: personaVendor?.initials || CURRENT_USERS.vendor.initials,
      name: personaVendor?.profile?.contactName || CURRENT_USERS.vendor.name,
      subtitle: `Vendor contact / ${personaVendor?.shortName || personaVendor?.name || 'Your company'}`,
    }
    : {
      initials: CURRENT_USERS[persona as keyof typeof CURRENT_USERS].initials,
      name: CURRENT_USERS[persona as keyof typeof CURRENT_USERS].name,
      subtitle: `${CURRENT_USERS[persona as keyof typeof CURRENT_USERS].role} / StyleSphere Fashion`,
    };

  const go = (item: any) => {
    close();
    if (item.vendorId && persona !== 'vendor') onOpenVendor(item.vendorId, item.page);
    else onNavigate(item.page);
  };

  return (
    <header className="nexus-topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMobile}><Menu size={20} /></button>
      <div className="page-context">
        <small>{ROLE_LABEL[persona]}</small>
        <strong>{pageNamesByPersona[persona]?.[page] || page}</strong>
      </div>

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
            {results.length === 0 && <p className="pop-empty">Nothing matches &quot;{query}&quot;.</p>}
            {results.map((item: any) => (
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
            {notifications.map((item: any, index: number) => (
              <Fragment key={item.id}>
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
            {['admin', 'supervisor', 'vendor'].filter((role) => role !== persona).map((role) => (
              <button key={role} onClick={() => { close(); onSwitch(role); }}>
                {role === 'admin' ? <Building2 size={15} /> : role === 'supervisor' ? <ShieldCheck size={15} /> : <PackageCheck size={15} />}
                Switch to {ROLE_LABEL[role].toLowerCase()}
              </button>
            ))}
            {persona === 'vendor' && personaVendor?.hasSubmittedApplication && (
              <button onClick={() => {
                close();
                if (typeof window !== 'undefined' && window.confirm(`Start ${personaVendor.shortName || personaVendor.name}'s onboarding again from step 1? Their profile and uploaded documents will be cleared.`)) {
                  restartOnboarding(personaVendor.id);
                  onNavigate('onboarding');
                }
              }}><FolderKanban size={15} /> Restart onboarding</button>
            )}
            <button onClick={() => { close(); onHelp(); }}><Headphones size={15} /> Contact support</button>
            <button className="danger" onClick={() => { close(); if (typeof window !== 'undefined' && window.confirm('Reset all demo data back to its original state?')) resetDemo(); }}>
              <RefreshCw size={15} /> Reset demo data
            </button>
            <footer><button onClick={() => { close(); notify('This prototype keeps you signed in — there is no account to sign out of.'); }}>Sign out</button></footer>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;
