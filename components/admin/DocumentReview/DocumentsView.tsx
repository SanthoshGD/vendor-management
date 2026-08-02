'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Sparkles, Check, X, ShieldCheck, AlertTriangle, CheckCircle2, CircleDot
} from 'lucide-react';

const DOCUMENTS = [
  {
    id: "d1",
    title: "Company Registration Certificate",
    vendor: "Zhang Weilong",
    company: "Hualong Garment Factory",
    pages: 5,
    submitted: "Yesterday",
    ageDays: 1,
    confidence: 41,
    flag: "Certificate number format doesn't match the issuing authority's known pattern.",
    risk: "high"
  },
  {
    id: "d2",
    title: "GST / VAT Certificate",
    vendor: "Meera Nair",
    company: "Nair Global Exports Pvt. Ltd.",
    pages: 2,
    submitted: "4h ago",
    ageDays: 0.2,
    confidence: 62,
    flag: "Registered business name differs slightly from the certificate holder name.",
    risk: "medium"
  },
  {
    id: "d3",
    title: "Supplier Code of Conduct Sign-off",
    vendor: "Chen Lihua",
    company: "Dongfang Footwear Export",
    pages: 4,
    submitted: "5h ago",
    ageDays: 0.2,
    confidence: 99,
    flag: null,
    risk: "low"
  },
  {
    id: "d4",
    title: "Bank Account Verification Letter",
    vendor: "Meera Nair",
    company: "Nair Global Exports Pvt. Ltd.",
    pages: 1,
    submitted: "4h ago",
    ageDays: 0.2,
    confidence: 88,
    flag: null,
    risk: "low"
  },
  {
    id: "d5",
    title: "ISO Quality Certificate",
    vendor: "Chen Lihua",
    company: "Dongfang Footwear Export",
    pages: 3,
    submitted: "2h ago",
    ageDays: 0.1,
    confidence: 96,
    flag: null,
    risk: "low"
  },
];

const BADGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  high: { bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3' },
  medium: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  low: { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
};

function ConfidenceBadge({ confidence, risk }: { confidence: number; risk: string }) {
  const style = BADGE_STYLES[risk] || BADGE_STYLES.low;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      <Sparkles size={11} />
      {confidence}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isApprove = status === 'Approved';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: isApprove ? '#ECFDF5' : '#FFF1F2',
        color: isApprove ? '#059669' : '#E11D48',
        border: `1px solid ${isApprove ? '#A7F3D0' : '#FECDD3'}`,
      }}
    >
      <CircleDot size={10} strokeWidth={3} />
      {status}
    </span>
  );
}

function DocumentMock({ doc }: { doc: typeof DOCUMENTS[0] }) {
  const flagged = !!doc.flag;
  const borderColor = doc.risk === 'high' ? '#FECDD3' : '#FDE68A';
  const fields = [
    { label: 'Registration No.', isFlagged: true },
    { label: 'Issuing Authority', isFlagged: false },
    { label: 'Issue Date', isFlagged: false },
    { label: 'Valid Until', isFlagged: false },
  ];

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        aspectRatio: '3 / 4',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ShieldCheck size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>OFFICIAL DOCUMENT</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        {[95, 88, 100, 70, 92, 55].map((w, i) => (
          <div key={i} style={{ height: '8px', borderRadius: '4px', backgroundColor: '#F1F5F9', width: `${w}%` }} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {fields.map((f, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              padding: flagged && f.isFlagged ? '4px' : '0',
              borderRadius: flagged && f.isFlagged ? '6px' : '0',
              border: flagged && f.isFlagged ? `2px solid ${borderColor}` : 'none',
              backgroundColor: flagged && f.isFlagged ? '#FFF1F2' : 'transparent',
            }}
          >
            {flagged && f.isFlagged && (
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#E11D48', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={10} />
              </span>
            )}
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{f.label}</div>
            <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#F1F5F9', marginTop: '4px', width: '75%' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
        <div>
          <svg width="70" height="24" viewBox="0 0 70 24" style={{ color: '#CBD5E1' }}>
            <path d="M2 18 Q10 4 18 16 T34 12 T50 18 T66 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Authorized signatory</div>
        </div>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', transform: 'rotate(-8deg)' }}>
          <CheckCircle2 size={20} />
        </div>
      </div>
    </div>
  );
}

export default function DocumentsView({ onOpenVendor }: { onOpenVendor?: (id: string) => void }) {
  const [activeId, setActiveId] = useState(DOCUMENTS[0].id);
  const [decided, setDecided] = useState<Record<string, 'approve' | 'reject'>>({});
  const [rejections, setRejections] = useState<Record<string, string>>({});
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [docPriority, setDocPriority] = useState(true);

  const ordered = useMemo(() => {
    if (!docPriority) return DOCUMENTS;
    return [...DOCUMENTS].sort((a, b) => {
      const riskRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if (riskRank[a.risk] !== riskRank[b.risk]) return riskRank[a.risk] - riskRank[b.risk];
      return b.ageDays - a.ageDays;
    });
  }, [docPriority]);

  const active = DOCUMENTS.find((d) => d.id === activeId) || ordered[0];
  const rejectingDoc = DOCUMENTS.find((d) => d.id === rejectingDocId);

  const decide = React.useCallback((id: string, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      setRejectingDocId(id);
      setReasonInput('');
      return;
    }

    setDecided((prev) => ({ ...prev, [id]: action }));
    const currentIndex = ordered.findIndex((d) => d.id === id);
    const nextDoc = ordered.slice(currentIndex + 1).find((d) => !decided[d.id]);
    if (nextDoc) {
      setActiveId(nextDoc.id);
    }
  }, [ordered, decided]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key.toLowerCase() === 'a') {
        decide(active.id, 'approve');
      } else if (e.key.toLowerCase() === 'r') {
        decide(active.id, 'reject');
      } else if (e.key === 'ArrowDown') {
        const currentIndex = ordered.findIndex((d) => d.id === active.id);
        if (currentIndex < ordered.length - 1) {
          setActiveId(ordered[currentIndex + 1].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, ordered, decide]);

  const pendingCount = DOCUMENTS.filter((d) => !decided[d.id]).length;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Document queue</h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '2px 0 0 0' }}>{pendingCount} documents awaiting review</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <input
            type="checkbox"
            checked={docPriority}
            onChange={(e) => setDocPriority(e.target.checked)}
            style={{ borderRadius: '4px', cursor: 'pointer' }}
          />
          <Sparkles size={13} style={{ color: '#7C3AED' }} /> AI-prioritized (risk &amp; SLA)
        </label>
      </div>

      {/* Main Grid Layout: 2/5 Queue list + 3/5 Split pane preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Queue list container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {ordered.map((d, i) => {
              const isSelected = active?.id === d.id;
              const decision = decided[d.id];
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveId(d.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                    borderBottom: i < ordered.length - 1 ? '1px solid #F1F5F9' : 'none',
                    border: 0,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
                      <FileText size={15} style={{ color: '#94A3B8', marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {docPriority && i === 0 && (
                            <span style={{ fontSize: '10px', fontWeight: 600, backgroundColor: '#0F172A', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                              TOP PRIORITY
                            </span>
                          )}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.vendor} · {d.company}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{d.pages} pages · submitted {d.submitted}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <ConfidenceBadge confidence={d.confidence} risk={d.risk} />
                      {decision && <StatusBadge status={decision === 'approve' ? 'Approved' : 'Rejected'} />}
                      {decision === 'reject' && rejections[d.id] && (
                        <span style={{ fontSize: '10px', color: '#E11D48', maxWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', backgroundColor: '#FFF1F2', padding: '1px 5px', borderRadius: '4px', border: '1px solid #FECDD3' }} title={rejections[d.id]}>
                          {rejections[d.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split-pane preview & AI panel container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          {active && (
            <>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{active.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{active.vendor} · {active.company}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => decide(active.id, 'reject')}
                    title="Reject (R)"
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #FECDD3',
                      backgroundColor: '#FFF1F2',
                      color: '#E11D48',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={15} /> Reject Document
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(active.id, 'approve')}
                    title="Approve (A)"
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: 0,
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={15} /> Approve Document
                  </button>
                </div>
              </div>

              {/* Split Content: Left Document Mockup, Right AI Inspector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: 0 }}>
                <div style={{ backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #F1F5F9', padding: '24px', gap: '12px' }}>
                  <DocumentMock doc={active} />
                  {active.pages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {Array.from({ length: active.pages }).map((_, i) => (
                        <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: i === 0 ? '#475569' : '#CBD5E1' }} />
                      ))}
                      <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '4px' }}>Page 1 of {active.pages}</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div
                      style={{
                        borderRadius: '8px',
                        padding: '14px',
                        backgroundColor: active.flag ? '#FFF1F2' : '#ECFDF5',
                        color: active.flag ? '#BE123C' : '#047857',
                        border: `1px solid ${active.flag ? '#FECDD3' : '#A7F3D0'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                        <Sparkles size={13} /> AI verification - {active.confidence}% confidence
                      </div>
                      <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                        {active.flag ? active.flag : "No inconsistencies detected. Document format, issuer details, and metadata are consistent with prior verified submissions from this region."}
                      </p>
                    </div>

                    {decided[active.id] === 'reject' && rejections[active.id] && (
                      <div style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#BE123C' }}>
                        <strong>Rejection Reason Recorded:</strong>
                        <p style={{ margin: '4px 0 0 0' }}>{rejections[active.id]}</p>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>CHECKLIST</div>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: 0, margin: 0, listStyle: 'none', fontSize: '12px', color: '#475569' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={12} style={{ color: '#059669' }} /> Issuer signature detected</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={12} style={{ color: '#059669' }} /> Expiry date within range</li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {active.confidence > 80 ? (
                            <Check size={12} style={{ color: '#059669' }} />
                          ) : (
                            <AlertTriangle size={12} style={{ color: '#F59E0B' }} />
                          )}
                          Name matches vendor profile
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#94A3B8', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                    Keyboard: <kbd style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace' }}>A</kbd> approve · <kbd style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace' }}>R</kbd> reject · <kbd style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '1px 4px', fontFamily: 'monospace' }}>↓</kbd> next document
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectingDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setRejectingDocId(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              width: '100%',
              maxWidth: '520px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFF1F2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#E11D48' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#9F1239', margin: 0 }}>
                  Reject Document - {rejectingDoc.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingDocId(null)}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#9F1239' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                Specify why <strong>{rejectingDoc.title}</strong> submitted by <strong>{rejectingDoc.company}</strong> is being rejected so the vendor receives clear feedback to re-submit.
              </div>

              {/* Preset Reason Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Quick Preset Reasons:
                </label>
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
                      onClick={() => setReasonInput(preset)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #FDA4AF',
                        backgroundColor: reasonInput === preset ? '#E11D48' : '#FFFFFF',
                        color: reasonInput === preset ? '#FFFFFF' : '#BE123C',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Detailed Comments for Vendor:
                </label>
                <textarea
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Specify feedback for the vendor (e.g. Tax number is unreadable, please re-upload clear copy)..."
                  style={{
                    width: '100%',
                    height: '80px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    padding: '10px',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRejectingDocId(null)}
                style={{
                  height: '34px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalReason = reasonInput.trim() || 'Document rejected - update required';
                  setDecided((prev) => ({ ...prev, [rejectingDoc.id]: 'reject' }));
                  setRejections((prev) => ({ ...prev, [rejectingDoc.id]: finalReason }));
                  setRejectingDocId(null);
                  setReasonInput('');

                  // Advance to next document
                  const currentIndex = ordered.findIndex((d) => d.id === rejectingDoc.id);
                  const nextDoc = ordered.slice(currentIndex + 1).find((d) => !decided[d.id]);
                  if (nextDoc) {
                    setActiveId(nextDoc.id);
                  }
                }}
                style={{
                  height: '34px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 0,
                  backgroundColor: '#E11D48',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm Rejection & Send Reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
