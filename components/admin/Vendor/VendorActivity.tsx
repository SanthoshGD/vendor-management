'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Sparkles,
  Upload, Users, Bot, Clock3, Settings, Filter, FileText, Check
} from 'lucide-react';

interface VendorActivityProps {
  vendor: any;
  auditLogs: any[];
}

const ACTION_META: Record<string, { icon: any; tone: string; category: 'approval' | 'document' | 'system' }> = {
  DECISION: { icon: ShieldCheck, tone: 'green', category: 'approval' },
  APPROVAL: { icon: CheckCircle2, tone: 'green', category: 'approval' },
  REJECTION: { icon: XCircle, tone: 'red', category: 'approval' },
  STAGE_CHANGE: { icon: Activity, tone: 'blue', category: 'system' },
  DOCUMENT_UPLOAD: { icon: Upload, tone: 'blue', category: 'document' },
  DOCUMENT_VERIFIED: { icon: CheckCircle2, tone: 'green', category: 'document' },
  DOCUMENT_REJECTED: { icon: XCircle, tone: 'red', category: 'document' },
  FIELD_ACCEPT: { icon: CheckCircle2, tone: 'green', category: 'document' },
  FIELD_OVERRIDE: { icon: Sparkles, tone: 'violet', category: 'document' },
  VENDOR_INVITED: { icon: Users, tone: 'blue', category: 'system' },
  AI_REVIEW: { icon: Sparkles, tone: 'violet', category: 'system' },
  AGENT_ACTION: { icon: Bot, tone: 'violet', category: 'system' },
  AGENT_BLOCKED: { icon: ShieldCheck, tone: 'red', category: 'approval' },
  AGENT_APPROVAL: { icon: CheckCircle2, tone: 'green', category: 'approval' },
  AUTHORITY_LIMIT_BLOCKED: { icon: AlertTriangle, tone: 'red', category: 'approval' },
  APPROVAL_GATE_BLOCKED: { icon: AlertTriangle, tone: 'red', category: 'approval' },
};

export default function VendorActivity({ vendor, auditLogs }: VendorActivityProps) {
  const [filterCategory, setFilterCategory] = useState<'all' | 'approval' | 'document' | 'system'>('all');

  // Build merged timeline of contextual mock events and real audit logs
  const allLogs = useMemo(() => {
    const defaultEvents = [
      {
        id: 'e1',
        actionType: 'DECISION',
        actorName: vendor?.supervisor || 'Sarah Chen (Super Admin)',
        title: 'Stage Advanced to Doc Review',
        description: `Vendor ${vendor?.company || 'Company'} passed initial profile validation. AI risk score flagged at ${vendor?.baseRiskScore || 26}/100.`,
        reason: 'Profile details validated against government database.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        category: 'approval',
        badge: 'Stage Advanced',
        badgeTone: 'green',
      },
      {
        id: 'e2',
        actionType: 'DOCUMENT_VERIFIED',
        actorName: 'AI Inspector Engine',
        title: 'Document Verified - Supplier Code of Conduct',
        description: 'Automatic OCR signature verification passed with 99% confidence.',
        reason: null,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        category: 'document',
        badge: 'AI Verified',
        badgeTone: 'violet',
      },
      {
        id: 'e3',
        actionType: 'DOCUMENT_UPLOAD',
        actorName: vendor?.name || 'Zhang Weilong',
        title: 'Documents Submitted for Verification',
        description: 'Uploaded Company Registration Certificate, GST/VAT Certificate, and Bank Verification Letter.',
        reason: null,
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        category: 'document',
        badge: 'Submitted',
        badgeTone: 'blue',
      },
      {
        id: 'e4',
        actionType: 'VENDOR_INVITED',
        actorName: 'Elena Rostova (Compliance Lead)',
        title: 'Vendor Onboarding Invited',
        description: `Secure onboarding link dispatched to ${vendor?.email || 'vendor contact'}.`,
        reason: null,
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
        category: 'system',
        badge: 'Invited',
        badgeTone: 'blue',
      },
    ];

    const realLogs = (auditLogs || [])
      .filter((log) => log.vendorId === vendor?.id)
      .map((log) => {
        const meta = ACTION_META[log.actionType] || { icon: Activity, tone: 'blue', category: 'system' };
        return {
          id: log.id,
          actionType: log.actionType,
          actorName: log.actorName || 'Admin System',
          title: log.actionType.replace(/_/g, ' '),
          description: `${log.actorName} performed action on ${log.documentName || 'General Workspace'}`,
          reason: log.reason,
          timestamp: log.timestamp,
          category: meta.category,
          badge: log.humanValue || log.actionType,
          badgeTone: meta.tone,
        };
      });

    return [...realLogs, ...defaultEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, vendor]);

  const filteredLogs = useMemo(() => {
    if (filterCategory === 'all') return allLogs;
    return allLogs.filter((log) => log.category === filterCategory);
  }, [allLogs, filterCategory]);

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            UNIFIED ONBOARDING LOGS & GOVERNANCE
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
            Activity & Approval History
          </h2>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'approval', label: 'Approvals & Governance' },
            { id: 'document', label: 'Document Events' },
            { id: 'system', label: 'System & Audit Logs' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id as any)}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: filterCategory === cat.id ? '1px solid #0F172A' : '1px solid #E2E8F0',
                backgroundColor: filterCategory === cat.id ? '#0F172A' : '#FFFFFF',
                color: filterCategory === cat.id ? '#FFFFFF' : '#475569',
                fontWeight: filterCategory === cat.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
            No activity logs found for this filter category.
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const meta = ACTION_META[log.actionType] || { icon: Activity, tone: 'blue', category: 'system' };
            const Icon = meta.icon;

            const toneBg = log.badgeTone === 'green' ? '#ECFDF5' : log.badgeTone === 'red' ? '#FFF1F2' : log.badgeTone === 'violet' ? '#F5F3FF' : '#F0F9FF';
            const toneColor = log.badgeTone === 'green' ? '#059669' : log.badgeTone === 'red' ? '#E11D48' : log.badgeTone === 'violet' ? '#7C3AED' : '#0284C7';
            const toneBorder = log.badgeTone === 'green' ? '#A7F3D0' : log.badgeTone === 'red' ? '#FECDD3' : log.badgeTone === 'violet' ? '#DDD6FE' : '#BAE6FD';

            return (
              <div key={log.id || index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: toneBg,
                    color: toneColor,
                    border: `1px solid ${toneBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>

                <div style={{ flex: 1, backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{log.title}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: toneBg, color: toneColor, border: `1px solid ${toneBorder}`, fontWeight: 600, textTransform: 'uppercase' }}>
                        {log.badge}
                      </span>
                    </div>
                    <time style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                    Executed by <strong>{log.actorName}</strong> - {log.description}
                  </div>

                  {log.reason && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}>
                      <strong>Rationale / Notes:</strong> &quot;{log.reason}&quot;
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
