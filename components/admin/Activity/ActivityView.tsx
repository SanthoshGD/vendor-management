'use client';

import React, { useState, useMemo } from 'react';
import { useNexus } from '../../../context/NexusContext';
import { 
  CheckCircle2, XCircle, FileText, Users, CircleDot, ChevronRight, Activity 
} from 'lucide-react';

interface ActivityItem {
  id: string;
  actor: string;
  target: string;
  action: string;
  type: 'Approvals' | 'Rejections' | 'Submissions';
  reason?: string | null;
  by: string;
  time: string;
  vendorId?: string;
}

const SEEDED_ACTIVITY: ActivityItem[] = [
  { id: "a1", actor: "Wei Mingzhi", target: "Jinpeng Leather Goods Co.", action: "Approved", type: "Approvals", reason: null, by: "Admin Sarah", time: "10 min ago", vendorId: "v1" },
  { id: "a2", actor: "Sun Fang", target: "Bolin Accessories Ltd.", action: "Rejected", type: "Rejections", reason: "Incomplete product images", by: "Admin Sarah", time: "2 hrs ago", vendorId: "v4" },
  { id: "a3", actor: "Chen Lihua", target: "Dongfang Footwear Export", action: "Submitted", type: "Submissions", reason: "4 of 6 documents uploaded", by: "Liu Yanbo", time: "3 hrs ago", vendorId: "v2" },
  { id: "a4", actor: "Fatima Zahra", target: "Casa Textile SARL", action: "Invited", type: "Submissions", reason: null, by: "Elena Rostova", time: "5 hrs ago", vendorId: "v9" },
  { id: "a5", actor: "Chen Lihua", target: "Dongfang Footwear Export", action: "Approved", type: "Approvals", reason: null, by: "Admin James", time: "Yesterday", vendorId: "v2" },
  { id: "a6", actor: "Liu Hao", target: "Mingde Watch Trading Co.", action: "Rejected", type: "Rejections", reason: "Duplicate vendor entry", by: "Admin James", time: "2 days ago", vendorId: "v5" },
  { id: "a7", actor: "Carlos Reyes", target: "Bogotá Shoes Factory", action: "Verified", type: "Approvals", reason: "5 products verified", by: "Super Admin", time: "3 days ago", vendorId: "v12" },
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
      <CircleDot size={10} strokeWidth={3} />
      {status}
    </span>
  );
}

interface ActivityViewProps {
  onOpenVendor?: (vendorId: string, tab?: string) => void;
}

export default function ActivityView({ onOpenVendor }: ActivityViewProps) {
  const { auditLogs } = useNexus();
  const [filter, setFilter] = useState<string>("All");

  // Combine dynamic context audit logs with seed activities
  const allRows = useMemo(() => {
    const dynamic: ActivityItem[] = auditLogs.map((log: any, idx: number) => {
      let type: 'Approvals' | 'Rejections' | 'Submissions' = 'Submissions';
      let action = 'Submitted';

      if (log.actionType === 'DECISION' || log.actionType === 'FIELD_ACCEPT' || log.actionType === 'DOCUMENT_VERIFIED') {
        type = 'Approvals';
        action = 'Approved';
      } else if (log.actionType === 'GATE_BLOCKED' || log.actionType === 'AGENT_BLOCKED') {
        type = 'Rejections';
        action = 'Rejected';
      }

      return {
        id: `dyn-${log.id || idx}`,
        actor: log.vendorName || 'Vendor',
        target: log.documentName || log.fieldLabel || 'Application',
        action,
        type,
        reason: log.reason || null,
        by: log.actorName || 'System Admin',
        time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        vendorId: log.vendorId,
      };
    });

    // Seed rows fallback when list is small
    const combined = [...dynamic, ...SEEDED_ACTIVITY];
    return combined;
  }, [auditLogs]);

  const filteredRows = useMemo(() => {
    if (filter === "All") return allRows;
    return allRows.filter((r) => r.type === filter);
  }, [allRows, filter]);

  const iconFor = (action: string) => {
    if (action === "Approved" || action === "Verified") return CheckCircle2;
    if (action === "Rejected") return XCircle;
    if (action === "Submitted") return FileText;
    return Users;
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Activity log</h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
          All decisions, submissions and status changes
        </p>
      </div>

      {/* Main Activity Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        {/* Card Header & Filter Strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            RECENT ACTIVITY · {filteredRows.length} ENTRIES
          </span>
          <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '2px', gap: '2px' }}>
            {["All", "Approvals", "Rejections", "Submissions"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: filter === f ? 600 : 400,
                  color: filter === f ? '#0F172A' : '#64748B',
                  backgroundColor: filter === f ? '#FFFFFF' : 'transparent',
                  border: 0,
                  boxShadow: filter === f ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Rows List */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredRows.map((a, idx) => {
            const Icon = iconFor(a.action);
            let tone = "text-violet-600 bg-violet-50";
            if (a.action === "Approved" || a.action === "Verified") tone = "text-emerald-600 bg-emerald-50";
            else if (a.action === "Rejected") tone = "text-rose-600 bg-rose-50";
            else if (a.action === "Submitted") tone = "text-sky-600 bg-sky-50";

            return (
              <div
                key={a.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: idx < filteredRows.length - 1 ? '1px solid #F8FAFC' : 'none',
                  cursor: a.vendorId && onOpenVendor ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (a.vendorId && onOpenVendor) {
                    onOpenVendor(a.vendorId, 'vendor-details');
                  }
                }}
                className="hover:bg-slate-50/70"
              >
                {/* Action Icon Pill */}
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

                {/* Actor & Action Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{a.actor}</span>
                    <span style={{ color: '#94A3B8' }}>—</span>
                    <span>{a.target}</span>
                    <StatusBadge status={a.action} />
                  </div>
                  {a.reason && (
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                      Reason: {a.reason}
                    </div>
                  )}
                </div>

                {/* Right Side Actor & Time */}
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{a.by}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{a.time}</div>
                  </div>
                  {a.vendorId && onOpenVendor && <ChevronRight size={15} style={{ color: '#CBD5E1' }} />}
                </div>
              </div>
            );
          })}

          {filteredRows.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No activity logs match the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
