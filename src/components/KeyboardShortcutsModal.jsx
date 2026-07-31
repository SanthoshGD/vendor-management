import React from 'react';
import { X, Keyboard, Sparkles, Command, ShieldCheck, Zap, Eye, MousePointer } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Tab', desc: 'Smart Exception Jump (Bypasses Green >90% fields to land directly on Amber/Red errors)', law: "Fitts's & Miller's Law" },
    { key: 'Shift + Drag', desc: 'Point-and-Extract OCR (Select canvas region to auto-populate active field)', law: 'Direct Manipulation Ergonomics' },
    { key: '1', desc: 'Switch to Screen 1: Vendor Queue Inbox', law: "Jakob's Law" },
    { key: '2', desc: 'Switch to Screen 2: Vendor Review Workspace', law: "Jakob's Law" },
    { key: '3', desc: 'Switch to Screen 3: Audit & Provenance Trail', law: "Jakob's Law" },
    { key: 'Esc', desc: 'Close modals / AI Provenance Drawer', law: 'User Control & Freedom' }
  ];

  const uxLawsList = [
    { title: "Fitts's Law", detail: "Enlarged primary CTAs and target zones in Action Bar for zero-miss human approvals." },
    { title: "Hick's Law & Miller's Law", detail: "Chunked 50/50 split layout and smart tabbing to prevent cognitive overload during 300+ daily page reviews." },
    { title: "Aesthetic-Usability Effect", detail: "Vibrant traffic-light color system (Green/Amber/Red) combined with dark slate glassmorphism boosts perceived efficiency." },
    { title: "Peak-End Rule", detail: "Instant visual feedback toast and immutable audit diff confirmation upon submitting executive decisions." },
    { title: "WCAG 2.1 AA Accessibility", detail: "High contrast ratios, explicit keyboard focus rings, and screen-reader compliant labeling." }
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Keyboard size={20} color="#6366F1" />
            <span>UX Laws & Keyboard Shortcuts Engine</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close Modal">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          {/* Shortcuts Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Zap size={15} color="#10B981" />
              <span>Keyboard Shortcuts (Keystroke-Level Ergonomics)</span>
            </div>
            <div style={styles.shortcutsGrid}>
              {shortcuts.map((sc, i) => (
                <div key={i} style={styles.shortcutCard}>
                  <div style={styles.keyBadge}>{sc.key}</div>
                  <div style={styles.scDetails}>
                    <div style={styles.scDesc}>{sc.desc}</div>
                    <div style={styles.scLaw}><Sparkles size={11} color="#818CF8" /> {sc.law}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applied UX Laws Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <ShieldCheck size={15} color="#6366F1" />
              <span>Human-AI Design Principles & UX Laws Applied</span>
            </div>
            <div style={styles.lawsList}>
              {uxLawsList.map((law, i) => (
                <div key={i} style={styles.lawCard}>
                  <div style={styles.lawTitle}>{law.title}</div>
                  <div style={styles.lawDetail}>{law.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modal: {
    width: '620px',
    maxHeight: '90vh',
    background: '#111726',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '16px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 22px',
    background: 'rgba(9, 13, 22, 0.85)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#F3F4F6'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  body: {
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#E5E7EB',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  shortcutsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px'
  },
  shortcutCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: 'rgba(17, 23, 38, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '10px 14px'
  },
  keyBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#818CF8',
    background: 'rgba(99, 102, 241, 0.18)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    padding: '6px 12px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    minWidth: '100px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
  scDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  scDesc: {
    fontSize: '0.82rem',
    color: '#F3F4F6',
    fontWeight: '500'
  },
  scLaw: {
    fontSize: '0.72rem',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  lawsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  lawCard: {
    background: 'rgba(9, 13, 22, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '10px 14px'
  },
  lawTitle: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#10B981'
  },
  lawDetail: {
    fontSize: '0.78rem',
    color: '#9CA3AF',
    marginTop: '2px',
    lineHeight: '1.4'
  }
};
