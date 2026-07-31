# StyleSphere Nexus

Open `StyleSphere-Nexus.html` to view the interactive prototype. The file is self-contained and can be shared or opened directly from Google Drive after downloading.

- `StyleSphere-Nexus.html` — final shareable app
- `Mini project/` — editable React source
- `Reference/` — original product brief and visual reference
- `StyleSphere-Nexus-AI-Strategy.md` — the Zip teardown this build was based on

## Agent platform

The app now runs on a governed agent layer modelled on Zip's Superagents.

- `src/agents/policyPack.js` — **Context**: StyleSphere policy as addressable clauses. Every finding cites one.
- `src/agents/agentCatalog.js` — **Skills / Actions / Context** per agent, plus `FORBIDDEN_ACTIONS` and the role→permission map.
- `src/agents/agentEngine.js` — pure derivation: findings, tiers, readiness, activation gates, chase timelines, triage bands, Config Agent insights, outcome metrics. Deterministic; `// MODEL SEAM` marks where a real model swaps in.

Five agents: **Intake** (pre-fill, dynamic checklist, duplicate detection), **Chaser** (multilingual, multichannel, reply-with-attachment), **Verification** (cross-document consistency, validity windows, confidence tiering), **Compliance** (cited recommendation — suggest-only), **Config** (reads the audit trail back for process defects).

Governance is structural, not instructed: `approve_vendor`, `reject_vendor`, `activate_erp`, `waive_document` and `edit_audit_log` appear in no agent's allowlist; agents inherit the record owner's permissions; ERP activation is a deterministic boolean gate no agent can reach. Every agent action, refusal and approval is written to the audit trail with its reasoning and clause reference.

## Operations (what you can actually do)

Every control performs a state change, not just a log line:

- **Run agents** (per supplier, or across all open) — re-reads the pack, corroborates registrations, opens chase threads, and queues the Compliance Agent's recommendation for human release.
- **Resolve a finding** — accept, dismiss as a false positive, or record as settled off-platform. A reason is required and goes to the audit trail; resolutions are reversible via *Reopen*. This is what lets cross-document conflicts, duplicates and threshold breaches be cleared at all — none of them has a field to "accept".
- **Chase now / Pause chasing** — advances or halts the real escalation ladder.
- **Simulate supplier reply** — ingests an attachment, verifies the document, closes the request.
- **Approve → Activate in ERP** — the final step of the primary flow, gated deterministically on verified documents plus a recorded human approval.
- **Submit a Config Agent proposal** — queues as an approval-required action; the agent cannot change its own configuration.

## Review Workspace structure

Screen 2 is a linear master–detail spine, read once, top to bottom then left to right:

1. **Identity** — who this supplier is, one compact row.
2. **Stepper** — where they are in the brief's primary flow: evidence collected → findings cleared → recommendation recorded → active in ERP.
3. **Verdict** — the Compliance Agent's recommendation and **one** primary action. Reject / escalate / re-request live in an overflow menu; they are real but rare, and giving five decisions equal weight made none of them read as the expected path.
4. **Queue** (left) — everything needing a decision, in priority order: blocking (numbered) → worth a glance → being chased → full pack → cleared. Reading order *is* work order.
5. **Detail** (right) — one item at a time, always in the same sequence: what the agent found → why it matters (the clause, inline) → the evidence → what it suggests → your decision, pinned to the bottom.

Design notes worth keeping: the chat is a drawer, not a column (it was what pushed the page past the viewport); every grid track is `minmax(0, …)` so nothing can force horizontal scroll; and field actions in the extracted-data panel reveal only on the active field — six equal-weight primary buttons meant the 99%-confidence rows shouted as loudly as the 55% one, which defeats the point of confidence tiering.

## Tests

    node scripts/gates.test.mjs              # 37 engine/governance assertions
    node scripts/gates-operations.test.mjs   # 11 assertions on resolutions + chase state
    node scripts/smoke-agents.mjs            # 45 DOM assertions against the built bundle
    node scripts/layout.test.mjs             # 27 structure/hierarchy/overflow assertions
    node scripts/flow.test.mjs               # 21 assertions walking the full primary flow

`flow.test.mjs` is the important one: it drives review → resolve → chase → approve → activate entirely by clicking, so any control that stops doing something fails the build.

Both need the bundle built first. Note the sandbox build trap documented in the project notes: `pnpm build:share` works locally but the rolldown native binary bus-errors in a Linux container — bundle with esbuild there instead.
