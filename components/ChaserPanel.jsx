import { useState } from 'react';
import { useNexus, inspectUpload } from '../context/NexusContext';
import {
  MessageCircle, Mail, Send, Paperclip, UserRoundCheck, Languages, Clock3, ChevronDown, ArrowRightLeft,
  Pause, Play,
} from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');

const CHANNEL_ICON = { whatsapp: MessageCircle, email: Mail, portal: UserRoundCheck };
const CHANNEL_LABEL = { whatsapp: 'WhatsApp', email: 'Email', portal: 'Internal' };

const KIND_LABEL = {
  request: 'First request',
  followup: 'Follow-up · 48h',
  escalate: 'Escalation · 96h · manager copied',
  handoff: 'Handed to a human · 144h',
};

// ---------------------------------------------------------------------------
// The Chaser Agent surface.
//
// This is the part of the product that actually moves the brief's 7-day → 2-day
// metric. The reviewer's quote in the brief — "I spend more time finding
// missing documents than actually reviewing suppliers" — describes the gap
// between "document missing" and "document received", and that gap is not
// closed in the Review Workspace. It is closed here.
//
// Two decisions are load-bearing:
//   1. The message is composed in the supplier's working language, because a
//      follow-up a Dhaka or Guangzhou office can read converts and one they
//      cannot does not.
//   2. The supplier replies with an attachment on the thread they are already
//      in. No portal, no login. Portal login is the single largest source of
//      vendor-side friction and it is removable.
// ---------------------------------------------------------------------------
export default function ChaserPanel({ vendorId, compact = false, onlyDocId = null }) {
  const { getThreads, getVendor, chaseNow, ingestChaserReply, setChasePaused } = useNexus();
  const vendor = getVendor(vendorId);
  const all = getThreads(vendorId);
  // When the workspace has already selected one thread, showing the rest again
  // would duplicate the queue that sits beside it.
  const threads = onlyDocId ? all.filter((t) => t.docId === onlyDocId) : all;
  const [openId, setOpenId] = useState(threads[0]?.docId || null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  // A single-thread view has nothing to collapse into.
  const forceOpen = Boolean(onlyDocId);

  if (!threads.length) {
    return (
      <div className="chaser-empty">
        <UserRoundCheck size={18} />
        <div>
          <strong>Nothing outstanding</strong>
          <small>All required documents for {vendor?.shortName || 'this supplier'} have been received.</small>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('chaser-panel', compact && 'compact')}>
      {threads.map((thread) => {
        const open = forceOpen || openId === thread.docId;
        return (
          <article key={thread.docId} className={cx('chase-thread', open && 'open', thread.paused && 'paused', thread.state === 'stalled' && 'stalled', thread.state === 'processing' && 'processing')}>
            <button className="chase-head" onClick={() => !forceOpen && setOpenId(open ? null : thread.docId)}>
              <span className="chase-code">{thread.docCode}</span>
              <span className="chase-head-text">
                <strong>{thread.docTitle}</strong>
                <small>{thread.summary}</small>
              </span>
              <span className="chase-lang" title={`Composed in ${thread.languageName}`}>
                <Languages size={12} /> {thread.languageName}
              </span>
              <ChevronDown size={15} className="chase-chevron" />
            </button>

            {open && (
              <div className="chase-body">
                <div className="chase-toolbar">
                  <span className="chase-meta">
                    <Clock3 size={12} /> Open {Math.round(thread.elapsedHours / 24)}d · {thread.attempts} attempt{thread.attempts === 1 ? '' : 's'}
                  </span>
                  <span className="chase-toolbar-actions">
                    <button className="chase-toggle" onClick={() => setShowEnglish(!showEnglish)}>
                      <ArrowRightLeft size={12} /> {showEnglish ? 'Show as sent' : 'Show English copy'}
                    </button>
                    <button className="chase-toggle" onClick={() => setChasePaused(vendorId, thread.docId, !thread.paused)}>
                      {thread.paused ? <><Play size={12} /> Resume chasing</> : <><Pause size={12} /> Pause chasing</>}
                    </button>
                  </span>
                </div>

                <div className="chase-request-context">
                  <span><strong>{thread.dueState}</strong><small>{thread.clauseId}</small></span>
                  <p>{thread.reason}<small>{thread.detail}</small></p>
                </div>

                {thread.paused && (
                  <p className="chase-paused-note">
                    <Pause size={12} /> Paused by a human. Scheduled follow-ups will not send until this is resumed.
                  </p>
                )}

                <ol className="chase-timeline">
                  {thread.steps.map((step) => {
                    const Icon = CHANNEL_ICON[step.channel] || Mail;
                    return (
                      <li key={step.id} className={cx('chase-step', step.status)}>
                        <span className={cx('chase-dot', step.kind)}><Icon size={12} /></span>
                        <div>
                          <header>
                            <strong>{KIND_LABEL[step.kind]}</strong>
                            <span className="chase-when">
                              {step.status === 'sent'
                                ? `${CHANNEL_LABEL[step.channel]} · sent ${step.hoursAgo < 24 ? `${Math.round(step.hoursAgo)}h` : `${Math.round(step.hoursAgo / 24)}d`} ago`
                                : `Scheduled · in ${step.dueInHours}h`}
                            </span>
                          </header>
                          {step.kind !== 'handoff' && (
                            <p className={cx('chase-message', step.status === 'scheduled' && 'muted')} lang={showEnglish ? 'en' : step.language}>
                              {showEnglish ? step.english : step.body}
                            </p>
                          )}
                          {step.kind === 'handoff' && (
                            <p className={cx('chase-message', 'handoff', step.status === 'scheduled' && 'muted')}>{step.body}</p>
                          )}
                          {step.status === 'scheduled' && (
                            <button className="chase-action" disabled={thread.paused || thread.state === 'processing'} onClick={() => chaseNow(vendorId, thread.docId, step)}>
                              <Send size={12} /> Send now
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="chase-inbound">
                  <span className="chase-inbound-label"><Paperclip size={13} /> Supplier reply and attachment</span>
                  <p>The attachment is filed against this request, enters deterministic review, and closes the task only after it passes.</p>
                  {thread.messages.length > 0 && <div className="chase-messages">{thread.messages.map((message) => <p key={message.id} className={message.from}><strong>{message.from === 'supplier' ? 'Supplier' : message.from === 'agent' ? 'Chaser Agent' : 'System'}</strong>{message.body}</p>)}</div>}
                  <div className="chase-inbound-actions">
                    <label className="button secondary compact">
                      <Paperclip size={13} /> {uploadingId === thread.docId ? 'Reading attachment…' : 'Upload supplier attachment'}
                      <input type="file" disabled={thread.state === 'processing' || uploadingId === thread.docId} onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setUploadingId(thread.docId);
                        const verdict = await inspectUpload(file);
                        ingestChaserReply(vendorId, thread.docId, file.name, verdict);
                        setUploadingId(null);
                        event.target.value = '';
                      }} />
                    </label>
                    <button className="button primary compact" disabled={thread.state === 'processing'} onClick={() => ingestChaserReply(vendorId, thread.docId)}>
                      {thread.state === 'processing' ? 'Processing supplier reply…' : 'Simulate valid supplier reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
