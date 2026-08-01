'use client';

import React, { useState, useMemo } from 'react';
import { useNexus } from '../../../context/NexusContext';
import { 
  ArrowLeft, Sparkles, Check, X, ShieldCheck, Clock, Package, MapPin, 
  UserCog, FileText, CheckCircle2, AlertTriangle, CircleDot
} from 'lucide-react';
import VendorDocuments from './VendorDocuments';
import ProductCatalog from '../Product/ProductCatalog';
import VendorActivity from './VendorActivity';
import VendorCommunication from './VendorCommunication';
import VendorApprovalHistory from './VendorApprovalHistory';
import VendorRiskCard from './VendorRiskCard';

interface VendorDetailViewProps {
  vendorId: string;
  onBack: () => void;
  onApproveSuccess?: (vendorId: string, vendorName: string) => void;
  readOnly?: boolean;
}

const STAGES = [
  { num: 1, label: "Invited" },
  { num: 2, label: "Profile Submitted" },
  { num: 3, label: "Doc Review" },
  { num: 4, label: "Profile Approved" },
  { num: 5, label: "Products Pending" },
  { num: 6, label: "Verified" },
];

const DOC_TEMPLATE = [
  "Company Registration Certificate",
  "IEC Import / Export Code Licence",
  "GST / VAT Certificate",
  "ISO Quality Certificate",
  "Bank Account Verification Letter",
  "Supplier Code of Conduct Sign-off",
];

function StatusBadge({ status }: { status: string }) {
  let bg = '#FEF3C7';
  let color = '#D97706';
  let border = '#FDE68A';

  if (status === 'Approved' || status === 'Verified' || status === 'Active') {
    bg = '#ECFDF5';
    color = '#059669';
    border = '#A7F3D0';
  } else if (status === 'In Review' || status === 'Doc Review') {
    bg = '#F0F9FF';
    color = '#0284C7';
    border = '#BAE6FD';
  } else if (status === 'Rejected') {
    bg = '#FFF1F2';
    color = '#E11D48';
    border = '#FECDD3';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
      }}
    >
      <CircleDot size={9} strokeWidth={3} />
      {status}
    </span>
  );
}

function Stepper({ stage }: { stage: string }) {
  const stageMap: Record<string, number> = {
    "Invited": 1,
    "Profile Submitted": 2,
    "Doc Review": 3,
    "Profile Approved": 4,
    "Products Pending": 5,
    "Verified": 6,
  };
  const currentStep = stageMap[stage] || 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '8px 0' }}>
      {STAGES.map((s, idx) => {
        const isDone = s.num < currentStep;
        const isCurrent = s.num === currentStep;

        return (
          <React.Fragment key={s.num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: isDone ? '#10B981' : isCurrent ? '#0F172A' : '#F1F5F9',
                  color: isDone || isCurrent ? '#FFFFFF' : '#94A3B8',
                  border: isDone ? 'none' : isCurrent ? 'none' : '1px solid #E2E8F0',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(15,23,42,0.1)' : 'none',
                }}
              >
                {isDone ? <Check size={14} /> : s.num}
              </div>
              <span style={{ fontSize: '11px', fontWeight: isCurrent ? 600 : 400, color: isCurrent ? '#0F172A' : '#64748B', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>

            {idx < STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: s.num < currentStep ? '#10B981' : '#E2E8F0',
                  margin: '0 8px',
                  marginTop: '-18px',
                  zIndex: 1,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function VendorDetailView({ 
  vendorId, 
  onBack, 
  onApproveSuccess,
  readOnly = false 
}: VendorDetailViewProps) {
  const { getVendor, auditLogs, submitDecision, notify } = useNexus();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'products' | 'communication' | 'activity' | 'history'>('overview');
  const [decisionState, setDecisionState] = useState<'Approved' | 'Rejected' | null>(null);

  const rawVendor = getVendor(vendorId);

  // Normalize vendor object with presentation defaults
  const vendor = useMemo(() => {
    if (!rawVendor) return null;
    return {
      ...rawVendor,
      id: rawVendor.id || 'V3',
      name: rawVendor.name || 'Zhang Weilong',
      company: rawVendor.company || rawVendor.legalName || rawVendor.profile?.companyName || 'Hualong Garment Factory',
      region: rawVendor.country || rawVendor.profile?.country || 'East Asia',
      category: rawVendor.category || 'Apparels',
      stage: rawVendor.stage || 'Profile Submitted',
      status: decisionState || rawVendor.finalStatus || rawVendor.status || 'Pending',
      docs: rawVendor.docsCount || `${(rawVendor.documents || []).filter((d: any) => d.status === 'Verified').length}/6`,
      supervisor: rawVendor.owner || 'Priya Sharma (Vendor Executive)',
      submitted: rawVendor.submitted || 'Yesterday, 4:30 PM',
      risk: rawVendor.risk || 'high',
      initials: (rawVendor.name || 'Zhang Weilong').split(' ').map((p: string) => p[0]).slice(0, 2).join(''),
    };
  }, [rawVendor, decisionState]);

  if (!vendor) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#64748B' }}>Vendor record not found.</p>
        <button type="button" onClick={onBack} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer' }}>
          Back to list
        </button>
      </div>
    );
  }

  const docsDone = parseInt(String(vendor.docs)) || (rawVendor.documents || []).filter((d: any) => d.status === 'Verified').length || 0;
  const pct = Math.round((docsDone / 6) * 100);
  const canDecide = !readOnly && !decisionState && (vendor.status === 'In Review' || vendor.status === 'Pending' || vendor.status === 'Doc Review');

  const handleApprove = () => {
    setDecisionState('Approved');
    submitDecision(vendor.id, 'APPROVE', 'Approved by Admin', {});
    if (onApproveSuccess) {
      onApproveSuccess(vendor.id, vendor.name);
    } else {
      notify(`✅ Vendor Approved. Approval email and portal notification have been sent to ${vendor.name}.`, 'green');
    }
  };

  const handleReject = () => {
    setDecisionState('Rejected');
    submitDecision(vendor.id, 'REJECT', 'Rejected during document review', {});
    notify(`Vendor application rejected. Notification sent to ${vendor.name}.`, 'critical');
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents' },
    { id: 'products', label: 'Product Catalog' },
    { id: 'communication', label: 'Communication' },
    { id: 'activity', label: 'Activity' },
    { id: 'history', label: 'Approval History' },
  ] as const;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#F8FAFC', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{vendor.name}</h1>
              <StatusBadge status={vendor.status} />
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              {vendor.id} · {vendor.company} · {vendor.region}
            </p>
          </div>
        </div>
        <StatusBadge status={vendor.status} />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? '#0F172A' : '#64748B',
              backgroundColor: activeTab === t.id ? '#FFFFFF' : 'transparent',
              border: activeTab === t.id ? '1px solid #E2E8F0' : '1px solid transparent',
              boxShadow: activeTab === t.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Onboarding Stage Stepper */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
              STATUS STAGE
            </div>
            <Stepper stage={vendor.stage} />
          </div>

          {/* Card 2: AI Summary Box */}
          <div style={{ borderRadius: '12px', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#6D28D9', marginBottom: '6px' }}>
              <Sparkles size={14} /> AI summary
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#4C1D95', margin: 0 }}>
              <strong>{vendor.company}</strong> is currently in the <strong>{vendor.stage}</strong> status stage with <strong>{vendor.docs}</strong> required documents verified. AI validation extracted business registration and tax data. Deterministic risk score is currently flagged at 26/100 (Low Risk).
            </p>
          </div>

          {/* Two Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Left Column: Vendor Info & Risk Engine */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Vendor Information Card */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '16px' }}>
                  COMPANY INFORMATION
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#F3E8FF', color: '#6D28D9', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {vendor.initials}
                  </span>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>{vendor.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>{vendor.company}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <Package size={13} /> Category
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                      {vendor.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <MapPin size={13} /> Country / Region
                    </span>
                    <span style={{ color: '#334155', fontWeight: 500 }}>{vendor.region}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <UserCog size={13} /> Assigned Vendor Executive
                    </span>
                    <span style={{ color: '#334155', fontWeight: 600 }}>{vendor.supervisor}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <Clock size={13} /> Submission Date
                    </span>
                    <span style={{ color: '#334155', fontWeight: 500 }}>{vendor.submitted}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <FileText size={13} /> Overall Status
                    </span>
                    <StatusBadge status={vendor.status} />
                  </div>
                </div>
              </div>

              {/* Vendor Risk Card */}
              <VendorRiskCard vendor={rawVendor || vendor} />
            </div>

            {/* Right Column: Documents Checklist */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
                  DOCUMENTS SUMMARY
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{pct}%</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>complete</div>
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                {docsDone} of 6 submitted
              </div>
              <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ height: '100%', backgroundColor: '#10B981', borderRadius: '9999px', width: `${pct}%`, transition: 'width 0.3s ease' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {DOC_TEMPLATE.map((docName, i) => {
                  const done = i < docsDone;
                  return (
                    <div
                      key={docName}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        backgroundColor: done ? '#ECFDF5' : '#F8FAFC',
                        border: `1px solid ${done ? '#A7F3D0' : '#E2E8F0'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: done ? '#D1FAE5' : '#E2E8F0', color: done ? '#059669' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {done ? <Check size={12} /> : <Clock size={11} />}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docName}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{done ? 'Submitted · reviewed' : 'Not yet submitted'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab views */}
      {activeTab === 'documents' && <VendorDocuments vendor={rawVendor || vendor} readOnly={readOnly} />}
      {activeTab === 'products' && <ProductCatalog vendorId={vendor.id} />}
      {activeTab === 'activity' && <VendorActivity vendor={rawVendor || vendor} auditLogs={auditLogs} />}
      {activeTab === 'communication' && <VendorCommunication vendor={rawVendor || vendor} />}
      {activeTab === 'history' && <VendorApprovalHistory vendor={rawVendor || vendor} auditLogs={auditLogs} />}

      {/* Sticky Decision Bar */}
      {canDecide && (
        <div style={{ position: 'sticky', bottom: '16px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 10 }}>
          <span style={{ fontSize: '14px', color: '#475569' }}>Ready to make a decision on this vendor?</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleReject}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #FECDD3',
                backgroundColor: '#FFFFFF',
                color: '#E11D48',
                fontSize: '13px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <X size={14} /> Reject
            </button>
            <button
              type="button"
              onClick={handleApprove}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                border: 0,
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Check size={14} /> Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
