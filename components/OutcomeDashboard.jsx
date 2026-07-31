import { useMemo } from 'react';
import { useNexus } from '../context/NexusContext';
import { outcomeMetrics, configInsights } from '../services/agentEngine';
import { AGENTS_BY_ID } from '../services/agentCatalog';
import {
  Timer, Gauge, ShieldCheck, TrendingUp, Bot, Globe2,
} from 'lucide-react';

const cx = (...v) => v.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Screen 3, upper half — outcomes.
//
// The brief sets exactly one success metric: reduce average vendor onboarding
// from 7 days to 2. Zip puts "55% faster purchasing cycles" and a 386% ROI
// figure on its homepage, and those numbers came from product telemetry.
//
// So this instruments the claim inside the product. The stage breakdown makes
// the argument the strategy rests on visible: almost all of the saving is in
// document collection and the wait before submission, not in the review itself.
// ---------------------------------------------------------------------------
export default function OutcomeDashboard() {
  const { vendors, auditLogs, agentConfig } = useNexus();
  const m = useMemo(() => outcomeMetrics(vendors, auditLogs), [vendors, auditLogs]);
  const insights = useMemo(() => configInsights(auditLogs, vendors), [auditLogs, vendors]);

  const maxStage = Math.max(...m.stages.map((s) => s.before));

  // Override clusters by field — the raw material behind the Config Agent's
  // proposals, shown here so the dashboard explains itself.
  const overrideClusters = useMemo(() => {
    const map = {};
    for (const log of auditLogs.filter((l) => l.actionType === 'FIELD_OVERRIDE')) {
      const key = log.fieldLabel || 'Unlabelled';
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [auditLogs]);

  const byCountry = useMemo(() => {
    const map = {};
    for (const v of vendors) {
      if (!v.country || v.country === 'Not yet provided') continue;
      map[v.country] = map[v.country] || { open: 0, vendors: 0 };
      map[v.country].open += v.missingCount;
      map[v.country].vendors += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].open - a[1].open);
  }, [vendors]);

  const maxOpen = Math.max(1, ...byCountry.map(([, d]) => d.open));

  return (
    <>
      <section className="outcome-headline panel">
        <div className="outcome-headline-main">
          <span className="section-kicker">Success metric from the stakeholder brief</span>
          <h2>
            <b>{m.currentDays}</b> days<span>average onboarding</span>
          </h2>
          <p>
            Down from a {m.baselineDays}-day baseline — a <strong>{m.reductionPct}% reduction</strong>, measured from
            this workspace&rsquo;s own event log rather than asserted. Target was 2 days.
          </p>
          <div className={cx('outcome-verdict', m.currentDays <= 2 ? 'good' : 'warn')}>
            <ShieldCheck size={14} />
            {m.currentDays <= 2 ? 'Target met' : 'Above target'}
          </div>
        </div>
        <div className="outcome-stages">
          {m.stages.map((s) => (
            <div className="outcome-stage" key={s.label}>
              <span className="outcome-stage-label">{s.label}</span>
              <div className="outcome-bars">
                <div className="outcome-bar before" style={{ width: `${(s.before / maxStage) * 100}%` }}>
                  <em>{s.before}d</em>
                </div>
                <div className="outcome-bar after" style={{ width: `${Math.max(4, (s.now / maxStage) * 100)}%` }}>
                  <em>{s.now}d</em>
                </div>
              </div>
              <span className="outcome-saved">−{s.saved}d</span>
            </div>
          ))}
          <p className="outcome-legend">
            <i className="legend before" /> Before agents &nbsp;·&nbsp; <i className="legend after" /> Now.
            The saving is overwhelmingly in collection, not review — which is the whole argument for the Chaser Agent.
          </p>
        </div>
      </section>

      <section className="outcome-metrics">
        {[
          [Timer, 'blue', `${m.reductionPct}%`, 'Cycle-time reduction', `${m.baselineDays}d → ${m.currentDays}d`],
          [Gauge, 'violet', m.agreementRate == null ? '—' : `${m.agreementRate}%`, 'Agent–human agreement', `${m.accepts} accepted · ${m.overrides} corrected`],
          [ShieldCheck, 'green', String(m.decisionsLogged), 'Human decisions recorded', 'Every one with a stated reason'],
          [Bot, 'amber', `v${agentConfig.version}`, 'Agent configuration', `${agentConfig.agents.filter((a) => a.enabled).length} of ${agentConfig.agents.length} agents live`],
        ].map(([Icon, tone, value, label, note]) => (
          <article className="panel metric-card" key={label}>
            <span className={cx('metric-icon', tone)}><Icon size={18} /></span>
            <span><small>{label}</small><strong>{value}</strong><em>{note}</em></span>
          </article>
        ))}
      </section>

      <section className="outcome-grid">
        <article className="panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Extraction quality</span><h2>Repeated corrections</h2></div>
          </div>
          <p className="outcome-note">
            A field corrected once is a reviewer&rsquo;s judgement. The same field corrected repeatedly is an
            extraction defect — and this is the only place it becomes visible.
          </p>
          {overrideClusters.length === 0 && <p className="attention-empty">No corrections logged yet.</p>}
          {overrideClusters.map(([field, count]) => (
            <div className="cluster-row" key={field}>
              <span>{field}</span>
              <div className="cluster-bar"><i style={{ width: `${(count / overrideClusters[0][1]) * 100}%` }} /></div>
              <strong>{count}</strong>
            </div>
          ))}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Time to document</span><h2>Outstanding evidence by market</h2></div>
          </div>
          <p className="outcome-note">
            A market that lags is usually a translation or template problem, not an uncooperative supplier.
          </p>
          {byCountry.length === 0 && <p className="attention-empty">Nothing outstanding anywhere.</p>}
          {byCountry.map(([country, d]) => (
            <div className="cluster-row" key={country}>
              <span><Globe2 size={12} /> {country}</span>
              <div className="cluster-bar"><i className={d.open ? 'hot' : ''} style={{ width: `${(d.open / maxOpen) * 100}%` }} /></div>
              <strong>{d.open}</strong>
            </div>
          ))}
        </article>
      </section>

      {insights.length > 0 && (
        <section className="panel insights-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Config Agent</span><h2>Proposed process changes</h2></div>
          </div>
          {insights.map((insight) => (
            <article key={insight.id} className={cx('insight-row', insight.severity)}>
              <span className="metric-icon violet"><TrendingUp size={15} /></span>
              <div>
                <strong>{insight.title}</strong>
                <p>{insight.detail}</p>
                <div className="insight-proposal">
                  <Bot size={12} /> {insight.proposal}
                  <em>Proposal only — {AGENTS_BY_ID[insight.agentId]?.name} cannot change its own configuration.</em>
                </div>
              </div>
              <span className="insight-metric">{insight.metric}</span>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
