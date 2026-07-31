# StyleSphere Nexus — content strategy

## The problem being fixed

The product was writing headlines at people who had already decided to use it.
"Procure without the spreadsheet chase." "Compliance you can explain." "Your
onboarding, without the guesswork." That is landing-page voice, and on an
internal tool it costs twice: it takes up the space where the page should say
what it is, and it makes the reader translate before they can act.

A compliance reviewer opening a queue at 9am does not need to be sold the queue.

## Universal rules

| Element | Rule |
|---|---|
| **H1** | The page's noun. 1–3 words. No full stop. No metaphor. |
| **Subhead** | One sentence, ≤ 12 words. Only if it states a rule, scope or constraint the reader cannot infer. Otherwise **delete it**. |
| **Eyebrow** | A live count or status. Numbers, not adjectives. |
| **Buttons** | Task actions use verb + object. Utilities use standard labels such as "Close" or "Cancel". |
| **Empty states** | What is missing, then the action that fills it. |
| **Never** | Explain the product to the person already using it. |

The subhead rule does most of the work. Most subheads described the page; a
description of a page the reader is already looking at is the definition of
words that earn nothing.

## By persona

**Reviewer (Priya Nair, Compliance Manager)** — task-first, imperative, assumes
expertise. She knows what a REACH certificate is; do not gloss it. Copy states
thresholds and rules because those are the things she cannot see for herself.

**Supervisor (Arun Mehta, Head of Compliance)** — decision-first. Every screen
answers "what is mine to decide, and what happens when I do". Consequence and
authority are stated plainly, because his decisions carry his name.

**Supplier (external)** — the only non-expert, and the only one who gets extra
words. Plain language, no internal jargon, no acronyms without expansion.
Always answers: what do you need, by when, and what happens next. Anxiety is
the enemy — an exporter in Guangzhou reading a rejection needs the fix, not the
policy.

## By page category

| Category | H1 | Subhead |
|---|---|---|
| **Dashboard** (Command center, Oversight, My workspace) | The role's noun — "Overview", "Oversight" | Only the one count that changes behaviour |
| **Queue / list** (Vendor queue, Requests, Documents) | The collection — "Requests" | The sort rule, because sort order is a real, invisible rule |
| **Workspace / detail** (Review workspace, Case file) | **No hero.** The subject's identity is the header | — |
| **System** (Agent console, Audit record) | The system's name | Its one hard constraint |
| **Form / wizard** | The step's ask, as an instruction — "Upload your evidence pack" | What happens on submit |

## Applied changes

| Before | After |
|---|---|
| "Vendor operations overview." | "Overview" |
| "What is waiting on you, and what your team is carrying." | "Oversight" |
| "Everything that is blocked pending you." | "Requests" |
| "Compliance you can explain." | "Compliance" |
| "Your onboarding, without the guesswork." | "Your application" |
| "What your customer needs." | "Action center" |
| "Your reusable document vault." | "Your documents" |
| "Every agent action and human decision." | "Audit record" |
| "Your workflows, your rules, your agents." | "Agent console" |
| "Where humans keep correcting the machine" | "Repeated corrections" |
| "What the audit trail says about the process" | "Process insights" |
| "Check everything, then hand it over" | "Review and submit" |
| "Every supplier, unbanded" | "All suppliers" |

Subheads deleted outright where they only restated the H1. Where a subhead
survived, it carries a rule — e.g. the supervisor queue keeps "Ordered by time
past SLA" because sort order is genuinely invisible, and drops the sentence
explaining that reviewers work the queue.

## UX laws applied to structure

- **Jakob's** — master–detail everywhere it fits, because every reviewer already
  runs an inbox. No novel navigation.
- **Hick's** — admin nav 8 → 6, supplier 6 → 4. Fewer choices, faster choosing.
- **Miller's** — no group exceeds seven items before it chunks.
- **Von Restorff** — exactly one emphatic element per context. The verdict band
  is the only thing on Screen 2 allowed to shout.
- **Fitts's** — primary actions are the largest targets and sit closest to the
  content they act on.
- **Proximity / common region** — spacing does the grouping; borders only where
  a region genuinely changes owner.
- **Doherty threshold** — every action acknowledges inside 400ms; simulated
  verification shows a processing state rather than freezing.
- **Serial position** — first and last nav slots hold the most-used destinations.
- **Prägnanz** — one card recipe, two elevations, four severity colours.

## Page-level content plan

| Persona | Page | Primary question | Content priority | Main action |
|---|---|---|---|---|
| Reviewer | Overview | What needs the team now? | Decisions, active work, recent changes | Create request |
| Reviewer | Vendor queue | Which supplier needs a human first? | Human-action band, SLA, owner | Open vendor |
| Reviewer | Document collection | Where is each application blocked? | Stage, blocker, next action | Invite vendor |
| Reviewer | Compliance | Where is portfolio coverage weak? | Coverage, exceptions, expiring evidence | Export report |
| Reviewer | Review workspace | Can I approve this supplier? | Verdict, blockers, evidence, decision | Approve vendor |
| Reviewer | Agent console | What may each agent do? | Scope, actions, approval gates | Review proposal |
| Reviewer | Audit record | Who changed what, and why? | Retained event, actor, evidence, rationale | Open vendor |
| Supervisor | Oversight | What requires my authority? | Requests, exceptions, SLA exposure | Open requests |
| Supervisor | Requests | Which decision is most overdue? | SLA order, evidence, consequence | Record decision |
| Supervisor | All vendors | Where is team risk concentrated? | Read-only queue, owner, SLA | Open case |
| Supervisor | Agent policy | What authority do agents have? | Approval gates, proposals, history | Approve change |
| Supplier | Start application | What must I provide? | Company details, required files, next step | Start application |
| Supplier | My workspace | Do I need to act? | Current status, one next action, review progress | Open action center |
| Supplier | Onboarding | What was submitted and what happens next? | Application stage, requested changes | Upload correction |
| Supplier | Action center | What is due, and by when? | Request, reason, due date, file requirement | Upload file |
| Supplier | Documents | Which files are accepted or need replacement? | File, status, requested correction | Upload document |

## Content budgets

| Element | Maximum |
|---|---|
| Page title | 3 words |
| Page description | 12 words |
| Section title | 5 words |
| Card explanation | 18 words |
| Button | 4 words |
| Empty state | 2 short sentences |

Operational terms stay consistent: **vendor**, **document**, **finding**,
**request**, **approval**, and **audit record**. Marketing synonyms and casual
phrases are not used inside the product.
