import { useMemo, useState } from 'react';
import { useNexus } from '../context/AppContext';
import OutcomeDashboard from './OutcomeDashboard';
import {
  History, Search, Filter, UserCheck, Calendar, ShieldCheck, Bot, ScrollText, BarChart3,
  GitBranch, Ban, Building2, UserCog, ShieldAlert, ChevronRight,
} from 'lucide-react';

const cx = (...values) => values.filter(Boolean).join(' ');

const ACTION_LABEL = {
  FIELD_ACCEPT: 'AI finding accepted',
  FIELD_OVERRIDE: 'Field corrected & logged',
  DOCUMENT_UPLOAD: 'Document uploaded',
  DOCUMENT_VERIFIED: 'Document verified',
  DOCUMENT_REJECTED: 'Document sent back',
  DOCUMENT_REQUESTED: 'Document requested',
  DECISION: 'Decision recorded',
  VENDOR_INVITED: 'Vendor invited',
  AI_REVIEW: 'AI review completed',
  AGENT_ACTION: 'Agent action executed',
  AGENT_BLOCKED: 'Agent action refused',
  AGENT_PENDING: 'Agent action held for approval',
  AGENT_APPROVAL: 'Human resolved an agent gate',
  AGENT_CONFIG: 'Agent configuration changed',
  GATE_BLOCKED: 'Activation gate refused',
  PROFILE_SUBMITTED: 'Company profile submitted',
  APPLICATION_SUBMITTED: 'Application submitted',
  // Added with the three-role workflow; without these the trail printed raw
  // enum names for exactly the events an auditor cares most about.
  FINDING_RESOLVED: 'Finding closed by a human',
  FINDING_REOPENED: 'Finding reopened',
  REQUEST_RESOLVED: 'Supervisor decision',
  APPROVAL_GATE_BLOCKED: 'Approval refused by the evidence gate',
  AUTHORITY_LIMIT_BLOCKED: 'Approval refused — above delegated authority',
  CHASER_PAUSED: 'Supplier chasing paused',
  CHASER_RESUMED: 'Supplier chasing resumed',
  SETTINGS_UPDATED: 'Workspace preferences changed',
};

// ---------------------------------------------------------------------------
// Authority lanes.
//
// The trail's whole claim is "AI-assisted, human-controlled". A reverse-
// chronological feed asserts that; it does not show it. Placing every event in
// the lane of whoever held the authority for it makes the claim checkable at a
// glance: the agent lane is busy, and every lane containing a *decision* is a
// human one. That is the product thesis, drawn rather than stated.
// ---------------------------------------------------------------------------
const LANES = {
  supplier: { label: 'Supplier', icon: Building2, hint: 'Evidence supplied by the vendor' },
  agent: { label: 'Agents', icon: Bot, hint: 'Extraction, corroboration, chasing — never a decision' },
  reviewer: { label: 'Reviewer', icon: UserCog, hint: 'Compliance Manager, within delegated authority' },
  supervisor: { label: 'Supervisor', icon: ShieldCheck, hint: 'Head of Compliance — four-eyes and exceptions' },
};
const LANE_ORDER = ['supplier', 'agent', 'reviewer', 'supervisor'];

// Moments the platform said no. These are the load-bearing entries in any real
// audit: not what the system did, but what it refused to do and why.
const REFUSALS = new Set([
  'AGENT_BLOCKED', 'GATE_BLOCKED', 'APPROVAL_GATE_BLOCKED', 'AUTHORITY_LIMIT_BLOCKED',
]);
const SUPPLIER_ACTIONS = new Set([
  'DOCUMENT_UPLOAD', 'PROFILE_SUBMITTED', 'APPLICATION_SUBMITTED',
]);

function laneFor(log) {
  if (log.actionType === 'REQUEST_RESOLVED' || /^AM-/.test(log.actorId || '')) return 'supervisor';
  if (SUPPLIER_ACTIONS.has(log.actionType)) return 'supplier';
  // An agent-attributed entry stays in the agent lane even when it was refused —
  // the refusal is the agent's attempt, and hiding it would flatter the record.
  if (log.agentId || /^(AGT-|IDP-)/.test(log.actorId || '')) return 'agent';
  return 'reviewer';
}

const shortTime = (iso) => new Date(iso).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

function formatTime(isoString) {
  return new Date(isoString).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Case files — one supplier's history, forward, in authority lanes.
//
// "What happened to this vendor, in order?" is the question an auditor actually
// opens this page to answer, and the event log answered it worst: the right
// events were there, scattered through a global feed, in reverse. A case reads
// forward, because that is the direction the story happened in.
// ---------------------------------------------------------------------------
function CaseFiles({ logs, onNavigateVendor }) {
  const cases = useMemo(() => {
    const byVendor = new Map();
    for (const log of logs) {
      if (!log.vendorId || log.vendorId === '—' || log.vendorId === ' - ') continue;
      if (!byVendor.has(log.vendorId)) {
        byVendor.set(log.vendorId, { id: log.vendorId, name: log.vendorName, events: [] });
      }
      byVendor.get(log.vendorId).events.push(log);
    }
    return [...byVendor.values()]
      .map((entry) => {
        const events = [...entry.events].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
        );
        return {
          ...entry,
          events,
          refusals: events.filter((e) => REFUSALS.has(e.actionType)).length,
          humanCalls: events.filter((e) => ['reviewer', 'supervisor'].includes(laneFor(e))).length,
          agentActs: events.filter((e) => laneFor(e) === 'agent').length,
          last: events[events.length - 1],
        };
      })
      .sort((a, b) => b.events.length - a.events.length);
  }, [logs]);

  const [openId, setOpenId] = useState(null);
  const active = cases.find((c) => c.id === openId) || cases[0] || null;

  if (!cases.length) {
    return <div className="panel audit-empty"><History size={26} /><p>No vendor events recorded yet.</p></div>;
  }

  return (
    <section className="case-grid">
      <aside className="case-list">
        {cases.map((entry) => (
          <button
            key={entry.id}
            className={cx('case-row', active?.id === entry.id && 'active')}
            onClick={() => setOpenId(entry.id)}
          >
            <span className="case-row-main">
              <strong>{entry.name}</strong>
              <small>{entry.id} · {entry.events.length} events</small>
            </span>
            {entry.refusals > 0 && (
              <span className="case-refusals" title={`${entry.refusals} refused at a policy boundary`}>
                <Ban size={11} /> {entry.refusals}
              </span>
            )}
            <ChevronRight size={14} />
          </button>
        ))}
      </aside>

      {active && (
        <div className="case-file">
          <header className="case-head">
            <div>
              <span className="section-kicker">Case file</span>
              <h2>{active.name}</h2>
              <p className="case-head-note">
                {active.events.length} events · {active.agentActs} by agents · {active.humanCalls} human
                {active.refusals > 0 && <> · <b>{active.refusals} refused at a boundary</b></>}
              </p>
            </div>
            {onNavigateVendor && (
              <button className="button secondary compact" onClick={() => onNavigateVendor(active.id)}>
                Open vendor record
              </button>
            )}
          </header>

          {/* The lane key doubles as the legend and as the claim being made. */}
          <ol className="lane-key">
            {LANE_ORDER.map((id) => {
              const Icon = LANES[id].icon;
              return (
                <li key={id} className={cx('lane-key-item', id)} title={LANES[id].hint}>
                  <Icon size={12} /> {LANES[id].label}
                </li>
              );
            })}
          </ol>

          <ol className="case-timeline">
            {active.events.map((log) => {
              const lane = laneFor(log);
              const refused = REFUSALS.has(log.actionType);
              const held = log.actionType === 'AGENT_PENDING';
              const isDiff = log.originalValue && log.humanValue
                && log.originalValue !== log.humanValue;
              return (
                <li
                  key={log.id}
                  className={cx('case-event', `lane-${lane}`, refused && 'is-refused', held && 'is-held')}
                >
                  <span className="case-event-rail" aria-hidden="true"><i /></span>
                  <article className="case-event-card">
                    <header>
                      <strong>{ACTION_LABEL[log.actionType] || log.actionType}</strong>
                      <time>{shortTime(log.timestamp)}</time>
                    </header>
                    <p className="case-event-what">
                      {log.fieldLabel}{log.documentName ? ` · ${log.documentName}` : ''}
                    </p>
                    {isDiff && (
                      <p className="case-event-diff">
                        <span className="audit-strike">{log.originalValue}</span>
                        <ChevronRight size={12} />
                        <span className="audit-win">{log.humanValue}</span>
                      </p>
                    )}
                    {refused && (
                      <p className="case-event-refusal">
                        <ShieldAlert size={13} /> {log.reason}
                      </p>
                    )}
                    <footer>
                      <span>{log.actorName}</span>
                      {log.clauseRef && <em className="case-clause">{log.clauseRef}</em>}
                    </footer>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

// Screen 3 — the immutable audit log. Every accept/correct/upload/decision
// action anywhere in the app lands here automatically via NexusContext, so
// this always reflects real state rather than a hardcoded activity feed.
export default function AuditTrail({ onNavigateVendor }) {
  const { auditLogs } = useNexus();
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState('outcomes');

  const filtered = useMemo(() => auditLogs.filter((log) => {
    const haystack = `${log.vendorName} ${log.fieldLabel} ${log.reason} ${log.documentName}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (actionFilter !== 'ALL' && log.actionType !== actionFilter) return false;
    return true;
  }), [auditLogs, query, actionFilter]);

  const active = filtered.find((log) => log.id === activeId) || filtered[0] || null;

  return (
    <div className="nexus-page wide">
      <section className="page-hero">
        <div>
          <span className="eyebrow">Immutable history</span>
          <h1>Audit record</h1>
          <p>{auditLogs.length} retained events; records cannot be edited or deleted.</p>
        </div>
      </section>

      <div className="screen-tabs">
        <button className={cx(tab === 'outcomes' && 'active')} onClick={() => setTab('outcomes')}>
          <BarChart3 size={15} /> Outcomes
        </button>
        <button className={cx(tab === 'cases' && 'active')} onClick={() => setTab('cases')}>
          <GitBranch size={15} /> Case files
        </button>
        <button className={cx(tab === 'log' && 'active')} onClick={() => setTab('log')}>
          <ScrollText size={15} /> Event log <span className="tab-count">{auditLogs.length}</span>
        </button>
      </div>

      {tab === 'outcomes' && <OutcomeDashboard />}

      {tab === 'cases' && <CaseFiles logs={auditLogs} onNavigateVendor={onNavigateVendor} />}

      {tab === 'log' && (
        <>
      <section className="panel audit-toolbar">
        <label className="audit-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendor, field, or reason…" />
        </label>
        <div className="audit-filter">
          <Filter size={14} />
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="ALL">All event types</option>
            <option value="FIELD_ACCEPT">Findings accepted</option>
            <option value="FIELD_OVERRIDE">Fields corrected</option>
            <option value="DOCUMENT_UPLOAD">Documents uploaded</option>
            <option value="DOCUMENT_VERIFIED">Documents verified</option>
            <option value="DECISION">Decisions</option>
            <option value="VENDOR_INVITED">Vendors invited</option>
            <option value="AGENT_ACTION">Agent actions executed</option>
            <option value="AGENT_BLOCKED">Agent actions refused</option>
            <option value="AGENT_PENDING">Held for approval</option>
            <option value="AGENT_APPROVAL">Approval gates resolved</option>
            <option value="AGENT_CONFIG">Configuration changes</option>
            <option value="GATE_BLOCKED">Activation refusals</option>
          </select>
        </div>
      </section>

      <section className="audit-grid">
        <div className="audit-feed">
          {filtered.length === 0 && (
            <div className="panel audit-empty"><History size={26} /><p>No events match your filters.</p></div>
          )}
          {filtered.map((log) => {
            const isDiff = log.originalValue && log.humanValue && log.originalValue !== log.humanValue;
            return (
              <article
                key={log.id}
                className={cx('panel audit-entry', active?.id === log.id && 'active')}
                onClick={() => setActiveId(log.id)}
              >
                <header>
                  <div>
                    <strong>{ACTION_LABEL[log.actionType] || log.actionType}</strong>
                    <span>{log.vendorName}</span>
                  </div>
                  <time><Calendar size={12} /> {formatTime(log.timestamp)}</time>
                </header>
                {log.agentId && (
                  <div className="audit-agent-chip"><Bot size={11} /> {log.actorName}
                    {log.clauseRef && <em>{log.clauseRef}</em>}
                  </div>
                )}
                <div className="audit-entry-field">{log.fieldLabel}{log.documentName ? ` · ${log.documentName}` : ''}</div>
                {isDiff ? (
                  <div className="audit-diff">
                    <div className="audit-diff-old"><small>AI value</small><span className="audit-strike">{log.originalValue}</span></div>
                    <div className="audit-diff-new"><small>Human decision</small><span className="audit-win">{log.humanValue}</span></div>
                  </div>
                ) : (
                  <div className="audit-plain">{log.notes || log.humanValue}</div>
                )}
                <footer>
                  <span><UserCheck size={12} /> {log.actorName} ({log.actorId})</span>
                  <span className="audit-reason">{log.reason}</span>
                </footer>
              </article>
            );
          })}
        </div>

        <aside className="panel audit-detail">
          {active ? (
            <>
              <div className="audit-detail-header"><ShieldCheck size={16} /><span>Event detail</span></div>
              <dl className="audit-detail-list">
                <div><dt>Audit ID</dt><dd>{active.id}</dd></div>
                <div><dt>Timestamp</dt><dd>{active.timestamp}</dd></div>
                <div><dt>Vendor</dt><dd>{active.vendorName} ({active.vendorId})</dd></div>
                <div><dt>Actor</dt><dd>{active.actorName} — {active.actorId}</dd></div>
                <div><dt>Document</dt><dd>{active.documentName || '—'}</dd></div>
                <div><dt>Field</dt><dd>{active.fieldLabel}</dd></div>
                <div><dt>Reason</dt><dd>{active.reason}</dd></div>
                {active.clauseRef && <div><dt>Policy clause</dt><dd>{active.clauseRef}</dd></div>}
              </dl>
              {active.reasoning && (
                <div className="audit-reasoning">
                  <span><Bot size={12} /> Agent reasoning</span>
                  <p>{active.reasoning}</p>
                </div>
              )}
              <p className="audit-detail-notes">{active.notes}</p>
              {onNavigateVendor && (
                <button className="button secondary full" onClick={() => onNavigateVendor(active.vendorId)}>Open vendor record</button>
              )}
            </>
          ) : <p>Select an event to inspect it.</p>}
        </aside>
      </section>
        </>
      )}
    </div>
  );
}
