'use client';

import React from 'react';
import { AlertCircle, Clock, ShieldAlert, FileText, ChevronRight } from 'lucide-react';

interface PriorityQueueProps {
  vendors?: any[];
  onOpenVendor?: (vendorId: string, tab?: string) => void;
  onNavigate?: (page: string) => void;
}

export interface PriorityItem {
  id: string;
  vendorId: string;
  vendorName: string;
  companyName: string;
  issue: string;
  priorityLevel: 'High Risk' | 'Missing Tax' | 'Insurance Expired' | 'Overdue >5d' | 'Manual Verification';
  slaLeft: string;
  tone: 'red' | 'amber' | 'violet';
}

export default function PriorityQueue({ vendors = [], onOpenVendor, onNavigate }: PriorityQueueProps) {
  const priorityList: PriorityItem[] = [
    {
      id: 'p1',
      vendorId: 'v1',
      vendorName: 'Zhang Weilong',
      companyName: 'Hualong Garment Factory',
      issue: 'Missing Tax Registration Certificate & Address Mismatch',
      priorityLevel: 'High Risk',
      slaLeft: '4h left',
      tone: 'red',
    },
    {
      id: 'p2',
      vendorId: 'v3',
      vendorName: 'Meera Nair',
      companyName: 'Nair Global Exports Pvt. Ltd.',
      issue: 'Liability Insurance Expired (COI Certificate)',
      priorityLevel: 'Insurance Expired',
      slaLeft: '12h left',
      tone: 'amber',
    },
    {
      id: 'p3',
      vendorId: 'v2',
      vendorName: 'Chen Lihua',
      companyName: 'Dongfang Footwear Export',
      issue: 'Awaiting Human Review for >5 days',
      priorityLevel: 'Overdue >5d',
      slaLeft: 'Overdue',
      tone: 'red',
    },
    {
      id: 'p4',
      vendorId: 'v9',
      vendorName: 'Fatima Zahra',
      companyName: 'Casa Textile SARL',
      issue: 'Manual Bank Letter Verification Required',
      priorityLevel: 'Manual Verification',
      slaLeft: '1d left',
      tone: 'violet',
    },
  ];

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>PRIORITY QUEUE</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            Vendors requiring immediate attention
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('vendors')}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#059669',
            backgroundColor: 'transparent',
            border: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          View all <ChevronRight size={13} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {priorityList.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenVendor?.(item.vendorId, 'vendor-details')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #F1F5F9',
              backgroundColor: '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="hover:bg-slate-50 hover:border-slate-200"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <span
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: item.tone === 'red' ? '#FFF1F2' : item.tone === 'amber' ? '#FFFBEB' : '#F5F3FF',
                  color: item.tone === 'red' ? '#E11D48' : item.tone === 'amber' ? '#D97706' : '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.tone === 'red' ? <ShieldAlert size={16} /> : <AlertCircle size={16} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{item.vendorName}</span>
                  <span style={{ color: '#94A3B8', fontWeight: 400 }}>·</span>
                  <span style={{ color: '#64748B', fontWeight: 500 }}>{item.companyName}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.issue}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '16px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: item.tone === 'red' ? '#FFF1F2' : item.tone === 'amber' ? '#FFFBEB' : '#F5F3FF',
                  color: item.tone === 'red' ? '#E11D48' : item.tone === 'amber' ? '#D97706' : '#7C3AED',
                  border: `1px solid ${item.tone === 'red' ? '#FECDD3' : item.tone === 'amber' ? '#FDE68A' : '#DDD6FE'}`,
                }}
              >
                {item.priorityLevel}
              </span>
              <span style={{ fontSize: '12px', color: item.slaLeft.includes('Overdue') ? '#E11D48' : '#94A3B8', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {item.slaLeft}
              </span>
              <ChevronRight size={14} style={{ color: '#CBD5E1' }} />
            </div>
          </button>
        ))}
      </div>
    </article>
  );
}
