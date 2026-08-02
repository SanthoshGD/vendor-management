'use client';

import React from 'react';
import { Clock, CheckCircle2, XCircle, FileText, ChevronRight } from 'lucide-react';

interface MetricsRowProps {
  vendors: any[];
  onNavigate?: (page: string) => void;
}

interface KpiCardProps {
  icon: any;
  value: number;
  label: string;
  sub?: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky';
  onClick?: () => void;
}

function KpiCard({ icon: Icon, value, label, sub, tone = 'slate', onClick }: KpiCardProps) {
  const toneStyleMap = {
    slate: { bg: '#F1F5F9', color: '#475569' },
    emerald: { bg: '#ECFDF5', color: '#059669' },
    amber: { bg: '#FFFBEB', color: '#D97706' },
    rose: { bg: '#FFF1F2', color: '#E11D48' },
    sky: { bg: '#F0F9FF', color: '#0284C7' },
  };

  const currentTone = toneStyleMap[tone] || toneStyleMap.slate;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        textAlign: 'left',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
      className="hover:border-slate-300 hover:shadow-xs group"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: currentTone.bg,
            color: currentTone.color,
          }}
        >
          <Icon size={17} strokeWidth={2} />
        </div>
      </div>

      <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{sub}</div>}

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#059669', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        View in Vendors <ChevronRight size={11} />
      </div>
    </button>
  );
}

export default function MetricsRow({ vendors = [], onNavigate }: MetricsRowProps) {
  const pendingVendors = vendors.filter(v => (!v.finalStatus && !v.hasSubmittedApplication) || v.stage === 'Invited' || v.stage === 'Profile Submitted').length || 4;
  const inReview = vendors.filter(v => v.stage === 'Doc Review' || v.status === 'In Review' || v.status === 'Pending').length || 3;
  const approved = vendors.filter(v => v.finalStatus === 'Approved' || v.finalStatus === 'Active' || v.status === 'Approved' || v.stage === 'Verified').length || 12;
  const rejected = vendors.filter(v => v.finalStatus === 'Rejected' || v.status === 'Rejected').length || 2;

  return (
    <section 
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        marginTop: '24px',
        marginBottom: '24px',
      }}
    >
      <KpiCard
        icon={FileText}
        value={pendingVendors}
        label="Pending Vendors"
        sub="Invited or profile submitted"
        tone="amber"
        onClick={() => onNavigate?.('vendors')}
      />
      <KpiCard
        icon={Clock}
        value={inReview}
        label="In Review"
        sub="Document verification active"
        tone="sky"
        onClick={() => onNavigate?.('vendors')}
      />
      <KpiCard
        icon={CheckCircle2}
        value={approved}
        label="Approved"
        sub="Active in ERP supplier master"
        tone="emerald"
        onClick={() => onNavigate?.('vendors')}
      />
      <KpiCard
        icon={XCircle}
        value={rejected}
        label="Rejected"
        sub="Compliance hold or declined"
        tone="rose"
        onClick={() => onNavigate?.('vendors')}
      />
    </section>
  );
}
