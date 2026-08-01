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
    overview: 'Dashboard',
    vendors: 'Vendors',
    'ai-review': 'Vendor Details',
    'vendor-details': 'Vendor Details',
    activity: 'Activity',
    settings: 'Settings',
  },
  vendor: {
    overview: 'My workspace',
    onboarding: 'Onboarding',
    actions: 'Action center',
    documents: 'Documents',
  },
};

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

function useNotifications(persona: string) {
  const { vendors, auditLogs, activeVendorId } = useNexus();
  return useMemo(() => {
    if (persona === 'vendor') {
      const vendor = vendors.find((v: any) => v.id === activeVendorId) || vendors[0];
      if (!vendor) return [];
      const items: any[] = [];
      if (!vendor.hasSubmittedApplication) {
        items.push({ id: 'wiz', group: '🟡 Expiring Soon', tone: 'amber', icon: FolderKanban, title: 'Your application is not submitted yet', detail: `Step ${Math.min((vendor.onboardingStep ?? 0) + 1, 4)} of 4 / pick up where you left off`, page: 'onboarding' });
      }
      for (const doc of vendor.documents.filter((d: any) => d.status === 'Missing')) {
        items.push({ id: `miss-${doc.id}`, group: '🔴 Action Required', tone: 'red', icon: AlertCircle, title: `${doc.title} is outstanding`, detail: `Requested by ${vendor.owner} / ${vendor.sla} SLA left`, page: 'documents' });
      }
      for (const field of vendor.documents.flatMap((d: any) => d.fields).filter((f: any) => f.crossDocMismatch && !f.resolved)) {
        items.push({ id: `fix-${field.key}`, group: '🔴 Action Required', tone: 'red', icon: AlertCircle, title: `${field.label} needs correcting`, detail: field.mismatchNote || 'Your reviewer flagged a mismatch across your documents.', page: 'actions' });
      }
      if (vendor.finalStatus === 'Active') {
        items.push({ id: 'active', group: '🔵 Informational', tone: 'green', icon: CheckCircle2, title: 'You are an approved supplier', detail: `Activated as ${vendor.erpId || 'a supplier record'}.`, page: 'overview' });
      }
      return items;
    }

    // Admin Persona Notifications Categorized strictly by Urgency:
    // 🔴 Action Required | 🟡 Expiring Soon | 🔵 Informational
    const items: any[] = [];

    // 1. 🔴 Action Required
    for (const vendor of vendors) {
      if (vendor.finalStatus) continue;
      const mismatch = vendor.documents?.flatMap((d: any) => d.fields || []).find((f: any) => f.crossDocMismatch && !f.resolved);
      if (mismatch) {
        items.push({
          id: `act-mis-${vendor.id}`,
          group: '🔴 Action Required',
          tone: 'red',
          icon: AlertCircle,
          title: `Vendor ${vendor.shortName || vendor.name} awaiting review`,
          detail: `Legal or entity name mismatch flagged in ${mismatch.label}`,
          page: 'vendor-details',
          vendorId: vendor.id,
        });
      } else if (vendor.missingCount > 0) {
        items.push({
          id: `act-miss-${vendor.id}`,
          group: '🔴 Action Required',
          tone: 'red',
          icon: AlertCircle,
          title: `Documents rejected or missing for ${vendor.shortName || vendor.name}`,
          detail: `${vendor.missingCount} required document(s) outstanding`,
          page: 'vendor-details',
          vendorId: vendor.id,
        });
      }
    }

    // 2. 🟡 Expiring Soon
    for (const vendor of vendors) {
      const expiringDoc = vendor.documents?.find((d: any) => d.code === 'COI' || /insurance/i.test(d.title));
      if (expiringDoc) {
        items.push({
          id: `exp-${vendor.id}`,
          group: '🟡 Expiring Soon',
          tone: 'amber',
          icon: Clock3,
          title: `Insurance expires in 7 days`,
          detail: `${vendor.shortName || vendor.name} · ${expiringDoc.title}`,
          page: 'vendor-details',
          vendorId: vendor.id,
        });
      }
    }

    // 3. 🔵 Informational
    for (const vendor of vendors.filter((v: any) => v.finalStatus === 'Approved' || v.finalStatus === 'Active')) {
      items.push({
        id: `inf-app-${vendor.id}`,
        group: '🔵 Informational',
        tone: 'green',
        icon: CheckCircle2,
        title: `Approval completed & Portal invitation sent`,
        detail: `${vendor.shortName || vendor.name} is ready for procurement`,
        page: 'vendor-details',
        vendorId: vendor.id,
      });
    }

    const urgencyOrder = ['🔴 Action Required', '🟡 Expiring Soon', '🔵 Informational'];
    return items.sort((a, b) => urgencyOrder.indexOf(a.group) - urgencyOrder.indexOf(b.group));
  }, [persona, vendors, activeVendorId]);
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
        results.push({ id: vendor.id, kind: 'Vendor', icon: Building2, title: vendor.name, detail: `${vendor.country} / ${vendor.stage}`, page: 'vendor-details', vendorId: vendor.id });
      }
      for (const doc of vendor.documents || []) {
        if (`${doc.title} ${doc.code} ${doc.fileName || ''} ${doc.status}`.toLowerCase().includes(term)) {
          results.push({ id: doc.id, kind: 'Document', icon: FileText, title: doc.title, detail: `${vendor.shortName || vendor.name} / ${doc.status}`, page: persona === 'vendor' ? 'documents' : 'vendor-details', vendorId: vendor.id });
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
      initials: 'AD',
      name: 'Admin User',
      subtitle: 'StyleSphere Admin Portal',
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

      {/* Demo Workspace Switcher (Admin | Vendor) ONLY */}
      <div className="persona-toggle">
        <button className={persona === 'admin' ? 'active' : ''} aria-label="Switch to admin portal" aria-pressed={persona === 'admin'} onClick={() => onSwitch('admin')}><Building2 size={15} /><span>Admin</span></button>
        <button className={persona === 'vendor' ? 'active' : ''} aria-label="Switch to vendor portal" aria-pressed={persona === 'vendor'} onClick={() => onSwitch('vendor')}><PackageCheck size={15} /><span>Vendor</span></button>
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
            {['admin', 'vendor'].filter((role) => role !== persona).map((role) => (
              <button key={role} onClick={() => { close(); onSwitch(role); }}>
                {role === 'admin' ? <Building2 size={15} /> : <PackageCheck size={15} />}
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
