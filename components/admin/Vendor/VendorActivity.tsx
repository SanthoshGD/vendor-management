'use client';

import React from 'react';
import { Sparkles, CheckCircle2, Upload, ShieldCheck, Users, Bot, Clock3, Settings, Activity } from 'lucide-react';

interface VendorActivityProps {
  vendor: any;
  auditLogs: any[];
}

const ACTION_META: Record<string, [any, string]> = {
  FIELD_ACCEPT: [CheckCircle2, 'green'],
  FIELD_OVERRIDE: [Sparkles, 'violet'],
  DOCUMENT_UPLOAD: [Upload, 'blue'],
  DOCUMENT_VERIFIED: [CheckCircle2, 'green'],
  DECISION: [ShieldCheck, 'green'],
  VENDOR_INVITED: [Users, 'blue'],
  AI_REVIEW: [Sparkles, 'violet'],
  AGENT_ACTION: [Bot, 'violet'],
  AGENT_BLOCKED: [ShieldCheck, 'red'],
  AGENT_PENDING: [Clock3, 'amber'],
  AGENT_APPROVAL: [CheckCircle2, 'green'],
  AGENT_CONFIG: [Settings, 'blue'],
  GATE_BLOCKED: [ShieldCheck, 'red'],
  ESCALATION_RESOLVED: [ShieldCheck, 'violet'],
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatTime = (iso: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = MONTHS[d.getUTCMonth()];
    const hh  = String(d.getUTCHours()).padStart(2, '0');
    const mm  = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${mon}, ${hh}:${mm}`;
  } catch {
    return iso;
  }
};

export default function VendorActivity({ vendor, auditLogs }: VendorActivityProps) {
  const vendorLogs = auditLogs.filter(log => log.vendorId === vendor.id);

  return (
    <article className="panel vendor-activity-panel">
      <header className="panel-heading">
        <div>
          <span className="section-kicker">Timeline of Events</span>
          <h2>Compliance Audit Trail</h2>
        </div>
      </header>

      <div className="activity-timeline">
        {vendorLogs.length === 0 ? (
          <p className="attention-empty">No activity logs recorded for this supplier.</p>
        ) : (
          vendorLogs.map((log: any, idx: number) => {
            const [Icon, tone] = ACTION_META[log.actionType] || [Activity, 'blue'];
            
            return (
              <div className="timeline-item" key={log.id || idx}>
                <div className={`timeline-badge ${tone}`}>
                  <Icon size={14} />
                </div>
                <div className="timeline-content">
                  <header>
                    <strong>{log.actionType.replace(/_/g, ' ')}</strong>
                    <time>{formatTime(log.timestamp)}</time>
                  </header>
                  <p className="timeline-body">
                    {log.actorName} performed action on <strong>{log.documentName || 'General Workspace'}</strong>
                  </p>
                  {log.fieldLabel && (
                    <div className="timeline-field-change">
                      <span className="field-name">{log.fieldLabel}:</span>
                      {log.originalValue && <span className="old-val">{log.originalValue}</span>}
                      {log.originalValue && <span className="arrow">→</span>}
                      <span className="new-val">{log.humanValue}</span>
                    </div>
                  )}
                  {log.reason && <p className="timeline-notes">Rationale: &quot;{log.reason}&quot;</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
