'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const WEEKLY = [
  { week: 'W1', approvals: 5 },
  { week: 'W2', approvals: 6 },
  { week: 'W3', approvals: 5 },
  { week: 'W4', approvals: 8 },
  { week: 'W5', approvals: 7 },
  { week: 'W6', approvals: 9 },
  { week: 'W7', approvals: 9 },
  { week: 'W8', approvals: 12 },
];

const WEEKLY_30 = [
  { week: 'Wk 1', approvals: 22 },
  { week: 'Wk 2', approvals: 27 },
  { week: 'Wk 3', approvals: 31 },
  { week: 'Wk 4', approvals: 38 },
];

const WEEKLY_90 = [
  { week: 'M1', approvals: 64 },
  { week: 'M2', approvals: 79 },
  { week: 'M3', approvals: 96 },
];

interface TrendChartProps {
  vendors?: any[];
  onDrill?: () => void;
}

export default function TrendChart({ onDrill }: TrendChartProps) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = range === '7d' ? WEEKLY : range === '30d' ? WEEKLY_30 : WEEKLY_90;
  const deltaLabel = range === '7d' ? '+57% vs prev. 8 weeks' : range === '30d' ? '+18% vs prev. 30 days' : '+22% vs prev. 90 days';

  return (
    <article style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>APPROVAL TREND</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            Weekly approvals — last {range === '7d' ? '8 weeks' : range === '30d' ? '30 days' : '90 days'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
            ↑ {deltaLabel.replace('+', ' ').trim()}
          </span>
          <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 0,
                  fontSize: '12px',
                  fontWeight: range === r ? 600 : 500,
                  cursor: 'pointer',
                  backgroundColor: range === r ? '#FFFFFF' : 'transparent',
                  color: range === r ? '#0F172A' : '#64748B',
                  boxShadow: range === r ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '220px', width: '100%', position: 'relative' }} onClick={onDrill} className="cursor-pointer">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 11, fill: '#94A3B8' }} 
                axisLine={{ stroke: '#E2E8F0' }} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#94A3B8' }} 
                axisLine={false} 
                tickLine={false} 
                width={28} 
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Legend verticalAlign="top" height={24} formatter={() => <span style={{ fontSize: 11, color: '#64748B' }}>Vendor approvals</span>} />
              <Line 
                type="monotone" 
                dataKey="approvals" 
                name="Approvals" 
                stroke="#059669" 
                strokeWidth={2.5} 
                dot={{ r: 4, fill: '#059669' }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', width: '100%' }} />
        )}
      </div>

      <div 
        style={{ fontSize: '12px', color: '#94A3B8', marginTop: '8px', cursor: 'pointer', fontWeight: 500 }}
        onClick={onDrill}
      >
        Click chart to view full approvals report →
      </div>
    </article>
  );
}

export { TrendChart as ApprovalTrendChart };
