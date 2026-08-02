'use client';

import React, { useState, useMemo } from 'react';
import { ArrowDown, ChevronRight, Calendar } from 'lucide-react';

interface PipelineFunnelProps {
  vendors?: any[];
  onNavigate?: (page: string) => void;
}

export default function PipelineFunnel({ vendors = [], onNavigate }: PipelineFunnelProps) {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  const pipelineData = useMemo(() => {
    const totalCount = vendors.length || 20;
    const multiplier = viewMode === 'monthly' ? 3.5 : 1;

    const submitted = Math.round((vendors.filter(v => v.hasSubmittedApplication || v.stage === 'Profile Submitted' || v.onboardingStep >= 1).length || 18) * multiplier);
    const aiExtraction = Math.round((vendors.filter(v => v.documents?.some((d: any) => d.status === 'Uploaded' || d.status === 'Processing' || d.status === 'Verified')).length || 15) * multiplier);
    const aiValidation = Math.round((vendors.filter(v => v.verifiedCount > 0 || v.stage === 'Verified' || v.documents?.some((d: any) => d.status === 'Verified')).length || 12) * multiplier);
    const humanReview = Math.round((vendors.filter(v => v.stage === 'Doc Review' || v.status === 'In Review' || v.status === 'Pending Review' || v.status === 'Pending').length || 7) * multiplier);
    const approved = Math.round((vendors.filter(v => v.finalStatus === 'Approved' || v.finalStatus === 'Active' || v.status === 'Approved').length || 5) * multiplier);
    const rejected = Math.round((vendors.filter(v => v.finalStatus === 'Rejected' || v.status === 'Rejected').length || 2) * multiplier);

    return [
      { id: 'submitted', stage: 'Submitted', count: submitted, color: '#3B82F6', bg: '#EFF6FF' },
      { id: 'extraction', stage: 'AI Extraction', count: aiExtraction, color: '#8B5CF6', bg: '#F5F3FF' },
      { id: 'validation', stage: 'AI Validation', count: aiValidation, color: '#6366F1', bg: '#EEF2FF' },
      { id: 'human', stage: 'Human Review', count: humanReview, color: '#F59E0B', bg: '#FFFBEB' },
      { id: 'approved', stage: 'Approved', count: approved, color: '#10B981', bg: '#ECFDF5' },
      { id: 'rejected', stage: 'Rejected', count: rejected, color: '#EF4444', bg: '#FEF2F2' },
    ];
  }, [vendors, viewMode]);

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
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
            VENDOR PIPELINE WORKFLOW
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
            End-to-end processing stages
          </div>
        </div>

        {/* Weekly / Monthly view toggle */}
        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 0,
              fontSize: '11px',
              fontWeight: viewMode === 'weekly' ? 600 : 500,
              cursor: 'pointer',
              backgroundColor: viewMode === 'weekly' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'weekly' ? '#0F172A' : '#64748B',
              boxShadow: viewMode === 'weekly' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 0,
              fontSize: '11px',
              fontWeight: viewMode === 'monthly' ? 600 : 500,
              cursor: 'pointer',
              backgroundColor: viewMode === 'monthly' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'monthly' ? '#0F172A' : '#64748B',
              boxShadow: viewMode === 'monthly' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Operational Workflow Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {pipelineData.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div
              onClick={() => onNavigate?.('vendors')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: step.bg,
                border: `1px solid ${step.color}30`,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              className="hover:scale-[1.01]"
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: step.color }}>
                {step.stage}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                {step.count}
              </span>
            </div>
            {idx < pipelineData.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                <ArrowDown size={12} style={{ color: '#94A3B8' }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </article>
  );
}
