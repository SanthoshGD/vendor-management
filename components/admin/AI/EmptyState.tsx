'use client';

import React from 'react';
import { Sparkles, AlertTriangle, FileClock, Users, Globe, BarChart3, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  onActionClick: (prompt: string) => void;
}

interface QuickAction {
  title: string;
  description: string;
  prompt: string;
  icon: any;
  color: string;
  bg: string;
}

const ACTIONS: QuickAction[] = [
  {
    title: 'Pending Vendors',
    description: 'Show vendors waiting for review',
    prompt: 'Show pending vendors',
    icon: Users,
    color: '#0284C7',
    bg: '#F0F9FF'
  },
  {
    title: 'High Risk Vendors',
    description: 'Who requires immediate attention?',
    prompt: 'High risk vendors',
    icon: AlertTriangle,
    color: '#E11D48',
    bg: '#FFF1F2'
  },
  {
    title: 'Expiring Documents',
    description: 'Insurance expiring this month',
    prompt: 'Expiring documents',
    icon: FileClock,
    color: '#D97706',
    bg: '#FFFBEB'
  },
  {
    title: 'Missing Compliance',
    description: 'Find vendors with missing certificates',
    prompt: 'Missing compliance',
    icon: HelpCircle,
    color: '#7C3AED',
    bg: '#F5F3FF'
  },
  {
    title: 'China Suppliers',
    description: 'List all vendors from China',
    prompt: 'China suppliers',
    icon: Globe,
    color: '#059669',
    bg: '#ECFDF5'
  },
  {
    title: 'Approval Summary',
    description: 'Today\'s approval statistics',
    prompt: 'Approval summary',
    icon: BarChart3,
    color: '#2563EB',
    bg: '#EFF6FF'
  }
];

export default function EmptyState({ onActionClick }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 20px',
      height: '100%',
      boxSizing: 'border-box',
      justifyContent: 'center'
    }}>
      {/* Abstract AI Illustration */}
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        marginBottom: '20px',
        boxShadow: '0 8px 30px rgba(16,185,129,0.25)',
        position: 'relative'
      }}>
        <Sparkles size={32} />
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#34D399',
          border: '2px solid #FFFFFF'
        }} />
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0', textAlign: 'center' }}>
        How can I help today?
      </h2>
      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 28px 0', textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 }}>
        Ask questions about vendors, compliance, approvals, documents or products.
      </p>

      {/* Grid of Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        width: '100%'
      }}>
        {ACTIONS.map((act, index) => {
          const Icon = act.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onActionClick(act.prompt)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = act.color + '40';
                e.currentTarget.style.boxShadow = '0 4px 12px ' + act.color + '0a';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: act.bg,
                color: act.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px'
              }}>
                <Icon size={14} />
              </div>
              <strong style={{ fontSize: '12px', fontWeight: 650, color: '#0F172A', display: 'block', marginBottom: '2px' }}>
                {act.title}
              </strong>
              <span style={{ fontSize: '10px', color: '#64748B', lineHeight: 1.3 }}>
                {act.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
