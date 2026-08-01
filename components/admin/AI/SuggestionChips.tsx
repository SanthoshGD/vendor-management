'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

const CHIPS = [
  'Show pending vendors',
  'Why is Shanghai Textile high risk?',
  'Which insurance expires next week?',
  'Find rejected vendors',
  'List suppliers from China',
  'Generate approval summary'
];

export default function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div style={{
      padding: '8px 12px',
      borderTop: '1px solid #EEF2F6',
      backgroundColor: '#FAFCFF',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Sparkles size={10} style={{ color: '#059669' }} />
        Suggested Prompts
      </div>
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: '2px',
        flexWrap: 'nowrap'
      }}>
        {CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(chip)}
            style={{
              flex: '0 0 auto',
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10B981';
              e.currentTarget.style.backgroundColor = '#ECFDF5';
              e.currentTarget.style.color = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#334155';
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
