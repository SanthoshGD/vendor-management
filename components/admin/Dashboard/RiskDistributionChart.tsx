'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

interface RiskDistributionChartProps {
  vendors?: any[];
  onNavigate?: (page: string) => void;
}

export default function RiskDistributionChart({ vendors = [], onNavigate }: RiskDistributionChartProps) {
  const highRisk = vendors.filter((v) => (v.risk || '').toLowerCase() === 'high').length || 3;
  const mediumRisk = vendors.filter((v) => (v.risk || '').toLowerCase() === 'medium').length || 4;
  const lowRisk = vendors.filter((v) => (v.risk || '').toLowerCase() === 'low').length || 5;
  const total = highRisk + mediumRisk + lowRisk || 12;

  const highPct = Math.round((highRisk / total) * 100);
  const medPct = Math.round((mediumRisk / total) * 100);
  const lowPct = Math.round((lowRisk / total) * 100);

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            VENDOR RISK DISTRIBUTION
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            Active Portfolio Risk Profiling
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('vendors')}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#059669',
            backgroundColor: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
        >
          Filter High Risk →
        </button>
      </div>

      {/* Stacked Progress Bar */}
      <div style={{ height: '10px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', display: 'flex', marginBottom: '20px' }}>
        <div style={{ width: `${highPct}%`, backgroundColor: '#E11D48', transition: 'width 0.3s ease' }} title={`High Risk: ${highRisk}`} />
        <div style={{ width: `${medPct}%`, backgroundColor: '#D97706', transition: 'width 0.3s ease' }} title={`Medium Risk: ${mediumRisk}`} />
        <div style={{ width: `${lowPct}%`, backgroundColor: '#059669', transition: 'width 0.3s ease' }} title={`Low Risk: ${lowRisk}`} />
      </div>

      {/* Risk Metrics Rows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#FFF1F2', border: '1px solid #FECDD3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E11D48', fontSize: '11px', fontWeight: 600 }}>
            <ShieldAlert size={14} /> High Risk
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#991B1B', marginTop: '4px' }}>{highRisk}</div>
          <div style={{ fontSize: '11px', color: '#BE123C', marginTop: '1px' }}>{highPct}% of total</div>
        </div>

        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', fontSize: '11px', fontWeight: 600 }}>
            <AlertTriangle size={14} /> Med Risk
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#92400E', marginTop: '4px' }}>{mediumRisk}</div>
          <div style={{ fontSize: '11px', color: '#B45309', marginTop: '1px' }}>{medPct}% of total</div>
        </div>

        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '11px', fontWeight: 600 }}>
            <ShieldCheck size={14} /> Low Risk
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#065F46', marginTop: '4px' }}>{lowRisk}</div>
          <div style={{ fontSize: '11px', color: '#047857', marginTop: '1px' }}>{lowPct}% of total</div>
        </div>
      </div>
    </article>
  );
}
