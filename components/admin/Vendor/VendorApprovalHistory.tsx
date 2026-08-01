'use client';

import React from 'react';
import { ShieldCheck, XCircle, AlertCircle, Clock3 } from 'lucide-react';

interface VendorApprovalHistoryProps {
  vendor: any;
  auditLogs: any[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatLongTime = (iso: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = MONTHS[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hh  = String(d.getUTCHours()).padStart(2, '0');
    const mm  = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${mon} ${year}, ${hh}:${mm}`;
  } catch {
    return iso;
  }
};

export default function VendorApprovalHistory({ vendor, auditLogs }: VendorApprovalHistoryProps) {
  // Filter for decisions or limit overrides on this vendor
  const decisionLogs = auditLogs.filter(
    log => log.vendorId === vendor.id && 
    (log.actionType === 'DECISION' || log.actionType === 'AUTHORITY_LIMIT_BLOCKED' || log.actionType === 'APPROVAL_GATE_BLOCKED')
  );

  return (
    <article className="panel vendor-approval-history-panel">
      <header className="panel-heading">
        <div>
          <span className="section-kicker">Review Governance</span>
          <h2>Administrative Decisions Log</h2>
        </div>
      </header>

      <div className="approval-history-list">
        {decisionLogs.length === 0 ? (
          <p className="attention-empty">No administrative decisions have been recorded for this supplier yet.</p>
        ) : (
          decisionLogs.map((log: any, idx: number) => {
            const isApprove = log.humanValue === 'Approved' || log.originalValue === 'Approved' || log.actionType === 'DECISION' && /approve/i.test(log.reason || '');
            const isBlocked = log.actionType === 'AUTHORITY_LIMIT_BLOCKED' || log.actionType === 'APPROVAL_GATE_BLOCKED';
            
            let statusLabel = 'Decision Logged';
            let statusTone = 'blue';
            let Icon = Clock3;

            if (isBlocked) {
              statusLabel = 'Block Action';
              statusTone = 'red';
              Icon = AlertCircle;
            } else if (isApprove) {
              statusLabel = 'Approved';
              statusTone = 'green';
              Icon = ShieldCheck;
            } else if (/reject/i.test(log.reason || '')) {
              statusLabel = 'Rejected';
              statusTone = 'red';
              Icon = XCircle;
            }

            return (
              <div className="approval-history-row" key={log.id || idx}>
                <div className={`history-icon-wrapper ${statusTone}`}>
                  <Icon size={16} />
                </div>
                <div className="history-details-col">
                  <header>
                    <span className={`status-pill ${statusTone}`}>{statusLabel}</span>
                    <time>{formatLongTime(log.timestamp)}</time>
                  </header>
                  <p className="history-action-text">
                    Action executed by <strong>{log.actorName}</strong> ({log.actorId})
                  </p>
                  <p className="history-reason-notes">
                    <strong>Rationale:</strong> &quot;{log.reason || 'Initial verification evaluation.'}&quot;
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
