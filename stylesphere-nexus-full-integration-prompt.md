# StyleSphere Nexus — Full Backend ↔ Frontend Integration

Paste this to Antigravity as-is.

Scope lock: **work only inside `/Users/anubhav/Downloads/vendor-management`.**
Do not touch, read from, or write to `vendor3`. Do not run any `git push`
without explicit approval after showing verification results, per the
standing rule from last round.

---

## Step 0 — Prerequisite: prove the database connection is real before building anything on top of it

This is still unresolved from last round and has to be closed first —
wiring more of the frontend to a backend whose persistence layer has never
actually run against Postgres just compounds the same unverified foundation.

1. Set a real `DATABASE_URL` in `backend/.env` pointing at the actual
   Supabase Postgres instance from `supabase_setup_guide.md`.
2. Run `alembic upgrade head` against it and paste the real output.
3. Re-run `test_decisions.py` with that `DATABASE_URL` set, so
   `_persist_to_database` actually executes instead of hitting the
   `OptionalSessionDep` fallback. Paste the full `pytest -v` output.
4. Open the Supabase table editor (or run a query) and paste actual rows
   from `activity_log` and `approval_history` after a real approve/reject
   call. I need to see real data in the real database, not a green test
   result.

Do not proceed past this step until it's shown with real output.

---

## Step 1 — Full inventory: what's actually connected vs. still mocked

Grep `context/NexusContext.tsx` and `services/api.ts` for every dispatcher
and data source. For each one, report one of three states:
- **Connected** — hits a real FastAPI endpoint, backed by Step 0's verified DB.
- **Partially connected** — hits an endpoint but falls back to mock/local
  data on any error or missing config (flag every one of these explicitly —
  this exact pattern is what caused the PipelineFunnel bug).
- **Mocked** — still pure local state / hardcoded arrays, no backend call at all.

Give me this as a table: dispatcher/data source name → current state →
which backend endpoint it should hit. Cover at minimum: vendor list, vendor
detail, document list, document upload, document field correction
(`correctField`), document review verdict (`runDocumentReview`), decisions
(`submitDecision` — approve/reject/request-changes), product catalog,
activity log, approval history, risk score, and the AI assistant chat.

---

## Step 2 — Wire everything marked Mocked or Partially connected

Go domain by domain. For each one, after wiring it:
- Show the actual network request/response (browser devtools or a `curl`
  against the running backend) — not just "the UI shows data now."
- Confirm the data displayed traces back to a real row in Postgres, not a
  JS fallback array. If you're not sure which one it's showing, say so and
  check, don't assume the backend path succeeded because the page rendered
  something.

Order:
1. Vendors — list and detail fetch.
2. Documents — upload, OCR extraction status transitions, field correction,
   reviewer verdict.
3. Risk engine — confirm score recalculates and is served from the backend
   after a document or decision change, not computed client-side from mock
   data.
4. Product catalog.
5. Activity log / approval history — this should now be reading real rows
   written by Step 0.
6. AI assistant chat — confirm this is hitting real vector search over real
   `rag_chunks`, not returning a canned/placeholder response when RAG has no
   matches. Show one query that should have zero relevant chunks and confirm
   it says so honestly rather than inventing an answer.
7. Auth — confirm `CurrentUserDep` resolves an actual authenticated user
   (real login flow or real JWT), not a hardcoded stub user. Tell me plainly
   if there currently is no real login flow yet — don't imply RBAC is fully
   proven if the "current user" is still synthetic.

---

## Step 3 — Zero silent mock fallbacks left anywhere

Grep for every `catch` block or `|| <mock data>` pattern in
`services/api.ts` and the components that consume it. For each one:
- If a real backend call fails, the UI must show a visible error/empty
  state — never silently substitute fake data. This is a direct extension
  of the PipelineFunnel `|| 18` bug; the same failure mode can hide anywhere
  else this pattern exists.
- List every place you find this pattern and what you changed it to.

---

## Step 4 — One real end-to-end trace, not per-endpoint checks in isolation

Walk through a single real flow, start to finish, through the actual UI:
1. Create or select a real vendor.
2. Upload a real (or realistic test) document.
3. Show it move through Processing → OCR extraction → a real confidence
   score → Verified/Needs Review.
4. Show the risk score update as a result.
5. Approve the vendor through the UI.
6. Show the toast, then show the resulting rows in `activity_log` and
   `approval_history` in Supabase directly.
7. Show the dashboard widgets (PipelineFunnel, RecentActivity, TrendChart)
   reflect this vendor's new state without a page refresh forcing it.

Paste screenshots or real output at each step. This is the proof that
"backend connected to frontend" means what it should — one traced request
through the whole stack — not seven isolated things that each individually
compile.

---

## What I need back

Answer in order: Step 0 first, with real evidence, before anything else.
Then the Step 1 inventory table. Then wire and verify Step 2 domain by
domain. Then Step 3's grep-and-fix. Then the Step 4 end-to-end trace as the
final proof. Don't summarize steps as done without the evidence each one
asks for.
