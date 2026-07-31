import { useState } from 'react';
import { AGENTS_BY_ID } from '../agents/agentCatalog';
import {
  AlertOctagon, AlertTriangle, CheckCircle2, ChevronDown, FileStack, Check,
} from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// The decision queue — the left spine of the Review Workspace.
//
// The previous layout put findings, the document pack and the chase threads in
// three tabbed panels of equal weight, so the reviewer's first task on opening
// a supplier was deciding where to look. That is work the machine should have
// already done.
//
// This is a single ordered list instead: blocking items first, numbered, then
// items worth a glance, then outstanding documents, then everything already
// cleared (collapsed). Reading top to bottom IS the order the work should be
// done in — Miller's law for the chunking, serial-position for putting the
// unavoidable decisions at the top.
//
// Selecting a row drives the whole right-hand pane. One selection, one purpose,
// one decision — rather than three panels competing for the same attention.
// ---------------------------------------------------------------------------

const TIER_ICON = { red: AlertOctagon, amber: AlertTriangle, green: CheckCircle2 };

function QueueRow({ index, tier, title, meta, active, onClick, done }) {
  const Icon = TIER_ICON[tier] || CheckCircle2;
  return (
    <button
      className={cx('queue-row', tier, active && 'active', done && 'done')}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className={cx('queue-marker', tier)}>
        {done ? <Check size={12} /> : index != null ? index : <Icon size={12} />}
      </span>
      <span className="queue-row-text">
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
    </button>
  );
}

export default function ReviewQueue({ vendor, assessment, threads, selection, onSelect }) {
  const [showCleared, setShowCleared] = useState(false);
  const [showPack, setShowPack] = useState(false);

  const blockers = assessment.blockers;
  const cautions = assessment.cautions;
  const cleared = assessment.findings.filter((f) => f.resolved);

  const is = (type, id) => selection?.type === type && selection?.id === id;
  const agentName = (f) => AGENTS_BY_ID[f.agentId]?.name || 'Agent';

  return (
    <aside className="review-queue">
      <div className="queue-scroll">
        {blockers.length > 0 && (
          <section className="queue-group">
            <header className="queue-group-head red">
              <strong>Needs a decision</strong>
              <span>{blockers.length}</span>
            </header>
            <p className="queue-group-note">Review cannot conclude until these are resolved.</p>
            {blockers.map((f, i) => (
              <QueueRow
                key={f.id} index={i + 1} tier="red" title={f.title}
                meta={`${agentName(f)}${f.clause ? ` · ${f.clause.id}` : ''}`}
                active={is('finding', f.id)}
                onClick={() => onSelect({ type: 'finding', id: f.id })}
              />
            ))}
          </section>
        )}

        {cautions.length > 0 && (
          <section className="queue-group">
            <header className="queue-group-head amber">
              <strong>Review needed</strong>
              <span>{cautions.length}</span>
            </header>
            <p className="queue-group-note">Not blocking. You can recommend without clearing these.</p>
            {cautions.map((f) => (
              <QueueRow
                key={f.id} tier="amber" title={f.title}
                meta={`${agentName(f)}${f.confidence != null ? ` · ${f.confidence}% confidence` : ''}`}
                active={is('finding', f.id)}
                onClick={() => onSelect({ type: 'finding', id: f.id })}
              />
            ))}
          </section>
        )}

        {threads.length > 0 && (
          <section className="queue-group">
            <header className="queue-group-head blue">
              <strong>Being chased</strong>
              <span>{threads.length}</span>
            </header>
            <p className="queue-group-note">The Chaser Agent owns these. Nothing needed from you.</p>
            {threads.map((t) => (
              <QueueRow
                key={t.docId} tier="blue" title={t.docTitle}
                meta={`${t.attempts} attempt${t.attempts === 1 ? '' : 's'} · ${t.languageName}`}
                active={is('chase', t.docId)}
                onClick={() => onSelect({ type: 'chase', id: t.docId })}
              />
            ))}
          </section>
        )}

        {blockers.length === 0 && cautions.length === 0 && (
          <div className="queue-clear">
            <CheckCircle2 size={17} />
            <div>
              <strong>Nothing needs your judgement</strong>
              <small>Every finding is cleared or auto-cleared.</small>
            </div>
          </div>
        )}

        {/* Progressive disclosure: the raw pack and the already-cleared items
            are available but do not compete with the open decisions. */}
        <section className="queue-group">
          <button className="queue-group-head collapsible" onClick={() => setShowPack(!showPack)}>
            <FileStack size={13} />
            <strong>Full evidence pack</strong>
            <span>{vendor.documents.length}</span>
            <ChevronDown size={14} className={cx('queue-chevron', showPack && 'up')} />
          </button>
          {showPack && vendor.documents.map((doc) => (
            <QueueRow
              key={doc.id}
              tier={doc.status === 'Missing' ? 'red' : doc.status === 'Verified' ? 'green' : 'amber'}
              title={doc.title} meta={`${doc.code} · ${doc.status}`}
              active={is('doc', doc.id)}
              onClick={() => onSelect({ type: 'doc', id: doc.id })}
            />
          ))}
        </section>

        {cleared.length > 0 && (
          <section className="queue-group">
            <button className="queue-group-head collapsible" onClick={() => setShowCleared(!showCleared)}>
              <CheckCircle2 size={13} />
              <strong>Cleared</strong>
              <span>{cleared.length}</span>
              <ChevronDown size={14} className={cx('queue-chevron', showCleared && 'up')} />
            </button>
            {showCleared && cleared.map((f) => (
              <QueueRow
                key={f.id} tier="green" done title={f.title}
                meta={f.resolution ? f.resolution.label : 'Auto-cleared'}
                active={is('finding', f.id)}
                onClick={() => onSelect({ type: 'finding', id: f.id })}
              />
            ))}
          </section>
        )}
      </div>

      <footer className="queue-footer">
        <span><strong>{assessment.stats.checked}</strong> checks</span>
        <span><strong>{assessment.stats.autoClearRate}%</strong> auto-cleared</span>
        <span className={assessment.stats.needsHuman ? 'hot' : ''}>
          <strong>{assessment.stats.needsHuman}</strong> need you
        </span>
      </footer>
    </aside>
  );
}
