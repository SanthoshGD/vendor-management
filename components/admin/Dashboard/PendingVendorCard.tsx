'use client';

import React from 'react';
import { ArrowRight, Clock3, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PendingVendorCardProps {
  vendor: any;
  onOpenVendor?: (vendorId: string, tab?: string) => void;
}

export default function PendingVendorCard({ vendor, onOpenVendor }: PendingVendorCardProps) {
  const missingCount = vendor.documents?.filter((d: any) => d.status === 'Missing').length || 0;
  const progressVal = vendor.progress || 0;

  return (
    <div className="pending-vendor-card panel">
      <div className="card-header-row">
        <span className="company-avatar">{vendor.initials}</span>
        <div className="company-info">
          <h3>{vendor.name}</h3>
          <small>{vendor.country} / {vendor.category}</small>
        </div>
        <span className={`risk-badge ${vendor.risk === 'High' ? 'red' : vendor.risk === 'Medium' ? 'amber' : 'green'}`}>
          {vendor.risk} ({vendor.riskScore})
        </span>
      </div>

      <div className="card-body-metrics">
        <div className="metric-item">
          <small>Onboarding Status</small>
          <strong>{vendor.stage}</strong>
        </div>
        <div className="metric-item">
          <small>Evidence Pack</small>
          <strong>{vendor.docs} docs</strong>
        </div>
        <div className="metric-item">
          <small>SLA Urgency</small>
          <span className={vendor.slaHours <= 6 ? 'urgent text-rose-600 font-semibold' : 'text-slate-500'}>
            <Clock3 size={11} className="inline mr-1" />
            {vendor.sla}
          </span>
        </div>
      </div>

      <div className="card-progress">
        <div className="progress-bar-label">
          <span>Readiness</span>
          <span>{progressVal}%</span>
        </div>
        <div className="progress">
          <i style={{ width: `${progressVal}%` }} />
        </div>
      </div>

      {missingCount > 0 && (
        <div className="card-issues-warning">
          <AlertCircle size={14} className="text-amber-600" />
          <span>Missing {missingCount} required document(s)</span>
        </div>
      )}

      {missingCount === 0 && (
        <div className="card-issues-success">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>All documents submitted & check complete</span>
        </div>
      )}

      <button 
        type="button" 
        className="button primary compact full card-action-btn"
        onClick={() => onOpenVendor?.(vendor.id, 'vendor-details')}
      >
        <span>Open Compliance workspace</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
