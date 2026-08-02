import { useState } from 'react';
import { useNexus } from '../context/AppContext';
import {
  AGENT_CATALOG, AGENTS_BY_ID, AUTONOMY, FORBIDDEN_ACTIONS, ROLE_PERMISSIONS,
} from '../agents/agentCatalog';
import { POLICY_CLAUSES } from '../agents/policyPack';
import { configInsights } from '../agents/agentEngine';
import {
  Bot, Ban, History, ShieldCheck, Lock, RotateCcw, ScrollText, Zap, Wrench,
  MessageCircle, Mail, Monitor, TrendingUp, Check, Send,
} from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');

const CHANNEL_ICON = { whatsapp: MessageCircle, email: Mail, portal: Monitor };
const RISK_TONE = { low: 'green', medium: 'amber', high: 'red' };

// ---------------------------------------------------------------------------
// The Agent Console - Skills, Actions, Context, and the governance around them.
//
// This is the surface that makes the agents a platform rather than a feature.
// Three things it deliberately does:
//
//   1. Renders FORBIDDEN_ACTIONS explicitly. An auditor should be able to see
//      that "approve a supplier" is withheld structurally, not merely absent.
//      The constraint is in the allowlist, not in a prompt.
//   2. Shows the permission inheritance. An agent runs as the record owner, so
//      it cannot exceed that person's scope - a much stronger guarantee than
//      instructing a model to behave.
//   3. Versions every edit with a revert. Configuration nobody dares touch is
//      configuration that rots; a visible undo is what makes it editable.
// ---------------------------------------------------------------------------
export default function AgentConsole({ persona = 'admin' }) {
  const {
    agentConfig, configHistory, updateAgentConfig, revertAgentConfig,
    pendingApprovals, approvalHistory, resolveApproval, actorRole, setActorRole,
    auditLogs, vendors, dispatchAgentAction,
  } = useNexus();
  const [activeId, setActiveId] = useState(AGENT_CATALOG[0].id);
  const [tab, setTab] = useState('skills');
  const [dismissed, setDismissed] = useState([]);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');

  const definition = AGENTS_BY_ID[activeId];
  const entry = agentConfig.agents.find((a) => a.id === activeId);
  const insights = configInsights(auditLogs, vendors);
  const isSupervisor = persona === 'supervisor';
  const actionLabel = (item) => item.agentId === 'compliance' ? 'Approve recommendation' : 'Accept proposal';
  const completeDecision = () => {
    if (!decisionTarget) return;
    resolveApproval(decisionTarget.id, decisionTarget.outcome, decisionNote);
    setDecisionTarget(null);
    setDecisionNote('');
  };

  const mutateAgent = (fn, note) => updateAgentConfig((draft) => {
    const target = draft.agents.find((a) => a.id === activeId);
    fn(target);
    return draft;
  }, note);

  return (
    <div className="nexus-page wide">
      <section className="page-hero">
        <div>
          <span className="eyebrow">Agent platform · configuration v{agentConfig.version}</span>
          <h1>{isSupervisor ? 'Agent policy' : 'Agent console'}</h1>
          <p>{isSupervisor ? 'Approve changes and control agent authority.' : 'Configure agent scope, actions, and approval gates.'}</p>
        </div>
      </section>

      {/* --- governance strip ------------------------------------------- */}
      <section className="governance-strip">
        <article className="panel governance-card">
          <span className="metric-icon red"><Ban size={17} /></span>
          <div>
            <small>Withheld from every agent</small>
            <strong>{FORBIDDEN_ACTIONS.length} actions</strong>
            <em>Structural, not instructed</em>
          </div>
        </article>
        <article className="panel governance-card">
          <span className="metric-icon blue"><ShieldCheck size={17} /></span>
          <div>
            <small>Agents run as</small>
            <select className="role-select" value={actorRole} onChange={(e) => setActorRole(e.target.value)}>
              {Object.keys(ROLE_PERMISSIONS).map((role) => <option key={role}>{role}</option>)}
            </select>
            <em>{ROLE_PERMISSIONS[actorRole].join(' · ')}</em>
          </div>
        </article>
        <article className="panel governance-card">
          <span className="metric-icon amber"><Lock size={17} /></span>
          <div>
            <small>Held for human approval</small>
            <strong>{pendingApprovals.length}</strong>
            <em>Human-in-the-loop gate</em>
          </div>
        </article>
        <article className="panel governance-card">
          <span className="metric-icon violet"><History size={17} /></span>
          <div>
            <small>Configuration versions</small>
            <strong>v{agentConfig.version}</strong>
            <em>{configHistory.length} retained &amp; revertable</em>
          </div>
        </article>
      </section>

      {/* --- forbidden actions ------------------------------------------ */}
      <section className="panel forbidden-panel">
        <div className="forbidden-head">
          <span className="metric-icon red"><Ban size={16} /></span>
          <div>
            <strong>Actions withheld from every agent</strong>
            <small>These capabilities are excluded from every allowlist.</small>
          </div>
        </div>
        <div className="forbidden-list">
          {FORBIDDEN_ACTIONS.map(([id, label, clauseId]) => (
            <span key={id} className="forbidden-chip">
              <Ban size={12} /> {label}
              <em>{clauseId}</em>
            </span>
          ))}
        </div>
      </section>

      {/* --- pending approvals ------------------------------------------ */}
      <section className="panel approvals-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Human-in-the-loop</span><h2>Waiting on you</h2></div>
        </div>
        {pendingApprovals.length === 0 && <p className="attention-empty">No proposals are awaiting review.</p>}
        {pendingApprovals.map((item) => (
          <article className="approval-row" key={item.id}>
            <span className={cx('risk-dot', RISK_TONE[item.risk])} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.agentName || AGENTS_BY_ID[item.agentId]?.name} · {item.vendorName || 'Platform'} · {new Date(item.requestedAt).toLocaleString('en-GB')}</small>
              <p>{item.reasoning}</p>
              {item.clauseId && <span className="clause-id">{item.clauseId}</span>}
            </div>
            <div className="approval-actions">
              <button className="button success compact" onClick={() => setDecisionTarget({ id: item.id, outcome: 'accept', label: actionLabel(item) })}>{actionLabel(item)}</button>
              <button className="button secondary compact" onClick={() => setDecisionTarget({ id: item.id, outcome: 'decline', label: 'Decline proposal' })}>Decline</button>
            </div>
          </article>
        ))}
        {decisionTarget && (
          <div className="proposal-decision-editor">
            <label>
              <span>{decisionTarget.outcome === 'decline' ? 'Reason for declining (optional)' : 'Decision note (optional)'}</span>
              <textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Add context for the retained decision record." />
            </label>
            <div>
              <button className="button secondary compact" onClick={() => { setDecisionTarget(null); setDecisionNote(''); }}>Cancel</button>
              <button className={cx('button compact', decisionTarget.outcome === 'decline' ? 'danger' : 'success')} onClick={completeDecision}>{decisionTarget.label}</button>
            </div>
          </div>
        )}
      </section>

      <section className="panel approvals-panel proposal-history-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Decision record</span><h2>Proposal history</h2></div>
        </div>
        {approvalHistory.length === 0 && <p className="attention-empty">Decisions appear here after a proposal is accepted or declined.</p>}
        {approvalHistory.map((item) => (
          <article className="approval-row history" key={item.id}>
            <span className={cx('status-pill', item.status === 'accepted' ? 'green' : 'red')}>{item.status}</span>
            <div>
              <strong>{item.summary}</strong>
              <small>{item.agentName || AGENTS_BY_ID[item.agentId]?.name} · {item.vendorName || 'Platform'} · {item.decision?.decidedBy} · {new Date(item.decision?.decidedAt || item.requestedAt).toLocaleString('en-GB')}</small>
              <p>{item.decision?.note || (item.status === 'accepted' ? 'Accepted without an additional note.' : 'Declined without an additional reason.')}</p>
              <small>{item.reasoning}{item.clauseId ? ` · ${item.clauseId}` : ''}</small>
            </div>
          </article>
        ))}
      </section>
      {/* --- the agents -------------------------------------------------- */}
      <section className="agent-layout">
        <aside className="agent-rail">
          {AGENT_CATALOG.map((agent) => {
            const cfg = agentConfig.agents.find((a) => a.id === agent.id);
            return (
              <button
                key={agent.id}
                className={cx('agent-rail-item', activeId === agent.id && 'active', !cfg?.enabled && 'off')}
                onClick={() => setActiveId(agent.id)}
              >
                <span className={cx('agent-glyph', agent.tone)}>{agent.glyph}</span>
                <span>
                  <strong>{agent.name}</strong>
                  <small>{cfg?.enabled ? AUTONOMY[cfg.autonomy].label : 'Switched off'}</small>
                </span>
              </button>
            );
          })}
        </aside>

        <div className="agent-detail panel">
          <header className="agent-detail-head">
            <span className={cx('agent-glyph', 'large', definition.tone)}>{definition.glyph}</span>
            <div>
              <h2>{definition.name}</h2>
              <p>{definition.purpose}</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={entry.enabled}
                onChange={() => mutateAgent((a) => { a.enabled = !a.enabled; }, `${definition.name} ${entry.enabled ? 'switched off' : 'switched on'}.`)}
              />
              <span />
            </label>
          </header>

          <div className="agent-autonomy">
            {Object.values(AUTONOMY).map((mode) => (
              <button
                key={mode.id}
                className={cx('autonomy-option', entry.autonomy === mode.id && 'active')}
                onClick={() => mutateAgent((a) => { a.autonomy = mode.id; }, `Autonomy updated. The new setting applies to future agent actions.`)}
              >
                <strong>{mode.label}</strong>
                <small>{mode.detail}</small>
              </button>
            ))}
          </div>

          <div className="agent-channels">
            <span>Channels</span>
            {definition.channels.map((ch) => {
              const Icon = CHANNEL_ICON[ch] || Monitor;
              const on = entry.channels.includes(ch);
              return (
                <button
                  key={ch}
                  className={cx('channel-chip', on && 'on')}
                  onClick={() => mutateAgent((a) => {
                    a.channels = on ? a.channels.filter((c) => c !== ch) : [...a.channels, ch];
                  }, `${definition.name} ${on ? 'stopped using' : 'now uses'} ${ch}.`)}
                >
                  <Icon size={12} /> {ch}{on && <Check size={11} />}
                </button>
              );
            })}
          </div>

          <div className="agent-tabs">
            {[['skills', 'Skills', Wrench], ['actions', 'Actions', Zap], ['context', 'Context', ScrollText]].map(([id, label, Icon]) => (
              <button key={id} className={cx(tab === id && 'active')} onClick={() => setTab(id)}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {tab === 'skills' && (
            <div className="agent-list">
              <p className="agent-list-blurb">Instructions this agent follows. Changes apply immediately.</p>
              {definition.skills.map((s) => {
                const on = entry.skills.find((x) => x.id === s.id)?.enabled;
                return (
                  <article key={s.id} className={cx('config-row', !on && 'off')}>
                    <label className="switch small">
                      <input
                        type="checkbox" checked={on}
                        onChange={() => mutateAgent((a) => {
                          const target = a.skills.find((x) => x.id === s.id);
                          target.enabled = !target.enabled;
                        }, `Skill "${s.name}" ${on ? 'disabled' : 'enabled'} on ${definition.name}.`)}
                      />
                      <span />
                    </label>
                    <div><strong>{s.name}</strong><p>{s.instruction}</p></div>
                  </article>
                );
              })}
            </div>
          )}

          {tab === 'actions' && (
            <div className="agent-list">
              <p className="agent-list-blurb">Allowed actions and their approval requirements.</p>
              {definition.actions.map((act) => {
                const cfg = entry.actions.find((x) => x.id === act.id);
                return (
                  <article key={act.id} className={cx('config-row', 'action-row', !cfg.enabled && 'off')}>
                    <label className="switch small">
                      <input
                        type="checkbox" checked={cfg.enabled}
                        onChange={() => mutateAgent((a) => {
                          const target = a.actions.find((x) => x.id === act.id);
                          target.enabled = !target.enabled;
                        }, `Action "${act.label}" ${cfg.enabled ? 'revoked from' : 'granted to'} ${definition.name}.`)}
                      />
                      <span />
                    </label>
                    <div>
                      <strong>{act.label}</strong>
                      <code>{act.id}</code>
                    </div>
                    <span className={cx('risk-chip', RISK_TONE[act.risk])}>{act.risk} risk</span>
                    <button
                      className={cx('gate-toggle', cfg.requiresApproval && 'on')}
                      onClick={() => mutateAgent((a) => {
                        const target = a.actions.find((x) => x.id === act.id);
                        target.requiresApproval = !target.requiresApproval;
                      }, `"${act.label}" ${cfg.requiresApproval ? 'no longer requires' : 'now requires'} human approval.`)}
                    >
                      <Lock size={11} /> {cfg.requiresApproval ? 'Approval required' : 'Autonomous'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {tab === 'context' && (
            <div className="agent-list">
              <p className="agent-list-blurb">Read-only policy clauses available as evidence.</p>
              {definition.context.map((id) => {
                const clause = POLICY_CLAUSES[id];
                if (!clause) return null;
                return (
                  <article key={id} className="config-row clause-row">
                    <span className="clause-id">{clause.id}</span>
                    <div>
                      <strong>{clause.title}</strong>
                      <p>{clause.requirement}</p>
                      <small>{clause.source}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* --- Config Agent insights -------------------------------------- */}
      <section className="panel insights-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Config Agent</span>
            <h2>Process insights</h2>
          </div>
        </div>
        <p className="insights-blurb">Patterns found across extraction, cycle time, and reviewer decisions.</p>
        {insights.filter((i) => !dismissed.includes(i.id)).length === 0 && (
          <p className="attention-empty">More decisions are needed before patterns can be identified.</p>
        )}
        {insights.filter((i) => !dismissed.includes(i.id)).map((insight) => (
          <article key={insight.id} className={cx('insight-row', insight.severity)}>
            <span className="metric-icon violet"><TrendingUp size={15} /></span>
            <div>
              <strong>{insight.title}</strong>
              <p>{insight.detail}</p>
              <div className="insight-proposal"><Bot size={12} /> {insight.proposal}</div>
              {/* `propose_config` is high-risk and approval-required, so
                  submitting it queues for a human rather than applying. The
                  Config Agent cannot change its own configuration. */}
              <div className="insight-actions">
                <button
                  className="button secondary compact"
                  onClick={() => dispatchAgentAction('config', 'propose_config', {
                    vendorId: '-',
                    summary: insight.proposal,
                    reasoning: `${insight.title}. ${insight.detail}`,
                    configChange: {
                      type: 'workflow-guidance',
                      insightId: insight.id,
                      description: insight.proposal,
                    },
                  })}
                >
                  <Send size={12} /> Submit for approval
                </button>
                <button className="button ghost compact" onClick={() => setDismissed((d) => [...d, insight.id])}>
                  Dismiss
                </button>
              </div>
            </div>
            <span className="insight-metric">{insight.metric}</span>
          </article>
        ))}
      </section>

      {/* --- version history --------------------------------------------- */}
      <section className="panel version-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Change control</span><h2>Configuration history</h2></div>
        </div>
        <article className="version-row current">
          <span className="version-tag">v{agentConfig.version}</span>
          <div><strong>{agentConfig.note}</strong><small>{agentConfig.updatedBy} · {new Date(agentConfig.updatedAt).toLocaleString('en-GB')}</small></div>
          <span className="version-current">Live</span>
        </article>
        {configHistory.length === 0 && <p className="attention-empty">No previous versions. Change a skill or action to create one.</p>}
        {configHistory.map((version) => (
          <article className="version-row" key={`${version.version}-${version.retiredAt}`}>
            <span className="version-tag">v{version.version}</span>
            <div><strong>{version.note}</strong><small>{version.updatedBy} · retired {new Date(version.retiredAt).toLocaleString('en-GB')}</small></div>
            <button className="button secondary compact" onClick={() => revertAgentConfig(version.version)}>
              <RotateCcw size={13} /> Revert to this
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
