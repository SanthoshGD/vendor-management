'use client';

import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Check, AlertTriangle, Info } from 'lucide-react';

interface VendorRiskCardProps {
  vendor: any;
}

export interface RiskFactor {
  id: string;
  label: string;
  passed: boolean;
  impactPoints: number;
  note?: string;
}

export default function VendorRiskCard({ vendor }: VendorRiskCardProps) {
  const riskAnalysis = useMemo(() => {
    if (!vendor) return { score: 15, level: 'Low Risk', factors: [] };

    const docs = vendor.documents || [];
    const hasTaxDoc = docs.some((d: any) => d.code === 'TAX' && (d.status === 'Verified' || d.status === 'Complete'));
    const hasInsurance = docs.some((d: any) => d.code === 'COI' && (d.status === 'Verified' || d.status === 'Complete'));
    const hasBank = docs.some((d: any) => d.code === 'BANK' && (d.status === 'Verified' || d.status === 'Complete'));
    const hasAddressMatch = !docs.some((d: any) => d.fields?.some((f: any) => f.crossDocMismatch && !f.resolved));
    const hasGST = docs.some((d: any) => (d.code === 'GST' || d.code === 'TAX') && d.status !== 'Missing');

    const factors: RiskFactor[] = [
      { id: 'tax', label: 'Tax Registration Verified', passed: hasTaxDoc, impactPoints: 20, note: hasTaxDoc ? 'Government ID matched' : 'Tax document pending verification' },
      { id: 'insurance', label: 'Insurance Valid', passed: hasInsurance, impactPoints: 25, note: hasInsurance ? 'Liability policy active' : 'Missing or expired insurance' },
      { id: 'address', label: 'Address Match Across Documents', passed: hasAddressMatch, impactPoints: 15, note: hasAddressMatch ? 'Registered address consistent' : 'Address mismatch detected across files' },
      { id: 'bank', label: 'Bank Verification Letter', passed: hasBank, impactPoints: 20, note: hasBank ? 'Bank account confirmed' : 'Missing bank confirmation letter' },
      { id: 'gst', label: 'GST / Business License Verified', passed: hasGST, impactPoints: 20, note: hasGST ? 'GST number active' : 'GST validation pending' },
    ];

    let penaltyScore = 0;
    factors.forEach(f => {
      if (!f.passed) penaltyScore += f.impactPoints;
    });

    // Base score calculation (0 to 100, lower is safer)
    const rawScore = Math.min(100, Math.max(5, penaltyScore + (vendor.risk === 'high' || vendor.risk === 'High' ? 20 : 0)));
    const level = rawScore >= 60 ? 'High Risk' : rawScore >= 30 ? 'Medium Risk' : 'Low Risk';
    const badgeColor = rawScore >= 60 ? '#E11D48' : rawScore >= 30 ? '#D97706' : '#059669';
    const badgeBg = rawScore >= 60 ? '#FFF1F2' : rawScore >= 30 ? '#FFFBEB' : '#ECFDF5';

    return { score: rawScore, level, badgeColor, badgeBg, factors };
  }, [vendor]);

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            VENDOR RISK SCORE
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            Rule-Based Explainable Assessment
          </div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: riskAnalysis.badgeBg,
            color: riskAnalysis.badgeColor,
            border: `1px solid ${riskAnalysis.badgeColor}30`,
          }}
        >
          {riskAnalysis.score >= 60 ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
          {riskAnalysis.level}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
        <span style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
          {riskAnalysis.score}
        </span>
        <span style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 500 }}>/ 100</span>
      </div>

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>
        Risk Drivers &amp; Validations:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {riskAnalysis.factors.map((factor) => (
          <div
            key={factor.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              padding: '8px 10px',
              borderRadius: '8px',
              backgroundColor: factor.passed ? '#F8FAFC' : '#FFF1F2',
              border: `1px solid ${factor.passed ? '#E2E8F0' : '#FECDD3'}`,
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: factor.passed ? '#DCFCE7' : '#FFE4E6',
                color: factor.passed ? '#16A34A' : '#E11D48',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              {factor.passed ? <Check size={11} strokeWidth={3} /> : <AlertTriangle size={11} strokeWidth={2.5} />}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: factor.passed ? '#334155' : '#991B1B' }}>
                {factor.label}
              </div>
              {factor.note && (
                <div style={{ fontSize: '11px', color: factor.passed ? '#64748B' : '#BE123C', marginTop: '1px' }}>
                  {factor.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
