'use client';

import React from 'react';
import { Users, Clock, CheckCircle2, Zap, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

interface MetricsRowProps {
  vendors: any[];
  onNavigate?: (page: string) => void;
}

interface KpiCardProps {
  icon: any;
  value: string | number;
  label: string;
  sub?: string;
  trend?: string;
  trendDir?: 'up' | 'down';
  tone?: 'slate' | 'emerald' | 'amber' | 'sky' | 'violet';
  onClick?: () => void;
}

function KpiCard({ icon: Icon, value, label, sub, trend, trendDir = 'up', tone = 'slate', onClick }: KpiCardProps) {
  const toneStyleMap = {
    slate: { bg: '#F1F5F9', color: '#475569' },
    emerald: { bg: '#ECFDF5', color: '#059669' },
    amber: { bg: '#FFFBEB', color: '#D97706' },
    sky: { bg: '#F0F9FF', color: '#0284C7' },
    violet: { bg: '#F5F3FF', color: '#7C3AED' },
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
        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '12px',
              fontWeight: 500,
              color: trendDir === 'up' ? '#059669' : '#E11D48',
            }}
          >
            {trendDir === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend}
          </span>
        )}
      </div>

      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', color: '#64748B', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{sub}</div>}

      <div className="mt-3 h-0 group-hover:h-4 overflow-hidden transition-all">
        <span style={{ fontSize: '12px', color: '#059669', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
          View detail <ChevronRight size={11} />
        </span>
      </div>
    </button>
  );
}

export default function MetricsRow({ vendors, onNavigate }: MetricsRowProps) {
  const totalCount = vendors.length || 12;
  const pendingCount = vendors.filter(v => v.hasSubmittedApplication && !v.finalStatus).length || 4;
  const approvedCount = vendors.filter(v => v.finalStatus === 'Approved' || v.finalStatus === 'Active').length || 4;

  return (
    <section 
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '16px',
        marginTop: '24px',
        marginBottom: '24px',
      }}
    >
      <KpiCard
        icon={Users}
        value={totalCount}
        label="Total vendors"
        sub="+3 this week"
        trend="+3"
        tone="slate"
        onClick={() => onNavigate?.('vendors')}
      />
      <KpiCard
        icon={Clock}
        value={pendingCount}
        label="Pending review"
        sub="5 docs queued"
        trend="On track"
        tone="amber"
        onClick={() => onNavigate?.('onboarding')}
      />
      <KpiCard
        icon={CheckCircle2}
        value={approvedCount}
        label="Approved this month"
        sub="33% approval rate"
        trend="+12%"
        tone="emerald"
        onClick={() => onNavigate?.('vendors')}
      />
      <KpiCard
        icon={Zap}
        value="2.4d"
        label="Avg. turnaround"
        sub="↓ 0.6d vs last month"
        trend="-0.6d"
        trendDir="up"
        tone="sky"
        onClick={() => onNavigate?.('vendors')}
      />
    </section>
  );
}
