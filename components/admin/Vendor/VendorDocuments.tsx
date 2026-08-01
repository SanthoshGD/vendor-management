'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useNexus } from '../../../context/NexusContext';
import { FileText, CheckCircle2, AlertTriangle, XCircle, Clock3 } from 'lucide-react';
import DocumentCanvas from '../../DocumentCanvas';
import ExtractedForm from '../../ExtractedForm';

interface VendorDocumentsProps {
  vendor: any;
  readOnly?: boolean;
}

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  Verified: { label: 'Approved', tone: 'green' },
  Missing: { label: 'Pending Review', tone: 'neutral' },
  Uploaded: { label: 'In Review', tone: 'blue' },
  Processing: { label: 'In Review', tone: 'blue' },
  Flagged: { label: 'Changes Requested', tone: 'amber' },
  'Needs Review': { label: 'In Review', tone: 'blue' },
  Rejected: { label: 'Rejected', tone: 'red' }
};

export default function VendorDocuments({ vendor, readOnly = false }: VendorDocumentsProps) {
  const { acceptField, correctField, submitDecision, notify } = useNexus();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docFieldKey, setDocFieldKey] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const documents = useMemo(() => vendor.documents || [], [vendor.documents]);

  useEffect(() => {
    if (documents.length && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const activeDoc = useMemo(() => {
    return documents.find((d: any) => d.id === selectedDocId) || null;
  }, [documents, selectedDocId]);

  const activeDocFieldKeys = activeDoc?.fields.map((f: any) => f.key).join('|') || '';
  useEffect(() => {
    const keys = activeDocFieldKeys ? activeDocFieldKeys.split('|') : [];
    setDocFieldKey(current => (keys.includes(current || '') ? current : keys[0] || null));
  }, [selectedDocId, activeDocFieldKeys]);

  const handleApproveDocument = () => {
    if (!activeDoc) return;
    // Auto-approve all unresolved fields
    const unresolvedFields = activeDoc.fields.filter((f: any) => !f.resolved);
    unresolvedFields.forEach((f: any) => {
      acceptField(vendor.id, activeDoc.id, f.key);
    });
    notify(`Approved document "${activeDoc.title}".`);
  };

  const handleRejectDocument = (isRequestChanges: boolean) => {
    if (!activeDoc || !rejectionNotes.trim()) {
      notify('Please enter a reason or details for this request.', 'critical');
      return;
    }
    
    // Call submitDecision to request changes or reject
    const decisionType = isRequestChanges ? 'REQUEST_DOCS' : 'REJECT';
    submitDecision(vendor.id, decisionType, rejectionNotes, {
      finding: { id: activeDoc.id, title: activeDoc.title }
    });

    setRejectionNotes('');
    setShowRejectionForm(false);
  };

  return (
    <div className="vendor-tab-documents">
      {/* Sidebar List of Documents */}
      <div className="doc-sidebar panel">
        <span className="section-kicker">Required Files</span>
        <h3>Evidence Portfolio</h3>
        <div className="doc-list-rows">
          {documents.map((doc: any) => {
            const mapped = STATUS_MAP[doc.status] || { label: doc.status, tone: 'neutral' };
            const isActive = doc.id === selectedDocId;

            return (
              <button 
                type="button"
                className={`doc-list-row ${isActive ? 'active' : ''}`}
                key={doc.id}
                onClick={() => {
                  setSelectedDocId(doc.id);
                  setShowRejectionForm(false);
                  setRejectionNotes('');
                }}
              >
                <span className={`file-icon ${mapped.tone}`}>
                  <FileText size={16} />
                </span>
                <div className="doc-row-details">
                  <strong>{doc.title}</strong>
                  <span className={`status-pill ${mapped.tone}`}>{mapped.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Review Workspace */}
      <div className="doc-workspace flex-1">
        {activeDoc ? (
          <div className="active-doc-workspace">
            {/* Split Screen Document & Form */}
            <div className="doc-review-split">
              <div className="doc-viewer-card panel">
                <header className="panel-heading compact">
                  <div>
                    <span className="section-kicker">Document Preview</span>
                    <h3>{activeDoc.title}</h3>
                  </div>
                </header>
                <div className="viewer-container">
                  <DocumentCanvas 
                    doc={activeDoc}
                    activeFieldKey={docFieldKey}
                    onSelectField={setDocFieldKey}
                    showOriginal={true}
                    onToggleOriginal={() => {}}
                  />
                </div>
              </div>

              <div className="doc-form-card panel">
                <header className="panel-heading compact">
                  <div>
                    <span className="section-kicker">Extracted Data</span>
                    <h3>Validation Form</h3>
                  </div>
                </header>
                <div className="form-container">
                  <ExtractedForm 
                    doc={activeDoc}
                    activeFieldKey={docFieldKey}
                    onSelectField={setDocFieldKey}
                    showOriginal={true}
                    readOnly={readOnly}
                    onAccept={(key: string) => acceptField(vendor.id, activeDoc.id, key)}
                    onCorrect={(key: string, value: string, reason: string, notes: string) => 
                      correctField(vendor.id, activeDoc.id, key, value, reason, notes)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar at the bottom */}
            {!readOnly && (
              <div className="panel doc-actions-bar mt-4">
                {!showRejectionForm ? (
                  <div className="actions-buttons-row">
                    <button 
                      type="button" 
                      className="button primary"
                      onClick={handleApproveDocument}
                    >
                      <CheckCircle2 size={15} />
                      <span>Approve Document</span>
                    </button>
                    
                    <button 
                      type="button" 
                      className="button secondary"
                      onClick={() => {
                        setShowRejectionForm(true);
                      }}
                    >
                      <AlertTriangle size={15} />
                      <span>Request Changes</span>
                    </button>

                    <button 
                      type="button" 
                      className="button danger compact"
                      onClick={() => {
                        setShowRejectionForm(true);
                      }}
                    >
                      <XCircle size={15} />
                      <span>Reject Document</span>
                    </button>
                  </div>
                ) : (
                  <div className="rejection-form">
                    <label className="form-field">
                      <span>Reason / Instructions (sent to supplier)</span>
                      <textarea
                        value={rejectionNotes}
                        onChange={e => setRejectionNotes(e.target.value)}
                        placeholder="Please specify exactly what needs to be changed (e.g. Document pages are missing, or certificate number mismatch)."
                      />
                    </label>
                    <div className="form-actions mt-3">
                      <button 
                        type="button"
                        className="button primary"
                        onClick={() => handleRejectDocument(true)}
                      >
                        Submit Request Changes
                      </button>
                      <button 
                        type="button"
                        className="button danger"
                        onClick={() => handleRejectDocument(false)}
                      >
                        Submit Rejection
                      </button>
                      <button 
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          setShowRejectionForm(false);
                          setRejectionNotes('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="panel flex-1 flex items-center justify-center p-12 text-slate-500">
            Select a document to begin verification review.
          </div>
        )}
      </div>
    </div>
  );
}
