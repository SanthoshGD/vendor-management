'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowRight, HelpCircle, PanelLeftClose, PanelLeftOpen, RefreshCw, Settings, X, Zap, Check, ChevronDown,
} from 'lucide-react';
import { useNexus } from '../../context/NexusContext';
import { ONBOARDING_LABELS } from '../../constants/onboarding';

const cx = (...items: (string | boolean | undefined | null)[]): string =>
  items.filter(Boolean).join(' ');

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin workspace', supervisor: 'Vendor Executive workspace', vendor: 'Vendor portal',
};

function useDismiss(isOpen: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen, onDismiss]);
  return ref;
}

function WorkspacePicker({ persona, collapsed, onViewAsVendor }: { persona: string; collapsed: boolean; onViewAsVendor?: (id: string) => void }) {
  const { vendors, getVendor, activeVendorId } = useNexus();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

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
    <div className="workspace-picker-wrap" ref={ref}>
      <button className={cx('workspace-picker', open && 'is-open')} onClick={() => setOpen(!open)}>
        <span className="company-avatar">{active?.initials}</span>
        <span>
          <strong>{active?.shortName || active?.name}</strong>
          <small>{active?.hasSubmittedApplication ? 'Vendor workspace' : `Onboarding / step ${Math.min((active?.onboardingStep ?? 0) + 1, 4)} of 4`}</small>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="workspace-pop">
          <header>Viewing the portal as</header>
          {ordered.map((vendor: any) => (
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

interface SidebarProps {
  persona: string;
  nav: [string, string, any][];
  page: string;
  collapsed: boolean;
  mobileNav: boolean;
  onNavigate: (page: string) => void;
  onCollapse: () => void;
  onClose: () => void;
  onModal: (modal: any) => void;
  onViewAsVendor?: (id: string) => void;
}

export function Sidebar({ persona, nav, page, collapsed, mobileNav, onNavigate, onCollapse, onClose, onModal, onViewAsVendor }: SidebarProps) {
  const { resetDemo, vendors, activeVendorId, getVendor } = useNexus();
  const activeVendor = persona === 'vendor' ? getVendor(activeVendorId) : null;
  const reviewedDocuments = persona === 'vendor'
    ? activeVendor?.verifiedCount || 0
    : vendors.reduce((sum: number, vendor: any) => sum + vendor.documents.filter((doc: any) => doc.status === 'Verified').length, 0);
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
        {nav.map(([id, title, Icon]) => (
          <button key={id}
            className={cx('sidebar-link', page === id && 'active')} onClick={() => onNavigate(id)}
            title={collapsed ? title : undefined} aria-current={page === id ? 'page' : undefined}>
            <Icon size={18} />{!collapsed && <span>{title}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="ai-savings">
            <span><Zap size={15} /></span>
            <strong>{reviewedDocuments} documents reviewed</strong>
            <small>Current simulated review state</small>
            <button onClick={() => onNavigate(footerAction[0])}>{footerAction[1]} <ArrowRight size={12} /></button>
          </div>
        )}
        <button className="sidebar-link" onClick={() => onModal({ type: 'help' })}><HelpCircle size={18} />{!collapsed && <span>Help center</span>}</button>
        <button className="sidebar-link" onClick={() => onModal({ type: 'settings' })}><Settings size={18} />{!collapsed && <span>Settings</span>}</button>
        <button className="sidebar-link" onClick={() => { if (typeof window !== 'undefined' && window.confirm('Reset all demo data back to its original state?')) resetDemo(); }}>
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

export default Sidebar;
