import React, { useState, useEffect } from 'react';
import { useApp } from '../context/NexusContext';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import StrategyModal from './StrategyModal';
import { 
  ShieldCheck, Inbox, FileCheck2, History, AlertTriangle, 
  UserCheck, Sparkles, HelpCircle, Building2, TrendingUp 
} from 'lucide-react';

export default function HeaderNav() {
  const { activeScreen, setActiveScreen, activeVendor, auditLogs } = useApp();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);

  const auditCount = auditLogs.length;

  // Global Keyboard Navigation & Hotkeys listener (Jakob's & Fitts's Law)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing inside input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (e.key === '1') setActiveScreen(1);
      if (e.key === '2') setActiveScreen(2);
      if (e.key === '3') setActiveScreen(3);
      if (e.key === '?' || (e.shiftKey && e.key === '/')) setIsHelpOpen(true);
      if (e.key === 'Escape') {
        setIsHelpOpen(false);
        setIsStrategyOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveScreen]);

  return (
    <header style={styles.header} role="banner">
      {/* Brand & Platform Identity */}
      <div style={styles.brandGroup}>
        <div style={styles.logoBadge}>
          <ShieldCheck size={24} color="#6366F1" />
        </div>
        <div>
          <div style={styles.brandTitle}>
            STYLE<span style={{ color: '#6366F1' }}>SPHERE</span> GLOBAL
            <span style={styles.enterprisePill}>ENTERPRISE AI</span>
          </div>
          <div style={styles.brandSubtitle}>AI Vendor Onboarding & Compliance Platform</div>
        </div>
      </div>

      {/* 3-Screen Navigation Ceiling */}
      <nav style={styles.navTabs} aria-label="Main Navigation">
        <button
          style={{
            ...styles.tabButton,
            ...(activeScreen === 1 ? styles.activeTab : {})
          }}
          onClick={() => setActiveScreen(1)}
          aria-current={activeScreen === 1 ? 'page' : undefined}
          title="Press '1' on keyboard to jump to Vendor Queue"
        >
          <Inbox size={18} />
          <span>Screen 1: Vendor Queue</span>
          <span style={styles.hotkeyTag}>1</span>
        </button>

        <button
          style={{
            ...styles.tabButton,
            ...(activeScreen === 2 ? styles.activeTab : {})
          }}
          onClick={() => setActiveScreen(2)}
          aria-current={activeScreen === 2 ? 'page' : undefined}
          title="Press '2' on keyboard to jump to Review Workspace"
        >
          <FileCheck2 size={18} />
          <span>Screen 2: Review Workspace</span>
          <span style={styles.hotkeyTag}>2</span>
          {activeVendor && (
            <span style={styles.activeVendorTag}>
              {activeVendor.vendor_id}
            </span>
          )}
        </button>

        <button
          style={{
            ...styles.tabButton,
            ...(activeScreen === 3 ? styles.activeTab : {})
          }}
          onClick={() => setActiveScreen(3)}
          aria-current={activeScreen === 3 ? 'page' : undefined}
          title="Press '3' on keyboard to jump to Audit Log"
        >
          <History size={18} />
          <span>Screen 3: Audit Trail</span>
          <span style={styles.hotkeyTag}>3</span>
          <span style={styles.badgeCount}>{auditCount}</span>
        </button>
      </nav>

      {/* User Context, Strategy Thesis & System Status */}
      <div style={styles.userSection}>
        <button
          style={styles.strategyBtn}
          onClick={() => setIsStrategyOpen(true)}
          title="View Enterprise Strategy Architecture & ROI Thesis"
        >
          <TrendingUp size={15} color="#10B981" />
          <span>Enterprise Strategy</span>
        </button>

        <button
          style={styles.helpBtn}
          onClick={() => setIsHelpOpen(true)}
          title="UX Laws & Keyboard Shortcuts (Press '?')"
        >
          <HelpCircle size={15} color="#818CF8" />
          <span>UX Laws & Hotkeys</span>
          <span style={styles.questionMarkPill}>?</span>
        </button>

        <div style={styles.hitlBadge}>
          <Sparkles size={14} color="#10B981" />
          <span>HITL Mode: Active</span>
        </div>

        <div style={styles.userProfile}>
          <UserCheck size={16} color="#9CA3AF" />
          <div style={{ textAlign: 'right' }}>
            <div style={styles.userName}>Elena Rostova</div>
            <div style={styles.userRole}>Lead Onboarding Exec</div>
          </div>
        </div>
      </div>

      {/* UX Laws & Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Enterprise Strategy Architecture Modal */}
      <StrategyModal
        isOpen={isStrategyOpen}
        onClose={() => setIsStrategyOpen(false)}
      />
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'rgba(17, 23, 38, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    zIndex: 100
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoBadge: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  enterprisePill: {
    fontSize: '0.65rem',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
    border: '1px solid rgba(16, 185, 129, 0.3)'
  },
  brandSubtitle: {
    fontSize: '0.75rem',
    color: '#9CA3AF',
    fontWeight: '400'
  },
  navTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(9, 13, 22, 0.6)',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.06)'
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#9CA3AF',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  activeTab: {
    background: '#4F46E5',
    color: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
  },
  hotkeyTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '1px 5px',
    borderRadius: '3px',
    marginLeft: '2px',
    color: '#D1D5DB'
  },
  activeVendorTag: {
    fontSize: '0.7rem',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '600'
  },
  badgeCount: {
    fontSize: '0.7rem',
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '2px'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  strategyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34D399',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  helpBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(99, 102, 241, 0.12)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    color: '#A5B4FC',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  questionMarkPill: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.68rem',
    background: 'rgba(99, 102, 241, 0.25)',
    padding: '1px 6px',
    borderRadius: '4px',
    color: '#FFFFFF'
  },
  hitlBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#10B981',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(16, 185, 129, 0.25)'
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  userName: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#E5E7EB'
  },
  userRole: {
    fontSize: '0.7rem',
    color: '#9CA3AF'
  }
};
