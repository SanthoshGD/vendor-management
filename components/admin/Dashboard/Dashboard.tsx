'use client';

import React, { useState, useEffect } from 'react';
import { useNexus } from '../../../context/NexusContext';
import { Plus, ShoppingBag } from 'lucide-react';
import MetricsRow from './MetricsRow';
import PriorityQueue from './PriorityQueue';
import ApprovalRate from './ApprovalRate';
import TrendChart from './TrendChart';
import PipelineFunnel from './PipelineFunnel';
import RecentActivity from './RecentActivity';

interface DashboardProps {
  onNavigate?: (page: string) => void;
  onModal?: (modal: any) => void;
  onOpenVendor?: (vendorId: string, tab?: string) => void;
}

export default function Dashboard({ onNavigate, onModal, onOpenVendor }: DashboardProps) {
  const { vendors, auditLogs } = useNexus();
  const [todayLabel, setTodayLabel] = useState('');

  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }));
  }, []);

  return (
    <div className="nexus-page" style={{ padding: '24px', backgroundColor: '#F8FAFC', minHeight: '100%' }}>
      {/* Header Section */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            {todayLabel}
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
            Admin Operational Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
            Central operational hub for vendor onboarding, document review, and risk management.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onModal && (
            <>
              <button
                type="button"
                className="button secondary"
                onClick={() => onModal({ type: 'invite' })}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <Plus size={14} /> Invite vendor
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => onModal({ type: 'request' })}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: 0,
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <ShoppingBag size={14} /> Create request
              </button>
            </>
          )}
        </div>
      </section>

      {/* Primary Metrics Row (Pending Vendors, In Review, Approved, Rejected) */}
      <MetricsRow vendors={vendors} onNavigate={onNavigate} />

      {/* Row 2: Priority Queue (2/3) + Approval Rate China 93% (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <PriorityQueue vendors={vendors} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
        <ApprovalRate />
      </div>

      {/* Row 3: Approval Trend Line Chart (2/3) + Operational Workflow Pipeline (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <TrendChart vendors={vendors} onDrill={() => onNavigate?.('vendors')} />
        <PipelineFunnel vendors={vendors} onNavigate={onNavigate} />
      </div>

      {/* Row 4: Recent Activity Feed */}
      <RecentActivity auditLogs={auditLogs} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
    </div>
  );
}
