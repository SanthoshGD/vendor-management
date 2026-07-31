import { useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Edit3, Check, X } from 'lucide-react';
import { REASON_TAXONOMY } from '../data/mockData';

const cx = (...values) => values.filter(Boolean).join(' ');
const tierOf = (f) => (f.crossDocMismatch || f.confidence < 60 ? 'red' : f.confidence < 90 ? 'amber' : 'green');
const TierIcon = { red: AlertCircle, amber: AlertTriangle, green: CheckCircle2 };

// The right-hand "extracted data" panel: traffic-light confidence per field,
// diagnostic / cross-document-mismatch call-outs, and the two required
// actions — Accept Source and Correct & Log — both of which write an
// immutable audit entry.
// `readOnly` lets an oversight role read the same extraction the reviewer works
// from, without the accept/correct affordances that would imply they can act.
export default function ExtractedForm({ doc, activeFieldKey, onSelectField, showOriginal, onAccept, onCorrect, readOnly = false }) {
  const [correctingKey, setCorrectingKey] = useState(null);

  if (!doc) {
    return <div className="field-panel field-panel-empty"><p>No document selected.</p></div>;
  }

  const resolvedCount = doc.fields.filter((f) => f.resolved).length;
  const hasOpenMismatch = doc.fields.some((f) => f.crossDocMismatch && !f.resolved);

  return (
    <div className="field-panel">
      <div className="field-panel-header">
        <div>
          <div className="field-panel-title">Extracted data</div>
          <span>{doc.title} ({doc.code})</span>
        </div>
        {doc.fields.length > 0 && (
          <span className="field-panel-count">{resolvedCount}/{doc.fields.length} reviewed</span>
        )}
      </div>

      {hasOpenMismatch && (
        <div className="cross-doc-banner">
          <AlertTriangle size={15} />
          <span><strong>Cross-document discrepancy flagged.</strong> Compare the fields below against the linked document before proceeding.</span>
        </div>
      )}

      <div className="field-panel-scroll">
        {doc.fields.length === 0 ? (
          <div className="field-panel-empty-state">
            {doc.status === 'Missing' ? 'This document has not been submitted yet.' : 'Document received — extraction in progress.'}
          </div>
        ) : doc.fields.map((f) => {
          const tier = tierOf(f);
          const Icon = TierIcon[tier];
          const displayValue = (showOriginal || !f.translatedValue) ? f.value : f.translatedValue;
          const isActive = activeFieldKey === f.key;

          return (
            <div
              key={f.key}
              className={cx('field-card', isActive && 'active', f.resolved && 'resolved')}
              onClick={() => onSelectField(f.key)}
            >
              <div className="field-card-top">
                <span className="field-card-label">{f.label}</span>
                <span className={cx('confidence-pill', tier)}><Icon size={12} /> {f.confidence}%</span>
              </div>
              <div className="field-card-value">{displayValue}</div>

              {!f.resolved && f.crossDocMismatch && f.mismatchNote && (
                <div className="field-diagnostic red"><AlertCircle size={13} /> {f.mismatchNote}</div>
              )}
              {!f.resolved && !f.crossDocMismatch && f.diagnostic && (
                <div className={cx('field-diagnostic', tier === 'red' ? 'red' : 'amber')}><AlertTriangle size={13} /> {f.diagnostic}</div>
              )}

              {/* Actions appear only on the field you are actually looking at.
                  Rendering a solid primary button on every field meant six
                  equally loud calls to action on one screen — the auto-cleared
                  99%-confidence rows shouted exactly as loudly as the 55% one
                  obscured by a company seal, which is the opposite of what
                  confidence tiering is for. */}
              {f.resolved ? (
                <div className="field-resolved-tag"><CheckCircle2 size={14} /> Reviewed — human verified</div>
              ) : readOnly ? (
                <div className="field-hint">Awaiting the reviewer</div>
              ) : isActive ? (
                <div className="field-actions" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="button primary compact" onClick={() => onAccept(f.key)}>
                    <Check size={14} /> Accept source
                  </button>
                  <button type="button" className="button secondary compact" onClick={() => setCorrectingKey(correctingKey === f.key ? null : f.key)}>
                    <Edit3 size={14} /> Correct &amp; log
                  </button>
                </div>
              ) : (
                <div className="field-hint">Select to review</div>
              )}

              {correctingKey === f.key && (
                <CorrectionForm
                  initialValue={displayValue}
                  onCancel={() => setCorrectingKey(null)}
                  onSubmit={(newValue, reason, notes) => { onCorrect(f.key, newValue, reason, notes); setCorrectingKey(null); }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CorrectionForm({ initialValue, onCancel, onSubmit }) {
  const [value, setValue] = useState(initialValue);
  const [reason, setReason] = useState(REASON_TAXONOMY[0]);
  const [notes, setNotes] = useState('');

  return (
    <form
      className="correction-form"
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => { event.preventDefault(); if (value.trim()) onSubmit(value.trim(), reason, notes); }}
    >
      <label>
        <span>Verified value</span>
        <input value={value} onChange={(event) => setValue(event.target.value)} autoFocus required />
      </label>
      <label>
        <span>Override reason (audit taxonomy)</span>
        <select value={reason} onChange={(event) => setReason(event.target.value)}>
          {REASON_TAXONOMY.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>
        <span>Audit note (optional)</span>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Confirmed against the business registry certificate." />
      </label>
      <div className="correction-form-preview"><AlertCircle size={13} /> The AI value, your correction, reason, timestamp, and user ID will be written to the audit trail.</div>
      <div className="correction-form-actions">
        <button type="button" className="button secondary compact" onClick={onCancel}><X size={14} /> Cancel</button>
        <button type="submit" className="button primary compact"><Check size={14} /> Save &amp; log</button>
      </div>
    </form>
  );
}
