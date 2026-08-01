'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface VendorRiskCardProps {
  vendor: any;
}

export default function VendorRiskCard({ vendor }: VendorRiskCardProps) {
  const riskAnalysis = useMemo(() => {
    const docs = vendor.documents || [];
    const taxDoc = docs.find((d: any) => d.code === 'TAX');
    const coiDoc = docs.find((d: any) => d.code === 'COI');
    const bankDoc = docs.find((d: any) => d.code === 'BANK');

    // Deterministic rules
    const taxMissing = !taxDoc || taxDoc.status === 'Missing';
    const taxFlagged = taxDoc?.status === 'Flagged' || taxDoc?.status === 'Rejected';
    const taxVerified = taxDoc?.status === 'Verified';

    const bankMissing = !bankDoc || bankDoc.status === 'Missing';
    const bankVerified = bankDoc?.status === 'Verified';

    const coiMissing = !coiDoc || coiDoc.status === 'Missing';
    const coiFlagged = coiDoc?.status === 'Flagged' || coiDoc?.status === 'Rejected';
    const coiVerified = coiDoc?.status === 'Verified';
    
    // Scan fields for mismatches
    const hasAddressMismatch = docs.flatMap((d: any) => d.fields || []).some(
      (f: any) => f.crossDocMismatch || /address/i.test(f.label || '') && f.diagnostic
    );

    const coiExpiresSoon = docs.some(
      (d: any) => d.code === 'COI' && (d.fields || []).some((f: any) => /expir/i.test(f.key) && /expir/i.test(f.diagnostic || ''))
    );

    // Calculate deterministic risk score
    let score = 30; // base score
    if (taxMissing) score += 20;
    if (taxFlagged) score += 15;
    if (bankMissing) score += 20;
    if (coiMissing) score += 15;
    if (coiFlagged) score += 10;
    if (coiExpiresSoon) score += 10;
    if (hasAddressMismatch) score += 15;

    score = Math.min(100, Math.max(10, score));

    let riskLevel = 'Low Risk';
    let riskTone = 'green';
    if (score >= 70) {
      riskLevel = 'High Risk';
      riskTone = 'red';
    } else if (score >= 35) {
      riskLevel = 'Medium Risk';
      riskTone = 'amber';
    }

    const drivers = [
      {
        label: taxVerified 
          ? 'Tax Registration Verified' 
          : taxMissing 
            ? 'Tax Certificate Missing' 
            : 'Tax Certificate Pending/Flagged',
        state: taxVerified ? 'success' : taxMissing ? 'danger' : 'warning'
      },
      {
        label: hasAddressMismatch 
          ? 'Address Mismatch Flagged' 
          : 'Address Verification Matched',
        state: hasAddressMismatch ? 'warning' : 'success'
      },
      {
        label: coiVerified 
          ? coiExpiresSoon 
            ? 'Insurance Expires Soon' 
            : 'Insurance Verification Active' 
          : coiMissing 
            ? 'Insurance Certificate Missing' 
            : 'Insurance Pending Review',
        state: coiVerified ? (coiExpiresSoon ? 'warning' : 'success') : coiMissing ? 'danger' : 'warning'
      },
      {
        label: bankVerified 
          ? 'Bank Proof Verified' 
          : bankMissing 
            ? 'Bank Proof Missing' 
            : 'Bank Verification Pending',
        state: bankVerified ? 'success' : bankMissing ? 'danger' : 'warning'
      }
    ];

    return { score, riskLevel, riskTone, drivers };
  }, [vendor]);

  return (
    <article className="panel vendor-risk-card">
      <span className="section-kicker">Risk Assessment</span>
      
      <div className="risk-score-display">
        <div className={`risk-score-circle ${riskAnalysis.riskTone}`}>
          <strong>{riskAnalysis.score}</strong>
          <small>/ 100</small>
        </div>
        <div className="risk-level-meta">
          <h3 className={`risk-level-text ${riskAnalysis.riskTone}`}>{riskAnalysis.riskLevel}</h3>
          <p className="risk-desc">Calculated via deterministic compliance scoring engine.</p>
        </div>
      </div>

      <div className="risk-drivers-list">
        <h4 className="drivers-title">Compliance Drivers</h4>
        {riskAnalysis.drivers.map((driver, idx) => (
          <div className="driver-row" key={idx}>
            {driver.state === 'success' && <CheckCircle2 className="text-emerald-600" size={16} />}
            {driver.state === 'warning' && <AlertTriangle className="text-amber-500" size={16} />}
            {driver.state === 'danger' && <XCircle className="text-rose-600" size={16} />}
            <span className={`driver-label ${driver.state}`}>{driver.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
