'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useNexus } from '../../context/NexusContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AIAssistantPanel from '../admin/AI/AIAssistantPanel';
import ApprovalToast from '../admin/Shared/ApprovalToast';
import { Modal } from '../RedesignedApp';

import { adminNav, vendorNav } from '../../constants/nav';


const pageToRoute: Record<string, string> = {
  overview: 'dashboard',
  vendors: 'vendors',
  team: 'team',
  products: 'products',
  activity: 'activity',
  settings: 'settings',
  onboarding: 'onboarding',
  actions: 'actions',
  documents: 'documents',
};

const routeToPage: Record<string, string> = {
  dashboard: 'overview',
  vendors: 'vendors',
  team: 'team',
  products: 'products',
  activity: 'activity',
  settings: 'settings',
  onboarding: 'onboarding',
  actions: 'actions',
  documents: 'documents',
};

const cx = (...items: (string | boolean | undefined | null)[]): string =>
  items.filter(Boolean).join(' ');

interface PortalLayoutProps {
  persona: 'admin' | 'vendor';
  children: React.ReactNode;
}

export default function PortalLayout({ persona, children }: PortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast, settings, activeVendorId, setActiveVendorId, getVendor } = useNexus();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [approvedToastVendor, setApprovedToastVendor] = useState<{ vendorId: string; vendorName: string } | null>(null);

  // Determine active page key from pathname
  const activePage = useMemo(() => {
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];
    return routeToPage[lastSegment] || 'overview';
  }, [pathname]);

  const nav = persona === 'admin' ? adminNav : vendorNav;

  const navigate = useCallback((pageKey: string) => {
    const route = pageToRoute[pageKey] || pageKey;
    router.push(`/${persona}/${route}`);
    setMobileNav(false);
  }, [persona, router]);

  const switchPersona = useCallback((nextPersona: string) => {
    if (nextPersona === 'vendor') {
      const activeVendor = getVendor(activeVendorId);
      const startPage = activeVendor?.hasSubmittedApplication ? 'dashboard' : 'onboarding';
      router.push(`/vendor/${startPage}`);
    } else {
      router.push('/admin/dashboard');
    }
    setMobileNav(false);
  }, [activeVendorId, getVendor, router]);

  const openVendor = useCallback((vendorId: string, targetPage = 'vendor-details') => {
    setActiveVendorId(vendorId);
    if (targetPage === 'vendor-details' || targetPage === 'ai-review') {
      router.push(`/admin/vendor/${vendorId}`);
    } else {
      router.push(`/admin/${pageToRoute[targetPage] || targetPage}`);
    }
    setModal(null);
    setMobileNav(false);
  }, [setActiveVendorId, router]);

  const viewAsVendor = useCallback((vendorId: string) => {
    setActiveVendorId(vendorId);
    const activeVendor = getVendor(vendorId);
    const startPage = activeVendor?.hasSubmittedApplication ? 'dashboard' : 'onboarding';
    router.push(`/vendor/${startPage}`);
    setModal(null);
    setMobileNav(false);
  }, [setActiveVendorId, getVendor, router]);

  const handleApproveSuccess = useCallback((vId: string, vName: string) => {
    setApprovedToastVendor({ vendorId: vId, vendorName: vName });
  }, []);

  return (
    <div className={cx('nexus-shell', collapsed && 'is-collapsed')} data-density={settings.density || 'comfortable'}>
      <Sidebar
        persona={persona}
        nav={nav}
        page={activePage}
        collapsed={collapsed}
        mobileNav={mobileNav}
        onNavigate={navigate}
        onCollapse={() => setCollapsed(!collapsed)}
        onClose={() => setMobileNav(false)}
        onModal={setModal}
        onViewAsVendor={viewAsVendor}
      />
      <div className="nexus-workspace">
        <Topbar
          persona={persona}
          page={activePage}
          query={query}
          setQuery={setQuery}
          onSwitch={switchPersona}
          onMobile={() => setMobileNav(true)}
          onHelp={() => setModal({ type: 'help' })}
          onNavigate={navigate}
          onOpenVendor={openVendor}
          onModal={setModal}
        />
        <main>
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, {
                onNavigate: navigate,
                onModal: setModal,
                onOpenVendor: openVendor,
                onViewAsVendor: viewAsVendor,
                onApproveSuccess: handleApproveSuccess,
              })
            : children}
        </main>
      </div>

      {/* Floating AI Compliance Assistant button for Admin / Executive */}
      {persona !== 'vendor' && (
        <button
          type="button"
          title="Open AI Compliance Assistant"
          onClick={() => setAiAssistantOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 40,
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#10231d',
            color: '#4FCB99',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            border: '1px solid #4FCB9940',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={22} />
        </button>
      )}

      {/* Global AI Assistant chatbot drawer */}
      {persona !== 'vendor' && (
        <AIAssistantPanel
          isOpen={aiAssistantOpen}
          onClose={() => setAiAssistantOpen(false)}
          onOpenVendor={openVendor}
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

      {mobileNav && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(4px)',
            zIndex: 20,
            border: 'none',
            cursor: 'pointer',
          }}
        />
      )}

      {modal && (
        <Modal
          modal={modal}
          onClose={() => setModal(null)}
          onOpenVendor={openVendor}
          onViewAsVendor={viewAsVendor}
        />
      )}

      {toast && (
        <div className="nexus-toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
