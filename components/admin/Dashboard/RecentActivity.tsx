'use client';

import React from 'react';
import { 
  CheckCircle2, XCircle, FileText, Users, ChevronRight, Activity, CircleDot, ArrowRight
} from 'lucide-react';

interface RecentActivityProps {
  auditLogs: any[];
  onOpenVendor?: (vendorId: string, tab?: string) => void;
  onNavigate?: (page: string) => void;
}

const SEEDED_ACTIVITIES = [
  { id: "a1", actor: "Wei Mingzhi", target: "Jinpeng Leather Goods Co.", action: "Approved", by: "Admin Sarah", time: "10 min ago", vendorId: "v1" },
  { id: "a2", actor: "Sun Fang", target: "Bolin Accessories Ltd.", action: "Rejected", reason: "Incomplete product images", by: "Admin Sarah", time: "2 hrs ago", vendorId: "v4" },
  { id: "a3", actor: "Chen Lihua", target: "Dongfang Footwear Export", action: "Submitted", reason: "4 of 6 documents uploaded", by: "Liu Yanbo", time: "3 hrs ago", vendorId: "v2" },
  { id: "a4", actor: "Fatima Zahra", target: "Casa Textile SARL", action: "Invited", by: "Elena Rostova", time: "5 hrs ago", vendorId: "v9" },
  { id: "a5", actor: "Carlos Reyes", target: "Bogotá Shoes Factory", action: "Verified", reason: "5 products verified", by: "Super Admin", time: "3 days ago", vendorId: "v12" },
];

function StatusBadge({ status }: { status: string }) {
  let style = "bg-slate-100 text-slate-600";
  if (status === "Approved" || status === "Verified") {
    style = "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  } else if (status === "Rejected") {
    style = "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200";
  } else if (status === "Submitted") {
    style = "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200";
  } else if (status === "Invited") {
    style = "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${style}`}>
      <CircleDot size={9} strokeWidth={3} />
      {status}
    </span>
  );
}

export default function RecentActivity({ auditLogs, onOpenVendor, onNavigate }: RecentActivityProps) {
  const dynamicLogs = (auditLogs || []).map((log: any, i: number) => {
    let action = 'Submitted';
    if (log.actionType === 'DECISION' || log.actionType === 'FIELD_ACCEPT' || log.actionType === 'DOCUMENT_VERIFIED') {
      action = 'Approved';
    } else if (log.actionType === 'GATE_BLOCKED' || log.actionType === 'AGENT_BLOCKED') {
      action = 'Rejected';
    }
    return {
      id: log.id || `dyn-${i}`,
      actor: log.vendorName || 'Vendor',
      target: log.documentName || log.fieldLabel || 'Application',
      action,
      reason: log.reason || null,
      by: log.actorName || 'Admin',
      time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
      vendorId: log.vendorId,
    };
  });

  const displayList = [...dynamicLogs, ...SEEDED_ACTIVITIES].slice(0, 5);

  const iconFor = (action: string) => {
    if (action === "Approved" || action === "Verified") return CheckCircle2;
    if (action === "Rejected") return XCircle;
    if (action === "Submitted") return FileText;
    return Users;
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'UPPERCASE' }}>
            RECENT ACTIVITY
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            All decisions, submissions and status changes
          </div>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('activity')}
            style={{ fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: 'transparent', border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            All activity <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {displayList.map((a) => {
          const Icon = iconFor(a.action);
          let tone = "text-violet-600 bg-violet-50";
          if (a.action === "Approved" || a.action === "Verified") tone = "text-emerald-600 bg-emerald-50";
          else if (a.action === "Rejected") tone = "text-rose-600 bg-rose-50";
          else if (a.action === "Submitted") tone = "text-sky-600 bg-sky-50";

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpenVendor?.(a.vendorId, 'vendor-details')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #F1F5F9',
                backgroundColor: '#FFFFFF',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              className="hover:bg-slate-50"
            >
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                className={tone}
              >
                <Icon size={15} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{a.actor}</span>
                  <span style={{ color: '#94A3B8' }}>—</span>
                  <span style={{ color: '#475569' }}>{a.target}</span>
                  <StatusBadge status={a.action} />
                </div>
                {a.reason && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Reason: {a.reason}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{a.by}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{a.time}</div>
                </div>
                <ChevronRight size={14} style={{ color: '#CBD5E1' }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
