'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      width: '100%',
      boxSizing: 'border-box',
      paddingLeft: '4px'
    }}>
      {/* Sparkles avatar */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        backgroundColor: '#ECFDF5',
        border: '1px solid #A7F3D0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#059669',
        flexShrink: 0
      }}>
        <Sparkles size={11} />
      </div>

      {/* Bubble */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '16px',
        borderBottomLeftRadius: '2px',
        backgroundColor: '#FFFFFF',
        color: '#64748B',
        fontSize: '11px',
        fontWeight: 500,
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <span>Thinking</span>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '8px', marginTop: '2px' }}>
          <style>{`
            @keyframes jump {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
          `}</style>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#64748B', display: 'inline-block', animation: 'jump 0.8s infinite 0ms' }} />
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#64748B', display: 'inline-block', animation: 'jump 0.8s infinite 150ms' }} />
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#64748B', display: 'inline-block', animation: 'jump 0.8s infinite 300ms' }} />
        </div>
      </div>
    </div>
  );
}
