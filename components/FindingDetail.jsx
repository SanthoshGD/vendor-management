import { useRef, useState } from 'react';
import { useNexus } from '../context/NexusContext';
import { AGENTS_BY_ID } from '../services/agentCatalog';
import useDialog from '../hooks/useDialog';
import DocumentCanvas from './DocumentCanvas';
import {
  Check, X, XCircle, UserCheck, RotateCcw, Send, ScrollText, Bot, FileSearch, Sparkles,
} from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');

// Finding kinds whose existence is keyed to `field.resolved` — only for these
// does accepting the extracted value genuinely close the finding.
const FIELD_BACKED_KINDS = new Set(['extraction', 'cross_doc', 'recency']);

const TIER_LABEL = {
  red: ['Blocking', 'Review cannot conclude until this is resolved.'],
  amber: ['Review needed', 'Non-blocking; review before approval.'],
  green: ['Cleared', 'No action needed.'],
};

// ---------------------------------------------------------------------------
// The detail pane — everything about ONE decision, in reading order.
//
// The order is deliberate and always the same, so the reviewer builds a habit
// rather than re-scanning each time:
//
//   1. WHAT the agent found        (the claim)
//   2. WHY it matters              (the policy clause it was raised under)
//   3. THE EVIDENCE                (the source document, highlighted)
//   4. WHAT THE AGENT SUGGESTS     (its recommendation — never its decision)
//   5. YOUR DECISION               (one primary action, alternatives beside it)
//
// Previously steps 3 and 5 lived in a separate panel with its own competing set
// of Accept / Correct buttons, so the same job could be started in two places
// with different wording. There is now exactly one place to decide anything.
// ---------------------------------------------------------------------------
export default function FindingDetail({ vendor, finding, onJumpToDoc }) {
  const { acceptField, resolveFinding, reopenFinding, chaseNow, getThreads } = useNexus();
  const [resolving, setResolving] = useState(null);
  const [reason, setReason] = useState('');
  const [showOriginal, setShowOriginal] = useState(true);

  if (!finding) return null;

  const agent = AGENTS_BY_ID[finding.agentId];
  const doc = vendor.documents.find((d) => d.id === finding.docId);
  const [tierLabel, tierNote] = TIER_LABEL[finding.tier] || TIER_LABEL.green;
  const threads = getThreads(vendor.id);
  const thread = threads.find((t) => t.docId === finding.docId);

  const start = (outcome) => { setResolving(outcome); setReason(''); };
  const commit = () => {
    resolveFinding(vendor.id, finding, resolving, reason);
    setResolving(null);
    setReason('');
  };

  return (
    <div className="detail-pane">
      <div className="detail-scroll">
        {/* 1 — WHAT */}
        <header className="detail-head">
          <div className="detail-head-top">
            <span className={cx('detail-tier', finding.tier)}>{tierLabel}</span>
            <span className="detail-agent">
              <Bot size={12} /> {agent?.name || 'Agent'}
              {finding.confidence != null && <> · {finding.confidence}% confidence</>}
            </span>
          </div>
          <h2>{finding.title}</h2>
          <p className="detail-tier-note">{tierNote}</p>
          <p className="detail-detail">{finding.detail}</p>
        </header>

        {/* 2 — WHY */}
        {finding.clause && (
          <section className="detail-section">
            <h3><ScrollText size={13} /> Why this matters</h3>
            <article className="detail-clause">
              <header>
                <span className="clause-id">{finding.clause.id}</span>
                <div>
                  <strong>{finding.clause.title}</strong>
                  <small>{finding.clause.source}</small>
                </div>
              </header>
              <p>{finding.clause.requirement}</p>
            </article>
          </section>
        )}

        {/* 3 — EVIDENCE */}
        {finding.evidence?.length > 0 && (
          <section className="detail-section">
            <h3><FileSearch size={13} /> The evidence</h3>
            <div className="detail-evidence">
              {finding.evidence.map((e, i) => (
                <div className="detail-evidence-row" key={`${finding.id}-ev-${i}`}>
                  <span className="detail-evidence-label">{e.label}</span>
                  <span className="detail-evidence-value">{e.value}</span>
                  <span className="detail-evidence-source">{e.source}</span>
                  {e.docId && (
                    <button className="detail-evidence-jump" onClick={() => onJumpToDoc?.(e.docId, e.fieldKey)}>
                      Open document
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {doc && doc.status !== 'Missing' && (
          <section className="detail-section">
            <h3><FileSearch size={13} /> Source document</h3>
            <div className="detail-canvas">
              <DocumentCanvas
                doc={doc}
                activeFieldKey={finding.fieldKey}
                onSelectField={(fieldKey) => onJumpToDoc?.(relatedDoc.id, fieldKey)}
                showOriginal={showOriginal}
                onToggleOriginal={setShowOriginal}
              />
            </div>
          </section>
        )}

        {/* 4 — WHAT THE AGENT SUGGESTS */}
        <section className="detail-section">
          <h3><Sparkles size={13} /> What the agent suggests</h3>
          <p className="detail-reco">{finding.recommendation}</p>
          <small className="detail-reco-note">
            A suggestion, not a decision — PROC-5.1 reserves the decision for you.
          </small>
        </section>
      </div>

      {/* 5 — YOUR DECISION. Pinned so it is reachable without scrolling back
          (Fitts's law), and carrying exactly one primary action so there is no
          ambiguity about the expected path (Hick's law). */}
      <footer className="detail-actions">
        {finding.resolved ? (
          <div className="detail-resolved">
            <span><Check size={14} /> {finding.resolution?.label || 'Auto-cleared'}</span>
            {finding.resolution && (
              <>
                <p>&ldquo;{finding.resolution.reason}&rdquo; — {finding.resolution.by}</p>
                <button onClick={() => reopenFinding(vendor.id, finding)}><RotateCcw size={12} /> Reopen</button>
              </>
            )}
          </div>
        ) : finding.kind === 'missing' ? (
          <>
            <button
              className="button primary"
              disabled={!thread?.next}
              onClick={() => thread?.next && chaseNow(vendor.id, finding.docId, thread.next)}
            >
              <Send size={15} /> Send the next chase now
            </button>
            <button className="button secondary" onClick={() => start('mitigated')}>
              <UserCheck size={15} /> Received off-platform
            </button>
          </>
        ) : (
          <>
            {FIELD_BACKED_KINDS.has(finding.kind) && finding.fieldKey && finding.docId ? (
              <button
                className="button primary"
                onClick={() => acceptField(vendor.id, finding.docId, finding.fieldKey, `Accepted from the agent finding "${finding.title}".`)}
              >
                <Check size={15} /> Accept the agent&rsquo;s reading
              </button>
            ) : (
              <button className="button primary" onClick={() => start('accept')}>
                <Check size={15} /> Accept &amp; clear
              </button>
            )}
            <button className="button secondary" onClick={() => start('dismiss')}>
              <XCircle size={15} /> False positive
            </button>
            {finding.tier === 'red' && (
              <button className="button ghost" onClick={() => start('mitigated')}>
                Settled off-platform
              </button>
            )}
          </>
        )}
      </footer>

      {resolving && (
        <ResolveDialog
          finding={finding} outcome={resolving} reason={reason}
          onReason={setReason} onCancel={() => setResolving(null)} onCommit={commit}
        />
      )}
    </div>
  );
}

// Split out of FindingDetail so the dialog hook runs on mount/unmount of the
// dialog itself — FindingDetail returns early when there is no finding, so it
// cannot host a conditional hook.
function ResolveDialog({ finding, outcome, reason, onReason, onCancel, onCommit }) {
  const cardRef = useRef(null);
  // autoFocus:false — the textarea below claims focus, which is the field the
  // reviewer actually has to fill in.
  useDialog(cardRef, onCancel, { autoFocus: false });

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal-card" role="dialog" aria-modal="true" aria-labelledby="resolve-dialog-title"
        tabIndex={-1} ref={cardRef} onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-kicker">{finding.clause?.id || 'Agent finding'}</span>
            <h2 id="resolve-dialog-title">
              {outcome === 'accept' && 'Accept and clear this finding'}
              {outcome === 'dismiss' && 'Dismiss as a false positive'}
              {outcome === 'mitigated' && 'Record as settled off-platform'}
            </h2>
            <p>{finding.title}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          <label className="form-field">
            <span>Your reason (required — written to the audit trail)</span>
            <textarea
              value={reason} onChange={(e) => onReason(e.target.value)} autoFocus
              placeholder={outcome === 'dismiss'
                ? 'Why is the agent wrong on this evidence?'
                : 'What did you verify, and against what?'}
            />
          </label>
        </div>
        <footer>
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" onClick={onCommit} disabled={!reason.trim()}>
            <Check size={15} /> Record decision
          </button>
        </footer>
      </section>
    </div>
  );
}
