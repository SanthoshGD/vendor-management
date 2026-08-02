/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useNexus } from '../../../context/NexusContext';
import { 
  ArrowLeft, Sparkles, Check, X, ShieldCheck, Clock, Package, MapPin, 
  UserCog, FileText, CheckCircle2, AlertTriangle, CircleDot,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import VendorDocuments from './VendorDocuments';
import ProductCatalog, { MOCK_PRODUCTS } from '../Product/ProductCatalog';
import VendorActivity from './VendorActivity';
import VendorCommunication from './VendorCommunication';
import VendorRiskCard from './VendorRiskCard';
import DocumentsView from '../DocumentReview/DocumentsView';

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
  let bg = '#F1F5F9';
  let color = '#475569';
  let border = '#CBD5E1';

  if (status === 'Approved' || status === 'Verified') {
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

function Stepper({ stage, onSelectStage }: { stage: string; onSelectStage?: (stageLabel: string) => void }) {
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
    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '8px 0', minWidth: '600px', boxSizing: 'border-box' }}>
        {STAGES.map((s) => {
          const isDone = s.num < currentStep;
          const isCurrent = s.num === currentStep;

          return (
            <React.Fragment key={s.num}>
              <div 
                onClick={() => onSelectStage && onSelectStage(s.label)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, cursor: 'pointer' }}
                title={`Click to switch stage to: ${s.label}`}
              >
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
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isDone ? <Check size={14} /> : s.num}
                </div>
                <span style={{ fontSize: '11px', fontWeight: isCurrent ? 600 : 400, color: isCurrent ? '#0F172A' : '#64748B', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {s.num < STAGES.length && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: s.num < currentStep ? '#10B981' : '#E2E8F0',
                    margin: '0 8px',
                    marginTop: '-18px',
                    zIndex: 1,
                    transition: 'background-color 0.3s ease',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
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
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'communication' | 'activity'>('overview');
  const [decisionState, setDecisionState] = useState<'Approved' | 'Rejected' | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [docDecisions, setDocDecisions] = useState<Record<string, { status: 'Verified' | 'Rejected'; comment?: string }>>({});
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [overrideStage, setOverrideStage] = useState<string | null>(null);
  const productScrollRef = useRef<HTMLDivElement>(null);

  const rawVendor = getVendor(vendorId);

  // Normalize vendor object with presentation defaults
  const vendor = useMemo(() => {
    if (!rawVendor) return null;
    const currentStageLabel = overrideStage || rawVendor.stage || 'Profile Submitted';
    return {
      ...rawVendor,
      id: rawVendor.id || 'V3',
      name: rawVendor.name || 'Zhang Weilong',
      company: rawVendor.company || rawVendor.legalName || rawVendor.profile?.companyName || 'Hualong Garment Factory',
      region: rawVendor.country || rawVendor.profile?.country || 'East Asia',
      category: rawVendor.category || 'Apparels',
      stage: currentStageLabel,
      status: decisionState || (currentStageLabel === 'Verified' ? 'Approved' : currentStageLabel === 'Invited' ? 'Invited' : rawVendor.finalStatus || rawVendor.status || 'Pending'),
      docs: rawVendor.docsCount || `${(rawVendor.documents || []).filter((d: any) => d.status === 'Verified').length}/6`,
      supervisor: rawVendor.owner || 'Priya Sharma (Vendor Executive)',
      submitted: rawVendor.submitted || 'Yesterday, 4:30 PM',
      risk: rawVendor.risk || 'high',
      initials: (rawVendor.name || 'Zhang Weilong').split(' ').map((p: string) => p[0]).slice(0, 2).join(''),
    };
  }, [rawVendor, decisionState, overrideStage]);

  const currentStep = useMemo(() => {
    const stageMap: Record<string, number> = {
      "Invited": 1,
      "Profile Submitted": 2,
      "Compliance review": 2,
      "Doc Review": 3,
      "Profile Approved": 4,
      "Products Pending": 5,
      "Verified": 6,
    };
    return vendor ? (stageMap[vendor.stage] || 2) : 2;
  }, [vendor]);

  const handleStageSelect = (newStage: string) => {
    setOverrideStage(newStage);
    notify(`Stage switched to: ${newStage}`, 'blue');
  };

  const handleNextStage = () => {
    const currentStageName = vendor?.stage || 'Invited';
    const currIdx = STAGES.findIndex(s => s.label === currentStageName);
    if (currIdx >= 0 && currIdx < STAGES.length - 1) {
      const next = STAGES[currIdx + 1].label;
      setOverrideStage(next);
      notify(`Advanced to stage: ${next}`, 'blue');
    }
  };

  const handlePrevStage = () => {
    const currentStageName = vendor?.stage || 'Invited';
    const currIdx = STAGES.findIndex(s => s.label === currentStageName);
    if (currIdx > 0) {
      const prev = STAGES[currIdx - 1].label;
      setOverrideStage(prev);
      notify(`Rewound to stage: ${prev}`, 'blue');
    }
  };

  const sampleProducts = useMemo(() => {
    if (!vendor) return [];
    const matched = MOCK_PRODUCTS.filter(p => p.vendorId === vendor.id || p.vendorName.toLowerCase().includes(vendor.name.toLowerCase()));
    return matched.length > 0 ? matched.slice(0, 3) : MOCK_PRODUCTS.slice(0, 3);
  }, [vendor]);

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

  const baseDocsDone = currentStep <= 2 ? 0 : (parseInt(String(vendor.docs)) || (rawVendor.documents || []).filter((d: any) => d.status === 'Verified').length || 0);
  const verifiedCount = DOC_TEMPLATE.filter((docName, i) => {
    if (docDecisions[docName]) return docDecisions[docName].status === 'Verified';
    return currentStep >= 4 || (currentStep === 3 && i < baseDocsDone);
  }).length;
  const pct = Math.round((verifiedCount / 6) * 100);
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

  const isInvited = vendor.stage === 'Invited' || vendor.hasSubmittedApplication === false;



  const tabs: { id: 'overview' | 'products' | 'communication' | 'activity'; label: string }[] = isInvited ? [
    { id: 'overview', label: 'Overview' },
    { id: 'communication', label: 'Communication' },
    { id: 'activity', label: 'Activity' },
  ] : [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Product Catalog' },
    { id: 'communication', label: 'Communication' },
    { id: 'activity', label: 'Activity' },
  ];

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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
                STATUS STAGE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrevStage}
                  style={{
                    height: '26px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Prev Stage
                </button>
                <button
                  type="button"
                  onClick={handleNextStage}
                  style={{
                    height: '26px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #059669',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Next Stage →
                </button>
              </div>
            </div>
            <Stepper stage={vendor.stage} onSelectStage={handleStageSelect} />
          </div>

          {/* Card 2: AI Summary Box */}
          <div style={{ borderRadius: '12px', backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#6D28D9', marginBottom: '6px' }}>
              <Sparkles size={14} /> AI summary
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#4C1D95', margin: 0 }}>
              {isInvited ? (
                <>Vendor <strong>{vendor.company}</strong> has been invited to onboard. The secure onboarding link was sent to <strong>{vendor.email || 'the vendor contact'}</strong>. Awaiting initial document submission.</>
              ) : (
                <><strong>{vendor.company}</strong> is currently in the <strong>{vendor.stage}</strong> status stage with <strong>{vendor.docs}</strong> required documents verified. AI validation extracted business registration and tax data. Deterministic risk score is currently flagged at {vendor.baseRiskScore || 26}/100.</>
              )}
            </p>
          </div>

          {/* STAGE 3 SPECIFIC: Embedded Document Review Workspace */}
          {vendor.stage === 'Doc Review' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #0284C7', padding: '20px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#0284C7', textTransform: 'uppercase' }}>
                    STAGE 3 — DOCUMENT REVIEW WORKSPACE
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
                    Reviewing Submitted Documents for {vendor.name} ({vendor.company})
                  </h3>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284C7', backgroundColor: '#F0F9FF', padding: '4px 10px', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                  AI Verification Queue Active
                </span>
              </div>
              <DocumentsView />
            </div>
          )}

          {/* Two Column Grid — hidden during Stage 3 Doc Review (admin focuses on document workspace) */}
          {vendor.stage !== 'Doc Review' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px', alignItems: 'start' }}>
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

            {/* Right Column: Compact Onboarding Progress or Documents Summary + Sample Products */}
            {isInvited ? (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '12px' }}>
                  ONBOARDING PROGRESS SUMMARY
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                  <Clock size={20} className="text-amber-600" />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#92400E' }}>Invited — Documents Pending</strong>
                    <p style={{ fontSize: '12px', color: '#B45309', margin: '2px 0 0 0' }}>
                      The vendor has been invited. Full Documents and Product Catalog will be unlocked once initial documents are submitted by the supplier.
                    </p>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6' }}>
                  <strong>Next steps:</strong>
                  <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                    <li>Vendor opens onboarding portal via unique invite link</li>
                    <li>Submits Business Registration, Tax ID, and Insurance</li>
                    <li>Uploads sample product catalog line items</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Documents Summary Card */}
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
                    {verifiedCount} of 6 submitted
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ height: '100%', backgroundColor: '#10B981', borderRadius: '9999px', width: `${pct}%`, transition: 'width 0.3s ease' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {DOC_TEMPLATE.map((docName, i) => {
                      const decision = docDecisions[docName];
                      const isProfileSubmittedStage = currentStep <= 2;
                      const isApprovedStage = currentStep >= 4;

                      let isVerified = false;
                      let isPendingReview = false;

                      if (isApprovedStage) {
                        isVerified = decision ? decision.status === 'Verified' : true;
                      } else if (isProfileSubmittedStage) {
                        isPendingReview = true;
                        isVerified = false;
                      } else {
                        // Stage 3 Doc Review
                        isVerified = decision ? decision.status === 'Verified' : i < baseDocsDone;
                        isPendingReview = !isVerified;
                      }

                      const isRejected = decision ? decision.status === 'Rejected' : false;

                      const statusBg = isVerified ? '#ECFDF5' : isRejected ? '#FFF1F2' : isPendingReview ? '#F8FAFC' : '#F8FAFC';
                      const statusBorder = isVerified ? '#A7F3D0' : isRejected ? '#FECDD3' : isPendingReview ? '#CBD5E1' : '#E2E8F0';
                      const iconBg = isVerified ? '#D1FAE5' : isRejected ? '#FFE4E6' : isPendingReview ? '#E2E8F0' : '#E2E8F0';
                      const iconColor = isVerified ? '#059669' : isRejected ? '#E11D48' : isPendingReview ? '#475569' : '#94A3B8';

                      return (
                        <div
                          key={docName}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            backgroundColor: statusBg,
                            border: `1px solid ${statusBorder}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isVerified ? <Check size={12} /> : isRejected ? <X size={12} /> : <FileText size={11} />}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docName}</div>
                              <div style={{ fontSize: '11px', color: isRejected ? '#E11D48' : isVerified ? '#059669' : '#64748B' }}>
                                {isRejected
                                  ? (decision?.comment ? `Rejected: ${decision.comment}` : 'Rejected · Needs correction')
                                  : isVerified
                                  ? 'Submitted · Verified'
                                  : isPendingReview
                                  ? 'Submitted · Pending Review'
                                  : 'Not yet submitted'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewDoc(docName);
                              setShowRejectForm(false);
                              setRejectReason('');
                            }}
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            View
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sample Products Card below Documents Summary */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: '#94A3B8', textTransform: 'uppercase' }}>
                      SAMPLE PRODUCTS
                    </div>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {sampleProducts.length} product{sampleProducts.length !== 1 ? 's' : ''} submitted
                    </span>
                  </div>
                  {sampleProducts.length > 0 ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                      {/* Left Scroll Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (productScrollRef.current) {
                            productScrollRef.current.scrollBy({ left: -360, behavior: 'smooth' });
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: '-12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 5,
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#FFFFFF',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {/* Horizontal scroll row */}
                      <div
                        ref={productScrollRef}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          overflowX: 'auto',
                          scrollBehavior: 'smooth',
                          scrollbarWidth: 'none',
                          padding: '2px 0'
                        }}
                      >
                        {sampleProducts.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              flex: '0 0 180px', // width of each card increased to 180px
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: '#F1F5F9',
                              aspectRatio: '1 / 1',
                              border: '1px solid #E2E8F0',
                              position: 'relative'
                            }}
                          >
                            <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          </div>
                        ))}
                      </div>

                      {/* Right Scroll Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (productScrollRef.current) {
                            productScrollRef.current.scrollBy({ left: 360, behavior: 'smooth' });
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '-12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 5,
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#FFFFFF',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94A3B8', padding: '24px 0', justifyContent: 'center', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                      <Package size={14} /> No products submitted for this vendor yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* Sub-tab views */}
      {activeTab === 'products' && <ProductCatalog vendorId={vendor.id} />}
      {activeTab === 'activity' && <VendorActivity vendor={rawVendor || vendor} auditLogs={auditLogs} />}
      {activeTab === 'communication' && <VendorCommunication vendor={rawVendor || vendor} />}

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

      {/* Document Preview Modal Popup */}
      {previewDoc && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => { setPreviewDoc(null); setShowRejectForm(false); }}
        >
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              width: '100%',
              maxWidth: '540px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} className="text-slate-600" />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  {previewDoc}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setPreviewDoc(null); setShowRejectForm(false); }}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#F1F5F9', borderRadius: '10px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px stroke #CBD5E1' }}>
                <FileText size={40} style={{ color: '#059669', opacity: 0.8 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  {previewDoc} Asset Preview
                </span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Official Document File · PDF (2 Pages)
                </span>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px 14px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>Extracted Document Data</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', margin: '4px 0' }}>
                  <span>Entity Name:</span>
                  <strong>{vendor.company}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', margin: '4px 0' }}>
                  <span>Registration / Certificate ID:</span>
                  <strong>REG-91330200-CN</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', margin: '4px 0' }}>
                  <span>Current Review Status:</span>
                  <strong style={{ color: docDecisions[previewDoc]?.status === 'Rejected' ? '#E11D48' : '#059669' }}>
                    {docDecisions[previewDoc]?.status || 'Verified by StyleSphere AI'}
                  </strong>
                </div>
              </div>

              {showRejectForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#FFF1F2', border: '1px solid #FECDD3', padding: '14px', borderRadius: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#BE123C' }}>
                    Reason for Rejection / Required Corrections:
                  </label>
                  
                  {/* Preset Quick Reason Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      'Low contrast / unreadable image',
                      'Entity legal name mismatch',
                      'Registration ID unverified',
                      'Expired document certificate',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #FDA4AF',
                          backgroundColor: rejectReason === preset ? '#F43F5E' : '#FFFFFF',
                          color: rejectReason === preset ? '#FFFFFF' : '#9F1239',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Specify why this document is rejected (e.g. Tax number mismatch or page 2 unreadable)..."
                    style={{
                      width: '100%',
                      height: '64px',
                      borderRadius: '6px',
                      border: '1px solid #FDA4AF',
                      padding: '8px',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '11px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!rejectReason.trim()) {
                          notify('Please enter a rejection reason before confirming.', 'critical');
                          return;
                        }
                        setDocDecisions(prev => ({ ...prev, [previewDoc]: { status: 'Rejected', comment: rejectReason } }));
                        submitDecision(vendor.id, 'REJECT_DOC', rejectReason, { docTitle: previewDoc });
                        notify(`❌ Document "${previewDoc}" rejected. Reason sent to supplier.`, 'critical');
                        setPreviewDoc(null);
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                      style={{ padding: '4px 12px', borderRadius: '6px', border: 0, backgroundColor: '#E11D48', color: '#FFFFFF', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDocDecisions(prev => ({ ...prev, [previewDoc]: { status: 'Verified' } }));
                    notify(`✅ Document "${previewDoc}" approved and verified.`, 'green');
                    setPreviewDoc(null);
                    setShowRejectForm(false);
                  }}
                  style={{
                    height: '32px',
                    padding: '0 14px',
                    borderRadius: '6px',
                    border: '1px solid #A7F3D0',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={14} /> Approve Document
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  style={{
                    height: '32px',
                    padding: '0 14px',
                    borderRadius: '6px',
                    border: '1px solid #FECDD3',
                    backgroundColor: '#FFF1F2',
                    color: '#E11D48',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={14} /> Reject Document
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setPreviewDoc(null); setShowRejectForm(false); }}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
