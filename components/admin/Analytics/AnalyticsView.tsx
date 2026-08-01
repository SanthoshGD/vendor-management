'use client';

import React from 'react';
import { 
  BarChart2, TrendingUp, Clock, Globe, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import TrendChart from '../Dashboard/TrendChart';
import PipelineFunnel from '../Dashboard/PipelineFunnel';
import RiskDistributionChart from '../Dashboard/RiskDistributionChart';

interface AnalyticsViewProps {
  onNavigate?: (page: string) => void;
}

export default function AnalyticsView({ onNavigate }: AnalyticsViewProps) {
  const countryStats = [
    { country: 'China', count: 42, pct: 45 },
    { country: 'India', count: 24, pct: 26 },
    { country: 'Vietnam', count: 14, pct: 15 },
    { country: 'Turkey', count: 8, pct: 9 },
    { country: 'Colombia', count: 5, pct: 5 },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#F8FAFC', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Analytics &amp; Performance</h1>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
          Real-time metrics across approval rates, SLA turnaround, and risk distribution
        </p>
      </div>

      {/* Top 4 Key Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '12px', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Approval Rate
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>93%</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>China sourcing region</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', fontSize: '12px', fontWeight: 600 }}>
            <Clock size={16} /> Avg. Review Time
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>2.4 days</div>
          <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>↓ 0.6d vs last month</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7C3AED', fontSize: '12px', fontWeight: 600 }}>
            <Globe size={16} /> Active Regions
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>5 countries</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>East Asia leading (45%)</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E11D48', fontSize: '12px', fontWeight: 600 }}>
            <ShieldAlert size={16} /> High Risk Ratio
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>15%</div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Under manual review</div>
        </div>
      </div>

      {/* Row 2: Monthly Trend (2/3) + Country Distribution (1/3) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <TrendChart onDrill={() => onNavigate?.('vendors')} />

        {/* Country Distribution */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
            COUNTRY DISTRIBUTION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {countryStats.map((c) => (
              <div key={c.country}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  <span>{c.country}</span>
                  <span>{c.pct}% ({c.count})</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: '#0F172A', width: `${c.pct}%`, borderRadius: '9999px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Approval Funnel (1/2) + Risk Distribution (1/2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <PipelineFunnel onNavigate={onNavigate} />
        <RiskDistributionChart onNavigate={onNavigate} />
      </div>
    </div>
  );
}
