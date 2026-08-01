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
    <div className="nexus-page">
      {/* Header Section */}
      <section className="page-hero">
        <div>
          <span className="eyebrow">{todayLabel}</span>
          <h1>Overview</h1>
          <p>Decisions waiting on your team.</p>
        </div>
        <div className="page-actions">
          {onModal && (
            <>
              <button className="button secondary" onClick={() => onModal({ type: 'invite' })}>
                <Plus size={15} /> Invite vendor
              </button>
              <button className="button primary" onClick={() => onModal({ type: 'request' })}>
                <ShoppingBag size={15} /> Create request
              </button>
            </>
          )}
        </div>
      </section>

      {/* Primary KPI row */}
      <MetricsRow vendors={vendors} onNavigate={onNavigate} />

      {/* Row 2: Smart Queue (2/3 width) + Decision Breakdown Pie Chart (1/3 width) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <PriorityQueue vendors={vendors} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
        <ApprovalRate />
      </div>

      {/* Row 3: Approval Trend Line Chart (2/3 width) + Pipeline Funnel (1/3 width) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <TrendChart vendors={vendors} />
        <PipelineFunnel onNavigate={onNavigate} />
      </div>

      {/* Row 4: Recent Activity Feed */}
      <RecentActivity auditLogs={auditLogs} onOpenVendor={onOpenVendor} onNavigate={onNavigate} />
    </div>
  );
}
