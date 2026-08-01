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
import RiskDistributionChart from './RiskDistributionChart';

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
            Central operational hub — what requires your attention today?
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
                  borderRadius: '10px',
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
                  borderRadius: '10px',
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

      {/* Row 1: Top Metrics (Pending | In Review | Approved | Rejected) */}
      <MetricsRow vendors={vendors} onNavigate={onNavigate} />

      {/* Row 2: Approval Trend (2/3) + Priority Queue (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <TrendChart vendors={vendors} onDrill={() => onNavigate?.('vendors')} />
        <PriorityQueue vendors={vendors} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
      </div>

      {/* Row 3: Pipeline Funnel (1/2) + Recent Activity (1/2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <PipelineFunnel vendors={vendors} onNavigate={onNavigate} />
        <RecentActivity auditLogs={auditLogs} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
      </div>

      {/* Row 4: Vendor Risk Distribution (1/2) + China Approval Rate (1/2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <RiskDistributionChart vendors={vendors} onNavigate={onNavigate} />
        <ApprovalRate />
      </div>
    </div>
  );
}
