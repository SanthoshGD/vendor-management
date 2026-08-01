'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PIE_COLORS: Record<string, string> = {
  Approved: '#059669',
  Pending: '#D97706',
  Rejected: '#E11D48',
};

export default function ApprovalRate({ onDrill }: { onDrill?: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = [
    { name: 'Approved', value: 93 },
    { name: 'Pending', value: 5 },
    { name: 'Rejected', value: 2 },
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
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>APPROVAL RATE</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>China Region</div>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#059669',
            backgroundColor: '#ECFDF5',
            padding: '3px 10px',
            borderRadius: '9999px',
            border: '1px solid #A7F3D0',
          }}
        >
          China 93%
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          minHeight: '180px',
        }}
        onClick={onDrill}
      >
        <div style={{ height: '100%', width: '55%', minHeight: '180px' }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={4}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={PIE_COLORS[d.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '180px', width: '100%' }} />
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
              93%
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Overall China Approval Rate</div>
          </div>
          {data.map((d) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[d.name], flexShrink: 0 }} />
              <span style={{ color: '#64748B', flex: 1 }}>{d.name}</span>
              <span style={{ fontWeight: 600, color: '#1E293B', fontVariantNumeric: 'tabular-nums' }}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
