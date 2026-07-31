import { useEffect, useMemo, useRef, useState } from 'react';
import { useNexus, APPROVAL_CEILING } from '../context/AppContext';
import useDialog from '../hooks/useDialog';
import DocumentCanvas from './DocumentCanvas';
import ExtractedForm from './ExtractedForm';
import ReviewQueue from './ReviewQueue';
import FindingDetail from './FindingDetail';
import ChaserPanel from './ChaserPanel';
import VendorChat from './VendorChat';
import { recommendationLabel } from '../agents/agentEngine';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Clock3, CornerUpLeft, Send, CheckCircle2, XCircle, FileQuestion,
  AlertOctagon, History, X, Sparkles, MessagesSquare, PackageCheck, MoreHorizontal, Check, ShieldQuestion,
  ListFilter,
} from 'lucide-react';
import { CURRENT_USERS, REQUEST_TYPES } from '../data/mockData';

const SUPERVISOR_NAME = CURRENT_USERS.supervisor.name;
const SUPERVISOR_REVIEWER = CURRENT_USERS.admin.name;

const cx = (...values) => values.filter(Boolean).join(' ');

// The reviewer's delegated approval limit now lives in the context and is
// enforced inside `submitDecision`, so the number that decides "may this person
// sign this off" is a control rather than a rendering choice. It is re-exported
// through this module's import so the copy on screen and the rule in the
// context can never disagree.

const DECISION_LABEL = {
  APPROVE: 'Approve vendor',
  REJECT: 'Reject vendor application',
  REQUEST_DOCS: 'Request missing documents',
  ESCALATE: 'Escalate to your supervisor',
};

const DECISION_COPY = {
  APPROVE: 'You are approving this vendor within your delegated authority. Vendors above your approval limit must be sent to a supervisor.',
  REJECT: 'The supplier and onboarding executive will be notified with your reason.',
  REQUEST_DOCS: 'The supplier will see this as their next required action in their portal.',
  ESCALATE: 'This hands the case to your supervisor and it leaves your queue. They will approve it, reject it, or send it back to you with an instruction.',
};

// ---------------------------------------------------------------------------
// Screen 2 — the Review Workspace.
//
// Restructured from three competing panels into a single linear spine, because
// the previous layout failed on its own terms: it forced the reviewer to decide
// where to look before they could decide anything about the supplier, it ran
// past the viewport horizontally, and it offered two different places to accept
// the same value.
//
// The structure now reads top-to-bottom, then left-to-right, once:
//
//   IDENTITY   who this supplier is                       (one compact row)
//   PROGRESS   where they are in the primary flow          (a stepper)
//   VERDICT    the recommendation + one primary action     (Von Restorff)
//   QUEUE      what needs deciding, in priority order      (left, master)
//   DETAIL     one decision at a time, fully explained     (right, detail)
//
// Master–detail is the pattern every reviewer already knows from an inbox
// (Jakob's law), so the layout itself needs no learning. The chat moved from a
// third column to an overlay drawer — that column was what pushed the page past
// the viewport, and a reference tool should not permanently occupy space it
// only occasionally earns.
// ---------------------------------------------------------------------------
export default function ReviewWorkspace({
  vendorId, onBack, onOpenAudit,
  // The two return edges the original flow diagram was missing. Without
  // `onCollectDocuments` a reviewer who finds a document outstanding has to
  // navigate back out by hand; without `onNextVendor` the flow simply stops at
  // the decision instead of returning to the queue for the next case.
  onCollectDocuments, onNextVendor,
  // A supervisor reads the same case the admin works. Same screen, no actions.
  readOnly = false,
}) {
  const {
    getVendor, acceptField, correctField, submitDecision, getAssessment, getThreads,
    runAgentPass, activateInErp, activationGate, vendors, getTriage, acknowledgeSupervisorNote,
    raiseRequest, getCaseOwner,
  } = useNexus();

  const vendor = getVendor(vendorId);
  const assessment = getAssessment(vendorId);
  const threads = getThreads(vendorId);

  const [selection, setSelection] = useState(null);
  const [confirming, setConfirming] = useState(null);
  // Which kind of request the reviewer is raising to their supervisor, if any.
  const [requesting, setRequesting] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [docFieldKey, setDocFieldKey] = useState(null);
  const [originalByDoc, setOriginalByDoc] = useState({});

  // The queue's own priority order decides what opens first: the most blocking
  // thing, every time. The reviewer never lands on an empty or arbitrary pane.
  const defaultSelection = useMemo(() => {
    if (assessment.blockers.length) return { type: 'finding', id: assessment.blockers[0].id };
    if (assessment.cautions.length) return { type: 'finding', id: assessment.cautions[0].id };
    if (threads.length) return { type: 'chase', id: threads[0].docId };
    return { type: 'doc', id: vendor?.documents[0]?.id };
  }, [assessment.blockers, assessment.cautions, threads, vendor]);

  useEffect(() => {
    setSelection(null);
    setChatOpen(false);
    setQueueOpen(false);
  }, [vendorId]);

  const active = selection || defaultSelection;
  const activeFinding = active?.type === 'finding'
    ? assessment.findings.find((f) => f.id === active.id)
    : null;
  const activeDoc = active?.type === 'doc'
    ? vendor?.documents.find((d) => d.id === active.id)
    : null;
  const activeThread = active?.type === 'chase'
    ? threads.find((t) => t.docId === active.id)
    : null;

  const activeDocId = activeDoc?.id || null;
  const showOriginal = activeDocId ? originalByDoc[activeDocId] !== false : true;
  const toggleOriginal = (value) => {
    if (!activeDocId) return;
    setOriginalByDoc((current) => ({ ...current, [activeDocId]: value }));
  };
  const activeDocFieldKeys = activeDoc?.fields.map((field) => field.key).join('|') || '';
  useEffect(() => {
    const keys = activeDocFieldKeys ? activeDocFieldKeys.split('|') : [];
    setDocFieldKey((current) => (keys.includes(current) ? current : keys[0] || null));
  }, [activeDocId, activeDocFieldKeys]);

  const isClosed = vendor && ['Approved', 'Active', 'Rejected'].includes(vendor.finalStatus);
  const gate = activationGate(vendorId);

  // Delegation of authority. A Compliance Manager may sign off up to residual
  // risk 70; above that the decision is not theirs to make, so the primary
  // action stops being "approve" and becomes "send it to someone who can".
  // This is a routing rule, not a judgement — which is exactly why it is
  // evaluated here rather than left to the reviewer to remember.
  const aboveAuthority = Boolean(vendor) && vendor.riskScore > APPROVAL_CEILING;
  const evidenceReady = vendor && assessment.blockers.length === 0 && vendor.missingCount === 0 && !isClosed && !readOnly;
  const canApprove = evidenceReady && !aboveAuthority;

  // A request already in flight for this vendor, so the workspace can say
  // "this is with your supervisor" instead of offering to send it twice.
  const ownership = getCaseOwner(vendorId);
  const pendingRequest = ownership.request;

  // Not every pending request takes the case away from the reviewer, and
  // treating them all the same was wrong.
  //
  //   AUTHORITY / ESCALATION  hand the DECISION up. There is nothing left for
  //                           the reviewer to decide, so the verdict band is
  //                           replaced by a statement of where the case is.
  //
  //   RISK_ACCEPTANCE /       ask about ONE finding, or about the vendor's
  //   REASSESSMENT            standing. The reviewer can and should keep
  //                           working the rest of the pack meanwhile, so this
  //                           is a notice above the verdict, not instead of it.
  const decisionIsAway = ownership.decisionAway;
  const noticeRequest = pendingRequest && !decisionIsAway ? pendingRequest : null;

  // The next case worth opening once this one is decided — the highest-priority
  // open vendor that is not the one on screen. Computing it here means the
  // "next" button is never a dead link and never sends the reviewer to a case
  // that is already closed.
  const nextVendor = useMemo(() => {
    const rank = { blocked: 0, decide: 1, working: 2 };
    return (vendors || [])
      .filter((v) => v.id !== vendorId && !v.finalStatus)
      .sort((a, b) => (rank[getTriage(a.id).band] ?? 9) - (rank[getTriage(b.id).band] ?? 9)
        || a.slaHours - b.slaHours)[0] || null;
  }, [vendors, vendorId, getTriage]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && canApprove) {
        event.preventDefault();
        setConfirming('APPROVE');
      }
      if (event.key === 'Escape') {
        setConfirming(null);
        setMoreOpen(false);
        setQueueOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canApprove]);

  if (!vendor) return null;

  const openDoc = (docId, fieldKey) => {
    setSelection({ type: 'doc', id: docId });
    setDocFieldKey(fieldKey || null);
  };

  const confirmDecision = () => {
    const submitted = submitDecision(vendor.id, confirming, decisionNotes, { finding: activeFinding });
    if (!submitted) return;
    setConfirming(null);
    setDecisionNotes('');
    if (confirming !== 'REQUEST_DOCS') onOpenAudit();
  };

  // The brief's primary flow, made visible. A reviewer should never have to
  // infer which stage a supplier is at, or what the next step is.
  const steps = [
    { label: 'Evidence collected', done: vendor.missingCount === 0, hint: `${vendor.missingCount} outstanding` },
    { label: 'Findings cleared', done: assessment.blockers.length === 0, hint: `${assessment.blockers.length} blocking` },
    { label: 'Approval recorded', done: Boolean(vendor.finalStatus), hint: 'Awaiting your decision' },
    { label: 'Active in ERP', done: vendor.finalStatus === 'Active', hint: 'Not yet activated' },
  ];
  const currentStep = steps.findIndex((s) => !s.done);
  const queueCount = assessment.blockers.length + assessment.cautions.length + threads.length;
  const selectFromQueue = (nextSelection) => {
    setSelection(nextSelection);
    setQueueOpen(false);
  };

  return (
    <div className="review-workspace">
      {/* --- IDENTITY ------------------------------------------------------ */}
      <header className="rw-identity">
        <button className="icon-button" onClick={onBack} aria-label="Back to worklist"><ArrowLeft size={18} /></button>
        <span className="company-avatar">{vendor.initials}</span>
        <div className="rw-identity-text">
          <div className="rw-identity-name">
            <strong>{vendor.name}</strong>
            <span className={cx('risk-pill', vendor.risk.toLowerCase())}><i />{vendor.risk} <b>{vendor.riskScore}</b></span>
          </div>
          <small>{vendor.id} · {vendor.category} · {vendor.country}</small>
        </div>
        <div className="rw-identity-actions">
          <span className={cx('sla-chip', vendor.slaHours <= 6 && 'urgent')}><Clock3 size={14} /> {vendor.sla} SLA</span>
          <button
            className="button secondary compact rw-queue-trigger"
            type="button"
            aria-controls="review-findings-drawer"
            aria-expanded={queueOpen}
            onClick={() => setQueueOpen(true)}
          >
            <ListFilter size={15} /> Findings <span>{queueCount}</span>
          </button>
          <button className={cx('button', chatOpen ? 'primary' : 'secondary', 'compact')} onClick={() => setChatOpen(!chatOpen)}>
            <MessagesSquare size={15} /> Ask the pack
          </button>
          <button className="button secondary compact" onClick={onOpenAudit}><History size={15} /> Audit</button>
        </div>
      </header>

      {/* --- PROGRESS ------------------------------------------------------ */}
      <ol className="rw-stepper">
        {steps.map((s, i) => (
          <li key={s.label} className={cx(s.done && 'done', i === currentStep && 'current')}>
            <span className="rw-step-dot">{s.done ? <Check size={11} /> : i + 1}</span>
            <span className="rw-step-text">
              <strong>{s.label}</strong>
              {!s.done && i === currentStep && <small>{s.hint}</small>}
            </span>
          </li>
        ))}
      </ol>

      {/* --- RETURNED WORK -------------------------------------------------
          A supervisor's instruction lands here, at the top of the workspace,
          not in a notification. This is the closing half of the escalation
          round-trip: the admin cannot start work on this case without seeing
          what they were asked to do. */}
      {vendor.supervisorNote && !readOnly && (
        <div className="rw-returned">
          <CornerUpLeft size={17} />
          <div>
            <strong>Handed back by {vendor.supervisorNote.by}</strong>
            <small>“{vendor.supervisorNote.note}” · {new Date(vendor.supervisorNote.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
          </div>
          <button className="button secondary compact" onClick={() => acknowledgeSupervisorNote(vendor.id)}>
            <Check size={14} /> Acknowledge return
          </button>
        </div>
      )}

      {/* A request that is with the supervisor but does not take the case away.
          Stated so the reviewer neither raises it twice nor sits waiting, while
          the verdict band below stays live so they can keep working the pack. */}
      {noticeRequest && !readOnly && (
        <div className="rw-notice">
          <ArrowUpRight size={16} />
          <div>
            <strong>{(REQUEST_TYPES[noticeRequest.type] || {}).label} with {SUPERVISOR_NAME}</strong>
            <small>{noticeRequest.id} · {noticeRequest.title}. You can carry on with the rest of the pack.</small>
          </div>
        </div>
      )}

      {/* --- VERDICT + the single primary action --------------------------- */}
      {readOnly ? (
        <div className="rw-verdict hold">
          <AlertOctagon size={17} />
          <div>
            <strong>Read-only review — {recommendationLabel(assessment.recommendation)}</strong>
            <small>Case actions belong to {vendor.owner}. Resolve your decisions from Requests.</small>
          </div>
        </div>
      ) : vendor.finalStatus === 'Active' ? (
        <div className="rw-verdict done">
          <PackageCheck size={17} />
          <div>
            <strong>Active in the ERP supplier master as {vendor.erpId}</strong>
            <small>Every finding, override and approval that led here is in the audit trail.</small>
          </div>
        </div>
      ) : vendor.finalStatus === 'Approved' ? (
        <div className="rw-verdict ready">
          <CheckCircle2 size={17} />
          <div>
            <strong>Approved — not yet in the ERP supplier master</strong>
            <small>{gate.canActivate
              ? 'All mandatory documents verified and a human approval is on record. PROC-3.3 and PROC-5.1 are satisfied.'
              : gate.blockers.join(' ')}</small>
          </div>
          <button className="button primary" onClick={() => activateInErp(vendor.id)} disabled={!gate.canActivate}>
            <PackageCheck size={15} /> Activate in ERP
          </button>
        </div>
      ) : decisionIsAway ? (
        // Anything already sent up is stated plainly, with the type, so the
        // reviewer does not raise it again or sit waiting on a decision they
        // think is theirs.
        <div className="rw-verdict hold">
          <AlertOctagon size={17} />
          <div>
            <strong>With {SUPERVISOR_NAME} — {(REQUEST_TYPES[pendingRequest.type] || {}).label}</strong>
            <small>
              {pendingRequest.id} · raised {new Date(pendingRequest.raisedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.
              It comes back approved, refused, or with an instruction for you.
            </small>
          </div>
          {nextVendor && onNextVendor && (
            <button className="button primary" onClick={() => onNextVendor(nextVendor.id, 'ai-review')}>
              Next: {nextVendor.shortName || nextVendor.name} <ArrowRight size={15} />
            </button>
          )}
        </div>
      ) : isClosed || vendor.finalStatus === 'Escalated' ? (
        <div className={cx('rw-verdict', vendor.finalStatus === 'Escalated' ? 'hold' : 'closed')}>
          {vendor.finalStatus === 'Escalated' ? <AlertOctagon size={17} /> : <XCircle size={17} />}
          <div>
            <strong>{vendor.finalStatus === 'Escalated'
              ? 'With the supervisor — waiting on their decision'
              : `Decision recorded — ${vendor.finalStatus}`}</strong>
            <small>{vendor.finalStatus === 'Escalated'
              ? 'You have handed this up. It will come back to you approved, rejected, or with an instruction.'
              : 'This case is closed; every finding and override stays in the audit trail.'}</small>
          </div>
          {/* The loop back to the queue. A decided case is not the end of the
              flow — it is the end of one lap of it. */}
          {nextVendor && onNextVendor && (
            <button className="button primary" onClick={() => onNextVendor(nextVendor.id, 'ai-review')}>
              Next: {nextVendor.shortName || nextVendor.name} <ArrowRight size={15} />
            </button>
          )}
        </div>
      ) : (
        <div className={cx('rw-verdict', canApprove ? 'ready' : 'hold')}>
          <span className="rw-verdict-icon">{canApprove ? <CheckCircle2 size={17} /> : <AlertOctagon size={17} />}</span>
          <div>
            <strong>{recommendationLabel(assessment.recommendation)}</strong>
            <small>
              {assessment.blockers.length > 0
                ? `${assessment.blockers.length} blocking · ${assessment.cautions.length} cautions · ${vendor.missingCount} document(s) outstanding`
                : aboveAuthority
                  ? `Pack complete. Residual risk ${vendor.riskScore} is above the ${APPROVAL_CEILING} you may approve alone — this one goes to ${SUPERVISOR_NAME}.`
                  : assessment.cautions.length > 0
                    ? `No blockers. Review ${assessment.cautions.length} caution${assessment.cautions.length === 1 ? '' : 's'} before approval.`
                    : 'Pack complete. Ready for your decision.'}
            </small>
          </div>
          <div className="rw-verdict-actions">
            {/* The branch the diagram drew as a straight line. If evidence is
                outstanding there is nothing to review yet, so the primary move
                is backwards into collection, not forwards into a decision. */}
            {vendor.missingCount > 0 && onCollectDocuments && (
              <button className="button secondary compact" onClick={onCollectDocuments}>
                <FileQuestion size={15} /> Collect {vendor.missingCount} missing
              </button>
            )}
            <button className="button secondary compact" onClick={() => runAgentPass(vendor.id)}>
              <Sparkles size={15} /> Run agents
            </button>
            {/* A blocking finding that cannot be cleared is not always a
                rejection — sometimes the honest answer is that the control
                cannot be met and the risk has to be formally accepted by
                someone with the authority to accept it. Offering that route
                here is what stops reviewers quietly overriding instead. */}
            {assessment.blockers.length > 0 && !noticeRequest && (
              <button className="button secondary compact" onClick={() => setRequesting('RISK_ACCEPTANCE')}>
                <ShieldQuestion size={15} /> Request risk acceptance
              </button>
            )}
            {aboveAuthority ? (
              <button
                className="button primary"
                onClick={() => setRequesting('AUTHORITY')}
                disabled={assessment.blockers.length > 0 || vendor.missingCount > 0}
                title={assessment.blockers.length > 0 ? 'Clear every blocking finding first' : `Residual risk ${vendor.riskScore} exceeds your ${APPROVAL_CEILING} limit`}
              >
                <ArrowUpRight size={15} /> Send for approval
              </button>
            ) : (
              <button
                className="button primary"
                onClick={() => setConfirming('APPROVE')}
                disabled={!canApprove}
                title={!canApprove ? 'Clear every blocking finding and outstanding document first' : 'Ctrl + Enter'}
              >
                <CheckCircle2 size={15} /> Approve vendor
              </button>
            )}
            {/* Rejecting, escalating and re-requesting are real but rare. Giving
                them equal weight made five buttons compete for one decision. */}
            <div className="rw-more">
              <button className="icon-button" onClick={() => setMoreOpen(!moreOpen)} aria-label="Other decisions">
                <MoreHorizontal size={18} />
              </button>
              {moreOpen && (
                <div className="rw-more-pop" onMouseLeave={() => setMoreOpen(false)}>
                  <button onClick={() => { setMoreOpen(false); setConfirming('REQUEST_DOCS'); }}>
                    <FileQuestion size={14} /> Request missing documents
                  </button>
                  <button onClick={() => { setMoreOpen(false); setConfirming('ESCALATE'); }}>
                    <AlertOctagon size={14} /> Escalate to supervisor
                  </button>
                  <button className="danger" onClick={() => { setMoreOpen(false); setConfirming('REJECT'); }}>
                    <XCircle size={14} /> Reject application
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- QUEUE (master) + DETAIL --------------------------------------- */}
      <div className="rw-body">
        {queueOpen && (
          <button className="rw-queue-scrim" aria-label="Close findings" onClick={() => setQueueOpen(false)} />
        )}
        <div id="review-findings-drawer" className={cx('rw-queue-wrap', queueOpen && 'is-open')}>
          <header className="rw-queue-mobile-head">
            <strong>Findings</strong>
            <span>{queueCount}</span>
            <button className="icon-button" type="button" aria-label="Close findings" onClick={() => setQueueOpen(false)}>
              <X size={17} />
            </button>
          </header>
          <ReviewQueue
            vendor={vendor}
            assessment={assessment}
            threads={threads}
            selection={active}
            onSelect={selectFromQueue}
          />
        </div>

        <div className="rw-detail">
          {activeFinding && (
            <FindingDetail vendor={vendor} finding={activeFinding} onJumpToDoc={openDoc} />
          )}

          {activeThread && (
            <div className="detail-pane">
              <div className="detail-scroll">
                <header className="detail-head">
                  <div className="detail-head-top">
                    <span className="detail-tier blue">Being chased</span>
                    <span className="detail-agent">Chaser Agent · {activeThread.languageName}</span>
                  </div>
                  <h2>{activeThread.docTitle}</h2>
                  <p className="detail-detail">{activeThread.summary}</p>
                </header>
                <section className="detail-section">
                  <h3>The conversation</h3>
                  <ChaserPanel vendorId={vendor.id} onlyDocId={activeThread.docId} />
                </section>
              </div>
            </div>
          )}

          {activeDoc && (
            <div className="detail-pane">
              <div className="detail-split">
                <DocumentCanvas
                  doc={activeDoc}
                  activeFieldKey={docFieldKey || activeDoc.fields[0]?.key || null}
                  onSelectField={setDocFieldKey}
                  showOriginal={showOriginal}
                  onToggleOriginal={toggleOriginal}
                />
                <ExtractedForm
                  doc={activeDoc}
                  activeFieldKey={docFieldKey || activeDoc.fields[0]?.key || null}
                  onSelectField={setDocFieldKey}
                  showOriginal={showOriginal}
                  readOnly={readOnly}
                  onAccept={readOnly ? undefined : (key) => acceptField(vendor.id, activeDoc.id, key)}
                  onCorrect={readOnly ? undefined : (key, value, reason, notes) => correctField(vendor.id, activeDoc.id, key, value, reason, notes)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat as a drawer, not a permanent column. */}
      {chatOpen && (
        <>
          <button className="rw-drawer-scrim" aria-label="Close chat" onClick={() => setChatOpen(false)} />
          <div className="rw-drawer">
            <button className="rw-drawer-close" onClick={() => setChatOpen(false)} aria-label="Close"><X size={16} /></button>
            <VendorChat vendorId={vendor.id} selectedDocId={activeDoc?.id || activeFinding?.docId} selectedFieldKey={docFieldKey || activeFinding?.fieldKey} authorityCeiling={APPROVAL_CEILING} />
          </div>
        </>
      )}

      {confirming && (
        <ConfirmDialog
          vendorId={vendor.id} decision={confirming} notes={decisionNotes}
          onNotes={setDecisionNotes} onCancel={() => setConfirming(null)} onConfirm={confirmDecision}
        />
      )}

      {requesting && (
        <RaiseRequestDialog
          type={requesting}
          vendor={vendor}
          assessment={assessment}
          onCancel={() => setRequesting(null)}
          onSubmit={(payload) => {
            raiseRequest({ type: requesting, vendorId: vendor.id, riskScore: vendor.riskScore, ...payload });
            setRequesting(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Raising a request to the supervisor.
//
// The two types a reviewer can raise from this screen need different things
// from them, and asking for the wrong thing is how these forms become
// rubber stamps:
//
//   RISK_ACCEPTANCE  needs a compensating control and an end date. A reviewer
//                    asking to waive a control without saying what mitigates
//                    it in the meantime has not made a case, and the form
//                    should not let them pretend otherwise.
//
//   AUTHORITY        needs no case at all. Nobody is asking for a favour —
//                    a threshold fired. So it collects context, not
//                    justification, and the fields are pre-filled from the
//                    assessment rather than retyped.
// ---------------------------------------------------------------------------
function RaiseRequestDialog({ type, vendor, assessment, onCancel, onSubmit }) {
  const cardRef = useRef(null);
  useDialog(cardRef, onCancel, { autoFocus: false });

  const blocker = assessment.blockers[0];
  const [reason, setReason] = useState('');
  const [compensating, setCompensating] = useState('');
  const [expiry, setExpiry] = useState('');

  const isAcceptance = type === 'RISK_ACCEPTANCE';
  const ready = reason.trim() && (!isAcceptance || (compensating.trim() && expiry));

  const submit = () => {
    if (isAcceptance) {
      onSubmit({
        title: `Accept ${blocker?.title || 'an unresolved finding'} for ${vendor.shortName || vendor.name}`,
        reason,
        detail: {
          // The finding's own id travels with the request. Without it a granted
          // exception has nothing to attach to and the blocker it was raised
          // about stays open — which made the whole route decorative.
          findingId: blocker?.id || null,
          control: blocker?.clauseId ? `${blocker.clauseId} — ${blocker.title}` : (blocker?.title || 'Unresolved blocking finding'),
          compensating,
          proposedExpiry: new Date(expiry).toISOString(),
        },
      });
      return;
    }
    onSubmit({
      title: `${vendor.shortName || vendor.name} exceeds your approval limit`,
      reason,
      detail: {
        threshold: `Compliance Manager may approve up to residual risk ${APPROVAL_CEILING}`,
        trigger: `Residual risk ${vendor.riskScore} · ${vendor.country} · ${vendor.category}`,
        fourEyes: `Reviewed by ${SUPERVISOR_REVIEWER} — she cannot also approve it.`,
      },
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal-card" role="dialog" aria-modal="true" aria-labelledby="raise-dialog-title"
        tabIndex={-1} ref={cardRef} onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-kicker">{vendor.id} · to {SUPERVISOR_NAME}</span>
            <h2 id="raise-dialog-title">{isAcceptance ? 'Request a risk acceptance' : 'Send for approval'}</h2>
            <p>{isAcceptance
              ? 'You are asking to proceed with a control unmet. Exceptions are time-boxed — say what covers the gap and when it ends.'
              : `Residual risk ${vendor.riskScore} is above the ${APPROVAL_CEILING} a Compliance Manager may approve alone. This is a routing rule, not a judgement on your review.`}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          {isAcceptance && blocker && (
            <p className="raise-context">
              <strong>Control not met:</strong> {blocker.title}
              {blocker.clauseId ? ` · ${blocker.clauseId}` : ''}
            </p>
          )}
          <label className="form-field">
            <span>{isAcceptance ? 'Why can this control not be met? (required)' : 'Anything your supervisor should know (required)'}</span>
            <textarea
              value={reason} onChange={(event) => setReason(event.target.value)} autoFocus
              placeholder={isAcceptance
                ? 'e.g. The certificate lapsed on 30 June and the re-audit is booked for 18 August.'
                : 'e.g. Evidence pack complete, every finding cleared. Country risk is what drives the score.'}
            />
          </label>
          {isAcceptance && (
            <>
              <label className="form-field">
                <span>What mitigates the risk meanwhile? (required)</span>
                <textarea
                  value={compensating} onChange={(event) => setCompensating(event.target.value)}
                  placeholder="e.g. Pre-shipment inspection on every lot; payment terms capped at 30 days."
                />
              </label>
              <label className="form-field">
                <span>Proposed expiry (required — the exception lapses on this date)</span>
                <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
              </label>
            </>
          )}
        </div>
        <footer>
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" onClick={submit} disabled={!ready}>
            <Send size={15} /> Send to {SUPERVISOR_NAME.split(' ')[0]}
          </button>
        </footer>
      </section>
    </div>
  );
}

// Its own component so the dialog hook is scoped to the dialog's own lifetime.
function ConfirmDialog({ vendorId, decision, notes, onNotes, onCancel, onConfirm }) {
  const cardRef = useRef(null);
  useDialog(cardRef, onCancel, { autoFocus: false });

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <section
        className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title"
        tabIndex={-1} ref={cardRef} onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div><span className="section-kicker">{vendorId}</span><h2 id="confirm-dialog-title">{DECISION_LABEL[decision]}</h2><p>{DECISION_COPY[decision]}</p></div>
          <button type="button" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">
          <label className="form-field">
            <span>Rationale (required — written to the audit trail)</span>
            <textarea value={notes} onChange={(event) => onNotes(event.target.value)} autoFocus placeholder="Record the basis for this decision…" />
          </label>
        </div>
        <footer>
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" onClick={onConfirm} disabled={!notes.trim()}><Send size={15} /> {decision === 'APPROVE' ? 'Approve vendor' : decision === 'REQUEST_DOCS' ? 'Send document request' : 'Confirm decision'}</button>
        </footer>
      </section>
    </div>
  );
}
