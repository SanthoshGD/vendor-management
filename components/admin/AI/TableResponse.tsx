'use client';

import React from 'react';
import { AICopilotTable } from './MockAIResponses';
import { Eye } from 'lucide-react';

interface TableResponseProps {
  table: AICopilotTable;
  onOpenVendor?: (id: string, view?: string) => void;
}

export default function TableResponse({ table, onOpenVendor }: TableResponseProps) {
  return (
    <div style={{
      width: '100%',
      overflowX: 'auto',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      backgroundColor: '#FFFFFF',
      boxSizing: 'border-box'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '11px',
        textAlign: 'left'
      }}>
        <thead>
          <tr style={{
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0'
          }}>
            {table.headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: '8px 12px',
                  fontWeight: 650,
                  color: '#64748B',
                  whiteSpace: 'nowrap'
                }}
              >
                {h}
              </th>
            ))}
            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 650, color: '#64748B' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              style={{
                borderBottom: rIdx < table.rows.length - 1 ? '1px solid #F1F5F9' : 'none'
              }}
            >
              {row.cells.map((cell, cIdx) => {
                let cellColor = '#334155';
                let fontWeight = 400;

                if (cell === 'High') {
                  cellColor = '#E11D48';
                  fontWeight = 600;
                } else if (cell === 'Medium') {
                  cellColor = '#D97706';
                  fontWeight = 600;
                } else if (cell === 'Low') {
                  cellColor = '#059669';
                  fontWeight = 600;
                } else if (cIdx === 0) {
                  fontWeight = 600;
                  cellColor = '#0F172A';
                }

                return (
                  <td
                    key={cIdx}
                    style={{
                      padding: '8px 12px',
                      color: cellColor,
                      fontWeight: fontWeight,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cell}
                  </td>
                );
              })}
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => onOpenVendor && onOpenVendor(row.id, 'vendor-details')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10B981';
                    e.currentTarget.style.color = '#059669';
                    e.currentTarget.style.backgroundColor = '#ECFDF5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <Eye size={10} />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
