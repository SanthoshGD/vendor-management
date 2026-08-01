'use client';

import React from 'react';
import { Sparkles, Trash2, Maximize2, Minimize2, X, CircleDot } from 'lucide-react';

interface ChatHeaderProps {
  onClose: () => void;
  onClear: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function ChatHeader({ onClose, onClear, isExpanded, onToggleExpand }: ChatHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      borderBottom: '1px solid #E2E8F0',
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(16,185,129,0.2)'
        }}>
          <Sparkles size={16} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>AI Compliance Copilot</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '9px',
              fontWeight: 600,
              color: '#059669',
              background: '#ECFDF5',
              padding: '2px 6px',
              borderRadius: '9999px'
            }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Online
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
            <span>Powered by StyleSphere AI</span>
            <span>·</span>
            <span style={{ color: '#059669', fontWeight: 500 }}>Gemini 2.5 Flash</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          onClick={onClear}
          title="Clear Conversation"
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
        >
          <Trash2 size={14} />
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          title={isExpanded ? "Collapse View" : "Expand View"}
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
        >
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close Copilot"
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFF1F2'; e.currentTarget.style.color = '#E11D48'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
