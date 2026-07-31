# Reviewer–Supervisor–Vendor integration — audit checkpoint

**Status: AUDIT ONLY. No code was changed. No tests were run. No rebuild was done.**
`StyleSphere-Nexus-fixed.html` is untouched and remains the source of truth.

Session ended on a usage limit part-way through task 1 of 5.

## What was read (in full)

- `Mini project/src/context/AppContext.jsx` (1,797 lines)
- `Mini project/src/agents/agentEngine.js` (759)
- `Mini project/src/components/ReviewWorkspace.jsx` (658)
- `Mini project/src/data/mockData.js` — `CURRENT_USERS`, `REQUEST_TYPES`, `REQUEST_OUTCOMES`

**Not yet read:** `RedesignedApp.jsx` (2,512 lines — vendor portal pages, supervisor
escalations page, notifications, `ROLE_PAGES`), `OnboardingWizard.jsx`, `VendorChat.jsx`,
`ChaserPanel.jsx`, `FindingDetail.jsx`, `agentCatalog.js`, `policyPack.js`.
Any gap list below is provisional until those are read.

## Build provenance — confirmed

`StyleSphere-Nexus-fixed.html` (1,107,076 bytes) embeds, verbatim:
- `Mini project/dist/assets/index-BU8P_5XP.js` (951,980 chars)
- `Mini project/dist/assets/index-Q0P99wAf.css` (152,662 chars)

Neither is present in the older `StyleSphere-Nexus.html`, so the JSX sources in
`Mini project/src/` are the correct edit surface for regenerating the fixed build.
Rebuild route from the Cowork sandbox (esbuild is dead — see memory
`stylesphere_sandbox_build`): copy project to `/tmp`, install `sucrase`, run
`scripts/sandbox/slim-lucide.mjs <root>` then `scripts/sandbox/minibundler.mjs <root>`,
write `dist/index.html` pointing at `/assets/index.js` + `/assets/index.css`, then
`scripts/build-standalone.mjs`.

## Requirements already implemented — preserve, validate, do NOT rebuild

| Requirement | Where it lives |
|---|---|
| Reviewer→Vendor document requests | `submitDecision(id,'REQUEST_DOCS')` — sets `chaseState[docId].requested`, flags the doc with a `rejection`, writes a `DOCUMENT_REQUESTED` audit entry |
| Vendor upload → verification → back to reviewer | `uploadDocument` → `runDocumentReview` (1500 ms hold in `Processing`) → `Verified`/`Flagged`, closes the chase thread, writes `DOCUMENT_VERIFIED`/`DOCUMENT_REJECTED` |
| Reviewer authority limit | `APPROVAL_CEILING = 70` in `ReviewWorkspace.jsx`; `aboveAuthority` swaps the primary action to "Send for approval" → `raiseRequest('AUTHORITY')` |
| Reviewer→Supervisor escalation | `submitDecision(id,'ESCALATE')` → `finalStatus='Escalated'` + `raiseRequest('ESCALATION')` |
| Supervisor approve / reject / return | `resolveRequest(id, 'UPHOLD'\|'REJECT'\|'RETURN')`; `RETURN` clears `finalStatus`, writes `vendor.supervisorNote`, surfaces as the `.rw-returned` banner until `acknowledgeSupervisorNote` |
| Approved vs Active/ERP separated | `finalStatus` `'Approved'` vs `'Active'` + `erpId`; `activationGate()` is plain boolean logic no agent can reach; `activateInErp` |
| Duplicate-request prevention | `raiseRequest` drops any existing open request of the same vendor+type; `decisionIsAway` / `noticeRequest` suppress re-raising in the UI |
| Shared record across personas | one `rawVendors` array + `activeVendorId` + `deriveVendorView`; both faces read the same record |
| Supervisor cannot waive evidence | `getApprovalBlockers` is re-checked inside `resolveRequest` on `UPHOLD` |

## Gaps found so far — the actual work

**A. Risk acceptance does not resolve the related exception.** This is the clearest
miss against the prompt. `RaiseRequestDialog` puts the blocker into
`detail.control` as a *display string* (`` `${blocker.clauseId} — ${blocker.title}` ``)
and never carries `blocker.id`. On `GRANT`, `resolveRequest` writes
`vendor.riskAcceptance` but never writes into `findingResolutions`, and
`evaluateVendor` has no awareness of `riskAcceptance` at all — so the blocking
finding stays open and still blocks approval. Fix: carry `findingId` through
`detail`, have `GRANT` write a `findingResolutions[findingId]` entry
(outcome `risk_accepted`, carrying `expiresAt`), and make the existing derived
`exceptions` lapse logic re-open that one finding when the date passes. It must
resolve *only* that finding — never touch `finalStatus`.

**B. The authority ceiling is UI-only.** `APPROVAL_CEILING` lives in
`ReviewWorkspace.jsx` and is enforced only by which button renders. `submitDecision`
itself will happily record `APPROVE` on a vendor above the ceiling (the Ctrl+Enter
handler, and any other caller, bypass the check). It should be structural in the
context alongside `getApprovalBlockers`, the way `activationGate` is.

**C. `AUTHORITY` does not move case ownership.** Only `ESCALATE` sets
`finalStatus='Escalated'`. A vendor sent up on the authority route still reads as
reviewer-owned everywhere outside the Review Workspace (queue, directory,
pipeline), because only `ReviewWorkspace` knows about `decisionIsAway`. Ownership
needs to be derived from the open supervisor request, not from `finalStatus` alone.

**D. Duplicate-action prevention on decisions.** `submitDecision` does not refuse a
second `APPROVE` on an already-Approved vendor, and `REQUEST_DOCS` can re-fire on a
document that already has an open request.

**E. Unverified.** Whether the vendor persona surfaces reviewer-raised requests as a
task, and whether the supervisor escalations page reflects all of the above —
both live in the unread `RedesignedApp.jsx`.

## Test suites that must stay green

`scripts/flow.test.mjs` (21) is the one that matters — it drives review → resolve →
chase → approve → activate entirely by clicking. Plus `layout.test.mjs` (27),
`gates.test.mjs` (37), `gates-operations.test.mjs` (11), `smoke-agents.mjs` (45),
and `scripts/tests/` (smoke 48, volume 34, modals 21, regress 16, onboarding 26).
Note: `smoke.mjs`'s `dialogButton()` page-wide search for "Confirm" also matches a
closed-request row whose rationale contains "confirmed".
