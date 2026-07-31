import { useMemo, useState } from 'react';
import { useNexus } from '../context/AppContext';
import { AGENTS_BY_ID } from '../agents/agentCatalog';
import { recommendationLabel } from '../agents/agentEngine';
import {
  AlertOctagon, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ScrollText,
  Sparkles, FileSearch, Bot, X, Check, XCircle, UserCheck, RotateCcw, Send,
} from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');

// Finding kinds whose existence is genuinely keyed to `field.resolved` — for
// these, accepting the extracted value really does close the finding.
//
// A threshold breach or a duplicate applicant is NOT one of them: accepting the
// value "$1,000,000 USD" does not make it clear the $2M floor, so offering
// "accept reading" there produced a finding that could never be cleared and a
// supplier that could never be approved. Those kinds need an explicit human
// resolution with a reason instead.
const FIELD_BACKED_KINDS = new Set(['extraction', 'cross_doc', 'recency']);

const TIER_META = {
  red: [AlertOctagon, 'Needs a decision', 'Blocking — review cannot conclude until this is resolved.'],
  amber: [AlertTriangle, 'Review needed', 'Non-blocking; review before approval.'],
  green: [CheckCircle2, 'Auto-cleared', 'Cleared automatically. Expanded only if you want to audit it.'],
};

// ---------------------------------------------------------------------------
// Confidence-tiered findings.
//
// The friction this removes: today every extracted field arrives at the same
// visual weight, so a reviewer spends the same attention on a 99%-confidence
// licence number as on a 55%-confidence expiry date obscured by a company seal.
// Attention is the scarce resource in a 40–60 application day.
//
// So: red and amber open expanded, green collapses into a single line. And
// every finding is click-through — finding → policy clause → the exact document
// page — which is what turns "the AI thinks this is wrong" into an auditable
// recommendation a compliance manager can defend.
// ---------------------------------------------------------------------------
export default function FindingsPanel({ vendorId, onJumpToEvidence, activeFindingId, onSelectFinding }) {
  const { getAssessment, acceptField, getVendor, resolveFinding, reopenFinding, chaseNow, getThreads } = useNexus();
  const assessment = getAssessment(vendorId);
  const vendor = getVendor(vendorId);
  const threads = getThreads(vendorId);
  const [showGreen, setShowGreen] = useState(false);
  const [clause, setClause] = useState(null);
  const [briefOpen, setBriefOpen] = useState(true);
  // Resolving a finding requires a stated reason — the brief's override rule
  // logs the AI recommendation, the human decision AND the reason.
  const [resolving, setResolving] = useState(null);
  const [reason, setReason] = useState('');

  const startResolve = (finding, outcome) => {
    setResolving({ finding, outcome });
    setReason('');
  };

  const commitResolve = () => {
    resolveFinding(vendorId, resolving.finding, resolving.outcome, reason);
    setResolving(null);
    setReason('');
  };

  const grouped = useMemo(() => ({
    red: assessment.findings.filter((f) => f.tier === 'red' && !f.resolved),
    amber: assessment.findings.filter((f) => f.tier === 'amber' && !f.resolved),
    green: assessment.findings.filter((f) => f.tier === 'green' || f.resolved),
  }), [assessment.findings]);

  const renderFinding = (f) => {
    const [Icon] = TIER_META[f.tier];
    const agent = AGENTS_BY_ID[f.agentId];
    const active = activeFindingId === f.id;
    return (
      <article key={f.id} className={cx('finding', f.tier, active && 'active')}>
        <button className="finding-head" onClick={() => onSelectFinding?.(active ? null : f.id)}>
          <span className={cx('finding-icon', f.tier)}><Icon size={14} /></span>
          <span className="finding-head-text">
            <strong>{f.title}</strong>
            <small>
              <Bot size={11} /> {agent?.name || f.agentId}
              {f.confidence != null && <> · {f.confidence}% confidence</>}
            </small>
          </span>
          <ChevronDown size={14} className="finding-chevron" />
        </button>

        {active && (
          <div className="finding-body">
            <p className="finding-detail">{f.detail}</p>

            {f.clause && (
              <button className="finding-clause" onClick={() => setClause(f.clause)}>
                <ScrollText size={12} />
                <span><strong>{f.clause.id}</strong> — {f.clause.title}</span>
                <ChevronRight size={13} />
              </button>
            )}

            {f.evidence?.length > 0 && (
              <div className="finding-evidence">
                {f.evidence.map((e, i) => (
                  <button
                    key={`${f.id}-ev-${i}`}
                    className="evidence-row"
                    disabled={!e.docId}
                    onClick={() => e.docId && onJumpToEvidence?.(e.docId, e.fieldKey)}
                  >
                    <span className="evidence-label">{e.label}</span>
                    <span className="evidence-value" lang="auto">{e.value}</span>
                    <span className="evidence-source">
                      <FileSearch size={11} /> {e.source}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="finding-reco">
              <Sparkles size={12} />
              <span>{f.recommendation}</span>
            </div>

            {/* Every finding must be closeable, or a red one blocks approval
                forever. Field-backed findings accept straight into the
                extracted value; the rest — cross-document conflicts, duplicate
                applicants, threshold breaches — resolve with a stated reason.
                Missing documents hand off to the Chaser instead. */}
            {!f.resolved && (
              <div className="finding-actions">
                {f.fieldKey && f.docId && FIELD_BACKED_KINDS.has(f.kind) && (
                  <button
                    className="button success compact"
                    onClick={() => acceptField(vendor.id, f.docId, f.fieldKey, `Accepted from the agent finding "${f.title}".`)}
                  >
                    <Check size={13} /> Accept reading
                  </button>
                )}
                {f.kind === 'missing' && (
                  <button
                    className="button warning-outline compact"
                    onClick={() => {
                      const thread = threads.find((t) => t.docId === f.docId);
                      const next = thread?.next || thread?.steps.find((s) => s.status === 'scheduled');
                      if (thread && next) chaseNow(vendor.id, f.docId, next);
                    }}
                    disabled={!threads.find((t) => t.docId === f.docId)?.next}
                  >
                    <Send size={13} /> Chase now
                  </button>
                )}
                {f.kind !== 'missing' && !FIELD_BACKED_KINDS.has(f.kind) && (
                  <button className="button success compact" onClick={() => startResolve(f, 'accept')}>
                    <Check size={13} /> Accept &amp; clear
                  </button>
                )}
                {/* A missing document is a fact, not a judgement — there is no
                    honest "false positive" for it. It clears when the file
                    arrives, or when a human records that it was settled
                    off-platform. */}
                {f.kind !== 'missing' && (
                  <button className="button secondary compact" onClick={() => startResolve(f, 'dismiss')}>
                    <XCircle size={13} /> False positive
                  </button>
                )}
                {f.tier === 'red' && (
                  <button className="button ghost compact" onClick={() => startResolve(f, 'mitigated')}>
                    <UserCheck size={13} /> Settled off-platform
                  </button>
                )}
              </div>
            )}

            {f.resolved && f.resolution && (
              <div className="finding-resolved">
                <span><Check size={12} /> {f.resolution.label}</span>
                <p>&ldquo;{f.resolution.reason}&rdquo; — {f.resolution.by}</p>
                <button onClick={() => reopenFinding(vendor.id, f)}>
                  <RotateCcw size={11} /> Reopen
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="findings-panel">
      <header className="findings-head">
        <div>
          <span className="section-kicker">Compliance Agent</span>
          <h3>{recommendationLabel(assessment.recommendation)}</h3>
        </div>
        <button className="findings-brief-toggle" onClick={() => setBriefOpen(!briefOpen)}>
          {briefOpen ? 'Hide brief' : 'Show brief'}
        </button>
      </header>

      {briefOpen && (
        <ul className="findings-brief">
          {assessment.brief.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}

      <div className="findings-stats">
        <span><strong>{assessment.stats.checked}</strong><small>checks run</small></span>
        <span><strong>{assessment.stats.autoClearRate}%</strong><small>auto-cleared</small></span>
        <span className={assessment.stats.needsHuman ? 'hot' : ''}>
          <strong>{assessment.stats.needsHuman}</strong><small>need you</small>
        </span>
      </div>

      {['red', 'amber'].map((tier) => {
        const items = grouped[tier];
        if (!items.length) return null;
        const [, label, blurb] = TIER_META[tier];
        return (
          <div className="findings-group" key={tier}>
            <div className={cx('findings-group-head', tier)}>
              <strong>{label}</strong><span>{items.length}</span>
            </div>
            <p className="findings-group-blurb">{blurb}</p>
            {items.map(renderFinding)}
          </div>
        );
      })}

      {grouped.red.length === 0 && grouped.amber.length === 0 && (
        <div className="findings-clear">
          <CheckCircle2 size={18} />
          <div>
            <strong>Nothing needs your judgement</strong>
            <small>Every finding auto-cleared or has already been resolved by a human.</small>
          </div>
        </div>
      )}

      {grouped.green.length > 0 && (
        <div className="findings-group">
          <button className={cx('findings-group-head', 'green', 'collapsible')} onClick={() => setShowGreen(!showGreen)}>
            <strong>Auto-cleared</strong>
            <span>{grouped.green.length}</span>
            <ChevronDown size={14} className={cx('finding-chevron', showGreen && 'up')} />
          </button>
          {showGreen && grouped.green.map(renderFinding)}
        </div>
      )}

      {resolving && (
        <div className="modal-backdrop" onMouseDown={() => setResolving(null)}>
          <section className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div>
                <span className="section-kicker">{resolving.finding.clause?.id || 'Agent finding'}</span>
                <h2>
                  {resolving.outcome === 'accept' && 'Accept and clear this finding'}
                  {resolving.outcome === 'dismiss' && 'Dismiss as a false positive'}
                  {resolving.outcome === 'mitigated' && 'Record as settled off-platform'}
                </h2>
                <p>{resolving.finding.title}</p>
              </div>
              <button onClick={() => setResolving(null)} aria-label="Close"><X size={18} /></button>
            </header>
            <div className="modal-body">
              <div className="resolve-context">
                <span>What the agent said</span>
                <p>{resolving.finding.detail}</p>
                <span>What it recommended</span>
                <p>{resolving.finding.recommendation}</p>
              </div>
              <label className="form-field">
                <span>Your reason (required — written to the audit trail)</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                  placeholder={resolving.outcome === 'dismiss'
                    ? 'Why is the agent wrong on this evidence?'
                    : 'What did you verify, and against what?'}
                />
              </label>
            </div>
            <footer>
              <button className="button secondary" onClick={() => setResolving(null)}>Cancel</button>
              <button className="button primary" onClick={commitResolve} disabled={!reason.trim()}>
                <Check size={15} /> Record decision
              </button>
            </footer>
          </section>
        </div>
      )}

      {clause && (
        <div className="modal-backdrop" onMouseDown={() => setClause(null)}>
          <section className="modal-card clause-card" onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div>
                <span className="section-kicker">{clause.source}</span>
                <h2>{clause.id} — {clause.title}</h2>
              </div>
              <button onClick={() => setClause(null)} aria-label="Close"><X size={18} /></button>
            </header>
            <div className="modal-body">
              <p className="clause-text">{clause.requirement}</p>
              <p className="clause-note">
                This clause is part of the Compliance Agent&rsquo;s Context layer. Every finding it raises
                cites the rule it was raised under, so a recommendation can be defended in an audit
                rather than taken on trust.
              </p>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
