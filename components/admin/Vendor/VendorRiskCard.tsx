'use client';

import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Check, AlertTriangle, X, Info } from 'lucide-react';

interface VendorRiskCardProps {
  vendor: any;
}

export interface RiskFactor {
  id: string;
  label: string;
  status: 'passed' | 'warning' | 'failed';
  note?: string;
}

export default function VendorRiskCard({ vendor }: VendorRiskCardProps) {
  const riskAnalysis = useMemo(() => {
    if (!vendor) {
      return {
        score: 78,
        level: 'HIGH',
        recommendation: 'Manual Review Required',
        factors: [
          { id: 'tax', label: 'Tax Certificate', status: 'passed' },
          { id: 'gst', label: 'GST Verified', status: 'passed' },
          { id: 'insurance', label: 'Insurance expires in 7d', status: 'warning' },
          { id: 'address', label: 'Address mismatch across documents', status: 'failed' },
          { id: 'bank', label: 'Bank Letter', status: 'passed' },
        ],
      };
    }

    const docs = vendor.documents || [];
    const hasTaxDoc = docs.some((d: any) => d.code === 'TAX' && (d.status === 'Verified' || d.status === 'Complete'));
    const hasInsurance = docs.some((d: any) => d.code === 'COI' && (d.status === 'Verified' || d.status === 'Complete'));
    const hasBank = docs.some((d: any) => d.code === 'BANK' && (d.status === 'Verified' || d.status === 'Complete'));
    const hasAddressMatch = !docs.some((d: any) => d.fields?.some((f: any) => f.crossDocMismatch && !f.resolved));
    const hasGST = docs.some((d: any) => (d.code === 'GST' || d.code === 'TAX') && d.status !== 'Missing');

    const factors: RiskFactor[] = [
      { id: 'tax', label: 'Tax Certificate', status: hasTaxDoc ? 'passed' : 'warning' },
      { id: 'gst', label: 'GST Registration', status: hasGST ? 'passed' : 'warning' },
      { id: 'insurance', label: 'Liability Insurance', status: hasInsurance ? 'passed' : 'warning' },
      { id: 'address', label: 'Address Match', status: hasAddressMatch ? 'passed' : 'failed' },
      { id: 'bank', label: 'Bank Letter', status: hasBank ? 'passed' : 'warning' },
    ];

    const failedCount = factors.filter((f) => f.status === 'failed').length;
    const warnCount = factors.filter((f) => f.status === 'warning').length;

    let score = 26;
    if (vendor.risk === 'high' || vendor.risk === 'High' || failedCount > 0) score = 78;
    else if (warnCount > 1) score = 48;

    const level = score >= 70 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';
    const recommendation = score >= 70 ? 'Manual Review Required' : score >= 35 ? 'Conditional Approval' : 'Auto Approval Eligible';

    return { score, level, recommendation, factors };
  }, [vendor]);

  const levelColor = riskAnalysis.level === 'HIGH' ? '#E11D48' : riskAnalysis.level === 'MEDIUM' ? '#D97706' : '#059669';
  const levelBg = riskAnalysis.level === 'HIGH' ? '#FFF1F2' : riskAnalysis.level === 'MEDIUM' ? '#FFFBEB' : '#ECFDF5';

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
        VENDOR RISK ENGINE
      </div>

      {/* Score & Level Display */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
        <div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {riskAnalysis.score}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Deterministic Score (0-100)</div>
        </div>
        <span
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 800,
            backgroundColor: levelBg,
            color: levelColor,
            border: `1px solid ${levelColor}30`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {riskAnalysis.level === 'HIGH' ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
          {riskAnalysis.level}
        </span>
      </div>

      {/* Why Breakdown */}
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
        Why?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {riskAnalysis.factors.map((f) => (
          <div
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: f.status === 'passed' ? '#F8FAFC' : f.status === 'warning' ? '#FFFBEB' : '#FFF1F2',
              border: `1px solid ${f.status === 'passed' ? '#F1F5F9' : f.status === 'warning' ? '#FDE68A' : '#FECDD3'}`,
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: f.status === 'passed' ? '#DCFCE7' : f.status === 'warning' ? '#FEF3C7' : '#FFE4E6',
                color: f.status === 'passed' ? '#16A34A' : f.status === 'warning' ? '#D97706' : '#E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {f.status === 'passed' ? <Check size={11} strokeWidth={3} /> : f.status === 'warning' ? '⚠' : <X size={11} strokeWidth={3} />}
            </span>
            <span style={{ fontWeight: 500, color: f.status === 'passed' ? '#475569' : f.status === 'warning' ? '#92400E' : '#991B1B' }}>
              {f.label}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>
          Recommendation
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: levelColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={14} /> {riskAnalysis.recommendation}
        </div>
      </div>
    </div>
  );
}
