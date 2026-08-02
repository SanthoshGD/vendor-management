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
    <div className="nexus-page" style={{ padding: 'clamp(12px, 3vw, 24px)', backgroundColor: '#F8FAFC', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Header Section */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            {todayLabel}
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
            Admin Operational Control Center
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
            Central operational hub - live vendor metrics, approval trends, and priority queue
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

      {/* Row 1: Top Metrics Summary */}
      <MetricsRow vendors={vendors} onNavigate={onNavigate} />

      {/* Sequence 1 & 2: 1. Approval Trend (2/3) + 2. Approval Rate China (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <TrendChart vendors={vendors} onDrill={() => onNavigate?.('vendors')} />
        <ApprovalRate />
      </div>

      {/* Sequence 3 & 4: 3. Priority Queue (1/2) + 4. Recent Activity (1/2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <PriorityQueue vendors={vendors} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
        <RecentActivity auditLogs={auditLogs} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
      </div>

      {/* Sequence 5 & 6: 5. Vendor Pipeline Workflow (1/2) + 6. Vendor Risk Distribution (1/2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <PipelineFunnel vendors={vendors} onNavigate={onNavigate} />
        <RiskDistributionChart vendors={vendors} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
