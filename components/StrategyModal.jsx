import React from 'react';
import { ENTERPRISE_STRATEGY } from '../data/mockData';
import { X, Building2, User, Users, AlertTriangle, TrendingUp, CheckCircle, ShieldAlert, Cpu, FileText, Layers } from 'lucide-react';

export default function StrategyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Building2 size={20} color="#6366F1" />
            <div>
              <div style={styles.mainTitle}>AI-ASSISTED VENDOR ONBOARDING STRATEGY ARCHITECTURE</div>
              <div style={styles.subTitle}>Global Fashion & Apparels Import Enterprise Positioning</div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close Strategy Architecture">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          {/* 10-Point Enterprise Grid */}
          <div style={styles.grid10}>
            {/* Box 1: Organisation */}
            <div style={styles.card}>
              <div style={styles.cardNum}>1</div>
              <div style={styles.cardHead}>
                <Building2 size={16} color="#6366F1" />
                <span>The Organisation</span>
              </div>
              <p style={styles.cardBody}>
                Global Fashion & Apparels Import Company sourcing clothing, footwear, and accessories from international vendors (Vietnam, Bangladesh, China, Turkey, India) supplying Indian retail & eCommerce.
              </p>
              <div style={styles.tagGroup}>
                <span style={styles.tag}>100+ Active Vendors</span>
                <span style={styles.tag}>20+ Countries</span>
              </div>
            </div>

            {/* Box 2: Primary User */}
            <div style={styles.card}>
              <div style={styles.cardNum}>2</div>
              <div style={styles.cardHead}>
                <User size={16} color="#10B981" />
                <span>Primary User Persona</span>
              </div>
              <p style={styles.cardBody}>
                <strong>Vendor Onboarding Executive (Supply Chain)</strong> — Accountable for evaluating, verifying, and onboarding new international vendors as per company policies.
              </p>
              <div style={styles.tagGroup}>
                <span style={styles.tag}>Reports to: Supply Chain Manager</span>
              </div>
            </div>

            {/* Box 3: Secondary User */}
            <div style={styles.card}>
              <div style={styles.cardNum}>3</div>
              <div style={styles.cardHead}>
                <Users size={16} color="#818CF8" />
                <span>Secondary User Persona</span>
              </div>
              <p style={styles.cardBody}>
                <strong>Supply Chain Compliance Manager</strong> — Approves/rejects vendors, overrides AI recommendations, escalates to Legal/Finance, defines onboarding policy rules.
              </p>
            </div>

            {/* Box 4: The Task */}
            <div style={styles.card}>
              <div style={styles.cardNum}>4</div>
              <div style={styles.cardHead}>
                <AlertTriangle size={16} color="#F59E0B" />
                <span>The Task & Pain Point</span>
              </div>
              <p style={styles.cardBody}>
                Review and verify vendor-submitted documents (legal, financial, certificates, compliance) to assess eligibility and risk before onboarding.
              </p>
              <div style={styles.quoteBox}>
                "Checking hundreds of vendor documents manually is time-consuming and we still risk missing critical compliance issues."
              </div>
            </div>

            {/* Box 5: Volume Reality */}
            <div style={styles.card}>
              <div style={styles.cardNum}>5</div>
              <div style={styles.cardHead}>
                <Layers size={16} color="#EC4899" />
                <span>Volume Reality</span>
              </div>
              <ul style={styles.list}>
                <li><strong>40–60</strong> vendor applications per day</li>
                <li><strong>8–12</strong> documents per vendor</li>
                <li><strong>300–600</strong> pages reviewed daily</li>
                <li><strong>~5,000+</strong> document pages reviewed every week</li>
              </ul>
            </div>

            {/* Box 6: Where AI Must Help */}
            <div style={styles.card}>
              <div style={styles.cardNum}>6</div>
              <div style={styles.cardHead}>
                <Cpu size={16} color="#10B981" />
                <span>Where AI Must Help</span>
              </div>
              <ul style={styles.list}>
                <li>Extract key information from documents</li>
                <li>Verify completeness and validity</li>
                <li>Classify risk & compliance score</li>
                <li>Flag missing / inconsistent information</li>
                <li>Summarize vendor profile for fast decision</li>
              </ul>
            </div>

            {/* Box 7: The Override Rule */}
            <div style={styles.card}>
              <div style={styles.cardNum}>7</div>
              <div style={styles.cardHead}>
                <ShieldAlert size={16} color="#EF4444" />
                <span>The Override Rule (HITL)</span>
              </div>
              <p style={styles.cardBody}>
                AI NEVER approves a vendor. Users accept, reject, or edit AI findings and log immutable overrides:
              </p>
              <div style={styles.tagGroup}>
                <span style={styles.tag}>AI Rec</span>
                <span style={styles.tag}>Human Decision</span>
                <span style={styles.tag}>Override Taxonomy Reason</span>
                <span style={styles.tag}>Timestamp & User ID</span>
              </div>
            </div>

            {/* Box 8: Hard Constraints */}
            <div style={styles.card}>
              <div style={styles.cardNum}>8</div>
              <div style={styles.cardHead}>
                <CheckCircle size={16} color="#3B82F6" />
                <span>Three Hard Constraints</span>
              </div>
              <ul style={styles.list}>
                <li><strong>Regulatory:</strong> Comply with Indian import regulations, GST, IEC, labor & environmental laws.</li>
                <li><strong>Technical:</strong> Handle large document volumes securely with data privacy & auditability.</li>
                <li><strong>Operational:</strong> No vendor activated for transactions until mandatory checks are completed.</li>
              </ul>
            </div>

            {/* Box 9: Operational Success Metrics */}
            <div style={styles.cardGreen}>
              <div style={styles.cardNum}>9</div>
              <div style={styles.cardHead}>
                <TrendingUp size={16} color="#10B981" />
                <span>Operational Success Metrics (ROI)</span>
              </div>
              <ul style={styles.listGreen}>
                <li><strong>71% Reduction in Onboarding Time:</strong> 7 days down to 2 days</li>
                <li><strong>60% Reduction</strong> in incomplete / inaccurate applications</li>
                <li><strong>40% Increase</strong> in first-time approval rate</li>
                <li><strong>50% Reduction</strong> in executive manual review effort</li>
              </ul>
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
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modal: {
    width: '1040px',
    maxHeight: '92vh',
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
    padding: '16px 24px',
    background: 'rgba(9, 13, 22, 0.85)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  mainTitle: {
    fontSize: '0.95rem',
    fontWeight: '800',
    letterSpacing: '0.04em',
    color: '#F3F4F6'
  },
  subTitle: {
    fontSize: '0.75rem',
    color: '#9CA3AF'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer'
  },
  body: {
    padding: '24px',
    overflowY: 'auto'
  },
  grid10: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  card: {
    background: 'rgba(17, 23, 38, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative'
  },
  cardGreen: {
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
    gridColumn: 'span 3'
  },
  cardNum: {
    position: 'absolute',
    top: '10px',
    right: '12px',
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#6B7280',
    fontFamily: "'JetBrains Mono', monospace"
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.82rem',
    fontWeight: '700',
    color: '#F3F4F6'
  },
  cardBody: {
    fontSize: '0.78rem',
    color: '#D1D5DB',
    lineHeight: '1.4'
  },
  tagGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: 'auto'
  },
  tag: {
    fontSize: '0.68rem',
    fontWeight: '600',
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#818CF8',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  quoteBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    borderLeft: '3px solid #EF4444',
    padding: '8px 10px',
    fontSize: '0.72rem',
    color: '#FCA5A5',
    fontStyle: 'italic',
    marginTop: '4px'
  },
  list: {
    fontSize: '0.76rem',
    color: '#D1D5DB',
    paddingLeft: '16px',
    lineHeight: '1.5'
  },
  listGreen: {
    fontSize: '0.82rem',
    color: '#34D399',
    paddingLeft: '18px',
    lineHeight: '1.6',
    fontWeight: '500'
  }
};
