'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PipelineFunnelProps {
  onNavigate?: (page: string) => void;
}

const FUNNEL = [
  { stage: "Invited", count: 12, pct: 100 },
  { stage: "Profile Submitted", count: 9, pct: 75 },
  { stage: "Doc Review", count: 7, pct: 58 },
  { stage: "Profile Approved", count: 5, pct: 42 },
  { stage: "Products Pending", count: 3, pct: 25 },
  { stage: "Verified", count: 2, pct: 17 },
];

export default function PipelineFunnel({ onNavigate }: PipelineFunnelProps) {
  const max = FUNNEL[0].count;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate('vendors');
    }
  };

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            PIPELINE FUNNEL
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            Vendors across onboarding stages
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#059669',
            backgroundColor: 'transparent',
            border: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            flexShrink: 0,
          }}
        >
          Full pipeline <ChevronRight size={12} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {FUNNEL.map((f) => (
          <button
            key={f.stage}
            type="button"
            onClick={handleClick}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: 0,
              backgroundColor: 'transparent',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            className="group"
          >
            <span
              style={{
                fontSize: '12px',
                color: '#64748B',
                width: '110px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flexShrink: 0,
              }}
            >
              {f.stage}
            </span>
            <div
              style={{
                flex: 1,
                height: '8px',
                backgroundColor: '#F1F5F9',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#10B981',
                  borderRadius: '9999px',
                  width: `${(f.count / max) * 100}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                width: '24px',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}
