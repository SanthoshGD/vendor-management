'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';

const PIE_COLORS: Record<string, string> = {
  Approved: '#059669',
  Rejected: '#E11D48',
  Pending: '#D97706',
};

const REGIONS = ['East Asia', 'South Asia', 'West Africa', 'Europe', 'Americas'];

export default function ApprovalRate({ onDrill }: { onDrill?: () => void }) {
  const [scope, setScope] = useState('All regions');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = [
    { name: 'Approved', value: 4 },
    { name: 'Rejected', value: 2 },
    { name: 'Pending', value: 4 },
  ];

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>APPROVAL RATE</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>Decision breakdown</div>
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#475569',
              backgroundColor: '#F1F5F9',
              borderRadius: '6px',
              paddingLeft: '8px',
              paddingRight: '24px',
              paddingTop: '6px',
              paddingBottom: '6px',
              outline: 'none',
              appearance: 'none',
              border: 0,
              cursor: 'pointer',
            }}
          >
            <option>All regions</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <ChevronDown size={11} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          minHeight: '190px',
        }}
        onClick={onDrill}
      >
        <div style={{ height: '100%', width: '58%', minHeight: '190px' }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={3}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={PIE_COLORS[d.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '190px', width: '100%' }} />
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '12px' }}>
          {data.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: PIE_COLORS[d.name], flexShrink: 0 }} />
              <span style={{ color: '#64748B', flex: 1 }}>{d.name}</span>
              <span style={{ fontWeight: 600, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
