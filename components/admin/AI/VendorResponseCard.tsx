'use client';

import React from 'react';
import { Eye, FileCheck2, ArrowRight } from 'lucide-react';
import { AICopilotCard } from './MockAIResponses';

interface VendorResponseCardProps {
  card: AICopilotCard;
  onOpenVendor?: (id: string, view?: string) => void;
  onCommsAction?: (vendorId: string, msg: string) => void;
}

export default function VendorResponseCard({ card, onOpenVendor, onCommsAction }: VendorResponseCardProps) {
  const getRiskColor = (level?: string) => {
    if (level === 'High') return { text: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' };
    if (level === 'Medium') return { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    return { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
  };

  const riskStyle = getRiskColor(card.riskLevel);

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      padding: '14px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {card.title}
          </h4>
          {card.subtitle && (
            <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0' }}>
              {card.subtitle}
            </p>
          )}
        </div>

        {card.riskLevel && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            color: riskStyle.text,
            backgroundColor: riskStyle.bg,
            border: `1px solid ${riskStyle.border}`
          }}>
            {card.riskLevel} {card.riskScore !== undefined ? `(${card.riskScore})` : ''}
          </span>
        )}
      </div>

      {/* Details list if any */}
      {card.details && card.details.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '8px 10px',
          borderRadius: '8px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #EEF2F6'
        }}>
          {card.details.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
              <span>{d.label}:</span>
              <strong style={{ color: '#1E293B' }}>{d.value}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Card attributes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10px' }}>
        {card.country && (
          <span style={{ color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
            Region: <strong>{card.country}</strong>
          </span>
        )}
        {card.assignedReviewer && (
          <span style={{ color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
            Reviewer: <strong>{card.assignedReviewer}</strong>
          </span>
        )}
        <span style={{ color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
          Status: <strong style={{ color: '#0369A1' }}>{card.status}</strong>
        </span>
      </div>

      {/* Actions */}
      {card.actions && card.actions.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          borderTop: '1px solid #F1F5F9',
          paddingTop: '10px',
          marginTop: '2px'
        }}>
          {card.actions.map((act, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (act.actionId === 'open_vendor' && onOpenVendor) {
                  onOpenVendor(act.payload, 'vendor-details');
                } else if (act.actionId === 'open_docs' && onOpenVendor) {
                  onOpenVendor(act.payload, 'vendor-details'); // Focus document review workspace in Stage 3
                } else if (act.actionId === 'comms_send' && onCommsAction) {
                  onCommsAction(act.payload.vendorId, act.payload.msg);
                }
              }}
              style={{
                flex: 1,
                fontSize: '11px',
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: i === 0 ? '#FFFFFF' : '#059669',
                color: i === 0 ? '#334155' : '#FFFFFF',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                if (i === 0) {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                } else {
                  e.currentTarget.style.backgroundColor = '#047857';
                }
              }}
              onMouseLeave={(e) => {
                if (i === 0) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                } else {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
            >
              {act.actionId === 'open_vendor' && <Eye size={12} />}
              {act.actionId === 'open_docs' && <FileCheck2 size={12} />}
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
