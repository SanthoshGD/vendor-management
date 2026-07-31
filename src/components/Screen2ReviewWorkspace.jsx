import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import DocumentCanvas from './DocumentCanvas';
import ExtractedForm from './ExtractedForm';
import AIProvenanceDrawer from './AIProvenanceDrawer';
import { 
  Building2, Globe, Clock, ShieldAlert, FileText, CheckCircle2, 
  XCircle, FileQuestion, AlertOctagon, ArrowLeft, Send, Sparkles, Layers
} from 'lucide-react';

export default function Screen2ReviewWorkspace() {
  const { 
    activeVendor, 
    activeVendorDocs, 
    activeDocId, 
    setActiveDocId, 
    setActiveFieldKey, 
    setActiveScreen,
    submitVendorDecision
  } = useApp();

  const [decisionNotes, setDecisionNotes] = useState('');
  const [showDecisionConfirm, setShowDecisionConfirm] = useState(null); // 'APPROVE', 'REJECT', 'REQUEST_DOCS', 'ESCALATE'

  if (!activeVendor) {
    return <div style={{ padding: '40px', color: '#5F6368' }}>No vendor application selected for review.</div>;
  }

  const handleSelectDoc = (doc) => {
    setActiveDocId(doc.id);
    if (doc.fields && doc.fields.length > 0) {
      setActiveFieldKey(doc.fields[0].key);
    }
  };

  const handleExecuteDecision = (type) => {
    submitVendorDecision(type, decisionNotes);
    setShowDecisionConfirm(null);
    setDecisionNotes('');
    setActiveScreen(3);
  };

  const riskColorClass = 
    activeVendor.overall_ai_risk_score >= 80 ? 'red' :
    activeVendor.overall_ai_risk_score >= 50 ? 'amber' : 'green';

  return (
    <div style={styles.workspaceContainer}>
      {/* 1. Top Vendor Context Banner */}
      <div style={styles.vendorBanner}>
        <div style={styles.bannerLeft}>
          <button style={styles.backBtn} onClick={() => setActiveScreen(1)} title="Back to Vendor Queue (Press '1')">
            <ArrowLeft size={16} />
            <span>Queue</span>
          </button>
          <div>
            <div style={styles.vendorTitleRow}>
              <span style={styles.vendorName}>{activeVendor.legal_name}</span>
              <span style={styles.vendorIdTag}>{activeVendor.vendor_id}</span>
              <span style={styles.countryTag}><Globe size={12} /> {activeVendor.country}</span>
            </div>
            <div style={styles.vendorMetaSub}>
              <span>Category: <strong>{activeVendor.category}</strong></span>
              <span>•</span>
              <span>Primary Contact: <strong>{activeVendor.primary_contact}</strong></span>
            </div>
          </div>
        </div>

        <div style={styles.bannerRight}>
          {/* AI Risk Score Pill */}
          <div style={styles.riskScorePillBox}>
            <span style={styles.riskLabel}>AI Risk Score:</span>
            <span className={`badge-confidence ${riskColorClass}`}>
              {activeVendor.overall_ai_risk_score} / 100 Risk Score
            </span>
          </div>

          <div style={styles.slaBox}>
            <Clock size={15} color={activeVendor.sla_time_remaining_hours <= 12 ? '#C5221F' : '#5F6368'} />
            <span>SLA: <strong>{activeVendor.sla_time_remaining_hours}h remaining</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Grid: Document Carousel Sidebar + 45% Left Canvas / 55% Right Data Panel */}
      <div style={styles.mainEngineArea}>
        {/* Persistent Vertical Document Carousel Sidebar */}
        <div style={styles.docCarouselSidebar}>
          <div style={styles.carouselHeader}>
            <Layers size={14} color="#1A73E8" />
            <span>Uploaded Docs ({activeVendorDocs.length})</span>
          </div>

          <div style={styles.docListScroll}>
            {activeVendorDocs.map((doc, idx) => {
              const isActive = doc.id === activeDocId;

              return (
                <button
                  key={doc.id}
                  style={{
                    ...styles.docTabItem,
                    ...(isActive ? styles.docTabItemActive : {})
                  }}
                  onClick={() => handleSelectDoc(doc)}
                  title={`Press Alt+${idx + 1} to jump to ${doc.code}`}
                >
                  <div style={styles.docTabTop}>
                    <span style={styles.docCodeTag}>{doc.code}</span>
                    <span style={styles.altKeyHint}>Alt+{idx + 1}</span>
                  </div>

                  <div style={styles.docTabTitle}>{doc.title}</div>
                  
                  <div style={styles.docTabFooter}>
                    <span style={styles.docFileNameTag}>{doc.fileName}</span>
                    <DocStatusBadge status={doc.status} hasDiscrepancy={doc.hasDiscrepancy} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spatial Grid Blueprint: 45% Left Viewer / 55% Right Data Panel */}
        <div style={styles.splitViewerArea}>
          {/* Left Pane (45% width): PDF/Image Viewer */}
          <div style={styles.leftPane45}>
            <DocumentCanvas />
          </div>

          {/* Right Pane (55% width): Structured Extracted Data Panel & Action Buttons */}
          <div style={styles.rightPane55}>
            <ExtractedForm />
          </div>
        </div>
      </div>

      {/* 3. Locked Bottom Action Bar (Mandatory HITL Boundaries) */}
      <div style={styles.actionBar}>
        <div style={styles.hitlNotice}>
          <Sparkles size={14} color="#1A73E8" />
          <span>Keystroke Shortcut: Press <strong>Ctrl + Enter</strong> to finalize & submit decision</span>
        </div>

        <div style={styles.actionButtonGroup}>
          <button 
            style={{ ...styles.actionBtn, background: '#137333', color: '#FFFFFF' }}
            onClick={() => setShowDecisionConfirm('APPROVE')}
          >
            <CheckCircle2 size={16} />
            <span>Approve Recommendation</span>
          </button>

          <button 
            style={{ ...styles.actionBtn, background: '#C5221F', color: '#FFFFFF' }}
            onClick={() => setShowDecisionConfirm('REJECT')}
          >
            <XCircle size={16} />
            <span>Reject Vendor</span>
          </button>

          <button 
            style={{ ...styles.actionBtn, background: '#FEF7E0', color: '#B06000', border: '1px solid #FCE8E6' }}
            onClick={() => setShowDecisionConfirm('REQUEST_DOCS')}
          >
            <FileQuestion size={16} />
            <span>Request Missing Documents</span>
          </button>

          <button 
            style={{ ...styles.actionBtn, background: '#E8F0FE', color: '#1A73E8', border: '1px solid #D2E3FC' }}
            onClick={() => setShowDecisionConfirm('ESCALATE')}
          >
            <AlertOctagon size={16} />
            <span>Escalate to Legal</span>
          </button>
        </div>
      </div>

      {/* Decision Confirmation Modal */}
      {showDecisionConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Confirm Decision: {showDecisionConfirm}</h3>
            <p style={styles.modalText}>
              Are you sure you want to execute <strong>{showDecisionConfirm}</strong> for vendor <strong>{activeVendor.legal_name}</strong>? Every human decision logs an immutable compliance audit entry.
            </p>
            
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: '#5F6368', fontWeight: '600' }}>Executive Decision Justification Notes</label>
              <textarea
                rows={3}
                placeholder="Enter formal compliance rationale, ERP voucher references, or legal sign-off details..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                style={styles.modalTextarea}
              />
            </div>

            <div style={styles.modalBtnRow}>
              <button onClick={() => setShowDecisionConfirm(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={() => handleExecuteDecision(showDecisionConfirm)} style={styles.confirmBtn}>
                <Send size={14} />
                <span>Submit Final Decision (Ctrl+Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Provenance Drawer Component */}
      <AIProvenanceDrawer />
    </div>
  );
}

function DocStatusBadge({ status, hasDiscrepancy }) {
  if (hasDiscrepancy) {
    return (
      <span style={{
        fontSize: '0.65rem',
        fontWeight: '600',
        padding: '2px 6px',
        borderRadius: '4px',
        color: '#C5221F',
        background: '#FCE8E6',
        border: '1px solid #FAD2CF'
      }}>
        Exception
      </span>
    );
  }

  const map = {
    Verified: { color: '#137333', bg: '#E6F4EA', border: '#CEEAD6', label: 'Verified' },
    Flagged: { color: '#C5221F', bg: '#FCE8E6', border: '#FAD2CF', label: 'Exception' },
    'Needs Review': { color: '#B06000', bg: '#FEF7E0', border: '#FCE8E6', label: 'Needs Review' },
    Missing: { color: '#5F6368', bg: '#F1F3F4', border: '#E5E7EB', label: 'Pending' }
  };
  const conf = map[status] || map.Missing;

  return (
    <span style={{
      fontSize: '0.65rem',
      fontWeight: '600',
      padding: '2px 6px',
      borderRadius: '4px',
      color: conf.color,
      background: conf.bg,
      border: `1px solid ${conf.border}`
    }}>
      {conf.label}
    </span>
  );
}

const styles = {
  workspaceContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 67px)',
    background: 'var(--surface-base)',
    overflow: 'hidden'
  },
  vendorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'var(--surface-panel)',
    borderBottom: '1px solid var(--border-subtle)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
  },
  bannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'var(--surface-base)',
    border: '1px solid var(--border-medium)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer'
  },
  vendorTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  vendorName: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  vendorIdTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--primary-500)',
    background: 'rgba(26, 115, 232, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  countryTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    background: 'var(--surface-base)',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)'
  },
  vendorMetaSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '2px'
  },
  bannerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  riskScorePillBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--surface-base)',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)'
  },
  riskLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  slaBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
    background: 'var(--surface-base)',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)'
  },
  mainEngineArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  docCarouselSidebar: {
    width: '240px',
    background: 'var(--surface-panel)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column'
  },
  carouselHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--surface-base)'
  },
  docListScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  docTabItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'var(--surface-base)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  docTabItemActive: {
    background: 'rgba(26, 115, 232, 0.08)',
    border: '1px solid var(--primary-500)',
    color: 'var(--text-primary)'
  },
  docTabTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  docCodeTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--primary-500)'
  },
  altKeyHint: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.65rem',
    color: 'var(--text-muted)'
  },
  docTabTitle: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3'
  },
  docTabFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '2px'
  },
  docFileNameTag: {
    fontSize: '0.65rem',
    color: 'var(--text-secondary)',
    maxWidth: '110px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  splitViewerArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  leftPane45: {
    width: '45%',
    height: '100%',
    overflow: 'hidden',
    borderRight: '1px solid var(--border-subtle)'
  },
  rightPane55: {
    width: '55%',
    height: '100%',
    overflow: 'hidden'
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'var(--surface-panel)',
    borderTop: '1px solid var(--border-subtle)',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
  },
  hitlNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  actionButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    fontSize: '0.82rem',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCard: {
    width: '440px',
    background: 'var(--surface-panel)',
    border: '1px solid var(--border-medium)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
  },
  modalTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  modalText: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5'
  },
  modalTextarea: {
    width: '100%',
    padding: '10px',
    background: 'var(--surface-base)',
    border: '1px solid var(--border-medium)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    outline: 'none',
    resize: 'none'
  },
  modalBtnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '6px'
  },
  cancelBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid var(--border-medium)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  confirmBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: 'var(--primary-500)',
    color: '#FFFFFF',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }
};
