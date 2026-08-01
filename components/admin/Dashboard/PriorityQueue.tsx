'use client';

import React from 'react';
import { FileText, Sparkles, Zap } from 'lucide-react';

interface PriorityQueueProps {
  vendors?: any[];
  onOpenVendor?: (vendorId: string) => void;
  onNavigate?: (page: string) => void;
}

const DOCUMENTS = [
  { id: "d1", title: "Company Registration Certificate", vendor: "Zhang Weilong", company: "Hualong Garment Factory", pages: 5, confidence: 41, risk: "high" },
  { id: "d2", title: "GST / VAT Certificate", vendor: "Meera Nair", company: "Nair Global Exports Pvt. Ltd.", pages: 2, confidence: 62, risk: "medium" },
  { id: "d3", title: "Supplier Code of Conduct Sign-off", vendor: "Chen Lihua", company: "Dongfang Footwear Export", pages: 4, confidence: 99, risk: "low" },
  { id: "d4", title: "Bank Account Verification Letter", vendor: "Meera Nair", company: "Nair Global Exports Pvt. Ltd.", pages: 1, confidence: 88, risk: "low" },
];

const BADGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  high: { bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3' },
  medium: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  low: { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
};

function ConfidenceBadge({ confidence, risk }: { confidence: number; risk: string }) {
  const style = BADGE_STYLES[risk] || BADGE_STYLES.low;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      <Sparkles size={11} />
      {confidence}%
    </span>
  );
}

export default function PriorityQueue({ onNavigate }: PriorityQueueProps) {
  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>SMART QUEUE</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            Today's review queue — prioritized by AI risk &amp; SLA, not FIFO
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('onboarding')}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: '8px',
            border: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Zap size={13} /> Start review
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {DOCUMENTS.map((d, index) => (
          <div
            key={d.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '10px',
              paddingBottom: '10px',
              borderTop: index > 0 ? '1px solid #F1F5F9' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <FileText size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.title}
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.vendor} · {d.company}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '16px' }}>
              <ConfidenceBadge confidence={d.confidence} risk={d.risk} />
              <kbd
                style={{
                  fontSize: '12px',
                  color: '#94A3B8',
                  border: '1px solid #E2E8F0',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontFamily: 'monospace',
                }}
              >
                A / R
              </kbd>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #F8FAFC' }}>
        Tip: split-pane review supports keyboard shortcuts (A approve, R reject, ↓ next) for high-volume days.
      </div>
    </article>
  );
}
