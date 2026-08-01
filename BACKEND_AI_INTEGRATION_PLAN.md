# StyleSphere Nexus — Backend, RAG & API Key Rotation Integration Plan

> **File:** `BACKEND_AI_INTEGRATION_PLAN.md`
> **Repository:** `vendor-management` (`SanthoshGD/vendor-management`)
> **Companion docs:** `PROJECT_STATE_AND_STRUCTURE.md`, `currentstage.md`
> **Purpose:** Execution spec for Claude Code to take the current frontend-only StyleSphere Nexus prototype and wire up a real backend — FastAPI + Supabase (Postgres/pgvector/Storage/Auth) + Gemini with RAG and key rotation — without breaking the existing Vendor Portal or Admin UI contracts.
> **Philosophy:** **Demo first, production second.** The demo does not need every layer below built on day one — it needs an architecture that doesn't have to be rewritten to grow into one. Section 14 marks what's demo-critical vs. what can be stubbed/deferred.

Claude Code should treat this file as authoritative for anything backend-related. For frontend rules (design system, terminology, tab structure, "no popup review pages", etc.), defer to `PROJECT_STATE_AND_STRUCTURE.md` and `currentstage.md` — this file does not override those.

---

## 1. Ground Rules for Claude Code

1. **Do not touch the Vendor Portal** unless explicitly instructed — including its API contracts.
2. **Do not change existing component props/interfaces** in `components/admin/**` without checking `NexusContext.tsx` and `services/api.ts` first — the backend is built to match what the frontend already expects. If a mismatch is unavoidable, flag it and propose the minimal adapter, not a rewrite.
3. **`services/api.ts` is the seam.** It's currently a mock API. The work is giving it a real implementation with the same function signatures and return shapes, so `NexusContext.tsx` doesn't change. Treat this as a strangler-fig migration.
4. **Additive first.** New backend code lives in a new `backend/` directory at repo root. Nothing in `app/`, `components/`, `context/`, `services/`, `types/` gets deleted — only extended or, where explicitly required, swapped from mock to real.
5. **Secrets never touch the frontend bundle.** All Gemini calls, Supabase service-role operations, and key rotation logic live server-side only (FastAPI). The frontend talks to FastAPI, never directly to Gemini, and never with a Supabase service-role key.
6. **Explain architectural decisions** before large structural changes, per the "Expected Quality" rules already in `PROJECT_STATE_AND_STRUCTURE.md`.
7. **Don't over-build the demo.** Every layer below (repositories, events, workers, provider abstraction) is justified for where this grows, but Section 14 gates what actually needs to exist before tomorrow's demo vs. what should be a clean stub. Building all 18 layers to full depth before the demo is the wrong call — get the seams right, fill them in incrementally.

---

## 2. Target Architecture

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐
│  Next.js Frontend    │ ────────────────────────▶ │   FastAPI Backend     │
│  (Vercel)             │ ◀──────────────────────── │   (Railway)            │
│  services/api.ts      │      REST + SSE for       │  /backend             │
└─────────────────────┘      streaming AI chat       └───────┬──────────────┘
                                                              │
                                        ┌─────────────────────┼─────────────────────┐
                                        ▼                     ▼                     ▼
                             ┌────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
                             │   Supabase           │ │  AI Provider Layer │ │  Background Worker    │
                             │   - Postgres          │ │  (Gemini today,    │ │  (Railway service #2)  │
                             │   - pgvector (RAG)    │ │   pluggable later)  │ │  OCR / embeddings /    │
                             │   - Storage (buckets)  │ │  behind key         │ │  risk recalculation /  │
                             │   - Auth               │ │  rotation           │ │  notifications         │
                             └────────────────────┘ └──────────────────┘ └──────────────────────┘
```

**Why FastAPI sits in the middle instead of calling Supabase/Gemini directly from Next.js:** deterministic risk scoring is business logic that must be tamper-proof and consistent across both portals; Gemini key rotation and RAG retrieval need a stateful, restartable process, not serverless edge functions; and this keeps a clean seam at `services/api.ts` so `NexusContext.tsx` and every component reading from it stay untouched.

**Why supabase-py instead of SQLAlchemy:** since Supabase is already the chosen database, going `FastAPI → SQLAlchemy → Postgres → Supabase` adds an ORM layer that duplicates what Supabase's client already gives you (auth-aware queries, storage, RLS-friendly access). `FastAPI → supabase-py → Supabase` is simpler and matches the stack decision already made — use it unless a specific query pattern genuinely needs raw SQL, in which case call Postgres directly rather than reaching for an ORM.

---

## 3. Repository Layout

```
vendor-management/
├── backend/
│   ├── app/
│   │   └── main.py                     # FastAPI app entrypoint, CORS, router registration
│   ├── api/
│   │   ├── v1/
│   │   │   ├── dashboard/
│   │   │   ├── vendors/
│   │   │   ├── documents/
│   │   │   ├── products/
│   │   │   ├── assistant/
│   │   │   ├── analytics/
│   │   │   ├── activity/
│   │   │   ├── communication/
│   │   │   └── auth/
│   │   └── deps.py                     # Shared dependencies (auth, current user, pagination)
│   ├── repositories/                   # ONLY layer that talks to Supabase
│   │   ├── vendor_repository.py
│   │   ├── document_repository.py
│   │   ├── product_repository.py
│   │   ├── activity_repository.py
│   │   ├── risk_repository.py
│   │   └── rag_repository.py
│   ├── services/
│   │   ├── ai/
│   │   │   ├── provider.py             # AIProvider interface: generate() / embed() / extract()
│   │   │   ├── gemini_provider.py      # Gemini implementation of AIProvider
│   │   │   ├── chat_service.py         # Assistant/Copilot chat orchestration
│   │   │   ├── extraction_service.py   # OCR / document field extraction
│   │   │   ├── embedding_service.py    # RAG embedding generation
│   │   │   ├── rag_pipeline.py         # Chunk/embed/retrieve orchestration
│   │   │   └── key_rotation.py         # Gemini API key pool + rotation policy
│   │   ├── notification/
│   │   │   └── notification_service.py
│   │   ├── storage/
│   │   │   └── storage_service.py      # Supabase Storage bucket helpers
│   │   └── analytics/
│   │       └── analytics_service.py
│   ├── core/
│   │   ├── config.py                   # Settings (pydantic-settings), env loading
│   │   ├── risk_engine.py              # Pure function: calculate(vendor, documents) -> RiskResult
│   │   ├── security.py                 # JWT validation, role checks
│   │   ├── logger.py                   # Structured logging setup
│   │   └── response.py                 # Standard {success, data, message, errors, meta} envelope
│   ├── events/
│   │   ├── bus.py                      # Minimal in-process pub/sub (upgrade path: queue-backed)
│   │   ├── vendor_approved.py
│   │   ├── vendor_rejected.py
│   │   ├── document_uploaded.py
│   │   └── document_verified.py
│   ├── workers/
│   │   ├── ocr_worker.py
│   │   ├── embedding_worker.py
│   │   ├── notification_worker.py
│   │   └── risk_recalc_worker.py
│   ├── schemas/                        # Pydantic request/response schemas mirroring types/*.ts
│   │   ├── vendor.py
│   │   ├── document.py
│   │   ├── risk.py
│   │   └── assistant.py
│   ├── models/                         # Supabase table type definitions (dataclasses/pydantic, not ORM models)
│   ├── settings/                       # Editable-without-redeploy config
│   │   ├── countries.json
│   │   ├── risk_rules.json
│   │   ├── document_types.json
│   │   └── sla.json
│   ├── utils/
│   ├── tests/
│   ├── requirements.txt
│   ├── Procfile / railway.json         # two Railway services: backend + worker
│   └── .env.example
└── (existing frontend structure unchanged)
```

`types/vendor.ts`, `types/request.ts`, `types/audit.ts`, `types/agent.ts` remain the source of truth for shape — `backend/schemas/*.py` mirrors them field-for-field so `services/api.ts` needs zero response transformation.

### Call flow through the layers

```
Router (api/v1/vendors) → Repository (VendorRepository) → Supabase
                        ↘ Service (risk_engine / ai / notification) as needed
```

Routes stay thin: parse request, call one or two repositories/services, return via the standard response envelope (Section 8). No Supabase calls inside routers, ever — that's what makes the repository layer worth it: swapping Supabase for something else later, or adding caching, touches one file per entity instead of every route.

---

## 4. Database Schema (Supabase / Postgres)

Design principle: mirror `data/mockData.ts` and `types/*.ts` closely so the migration from mock to real data is a data-source swap, not a shape change.

Core tables:

- **`vendors`** — id, company_name, country, status, priority, assigned_vendor_executive, submission_date, risk_score, risk_level, created_at, updated_at
- **`vendor_documents`** — id, vendor_id (fk), doc_type, file_url (Supabase Storage path), status, confidence, extracted_fields (jsonb), validated_by, validated_at
- **`vendor_risk_drivers`** — id, vendor_id (fk), driver_code (e.g. `INSURANCE_EXPIRED`), points, description, created_at
- **`products`** — id, vendor_id (fk), name, country, category, approval_status, approval_date
- **`activity_log`** — id, vendor_id (fk, nullable), actor, action, before (jsonb), after (jsonb), reason, ip_address, created_at — append-only, never deleted (Section 11)
- **`approval_history`** — id, vendor_id (fk), decision, comment, reviewer, decided_at
- **`communications`** — id, vendor_id (fk), channel (vendor_chat/internal_note/chaser), sender, message, created_at
- **`users`** — id, name, role (admin/vendor), email — bridges to Supabase Auth `auth.users`
- **`gemini_api_keys`** — id, key_label, encrypted_key, status (active/cooling_down/disabled), daily_quota, used_today, last_used_at, last_error, priority
- **`notifications`** — id, user_id, event_type, payload (jsonb), read_at, created_at
- **`notification_events`** — id, event_type, source (vendor_id/document_id), created_at — the raw event log notifications are generated from
- **`notification_preferences`** — id, user_id, channel (in_app/email/sms/push/slack/teams), event_type, enabled
- **`rag_documents`** — id, collection (compliance_policy/vendor_document/historical_decision/internal_sop/product_rule), source_id, title, created_at
- **`rag_chunks`** — id, rag_document_id (fk), chunk_text, chunk_index, embedding (`vector(768)` via pgvector), vendor_id (nullable), country (nullable), doc_type (nullable), category (nullable), created_at

Enable the `pgvector` extension and index `rag_chunks.embedding` (IVFFlat or HNSW) for retrieval speed.

---

## 5. AI Provider Abstraction

Don't hardcode Gemini into services or routers. Define one interface and one Gemini implementation behind it:

```python
# backend/services/ai/provider.py
class AIProvider(Protocol):
    async def generate(self, prompt: str, **kwargs) -> AIResponse: ...
    async def embed(self, text: str, **kwargs) -> list[float]: ...
    async def extract(self, document: bytes, schema: dict, **kwargs) -> dict: ...
```

```python
# backend/services/ai/gemini_provider.py
class GeminiProvider(AIProvider):
    def __init__(self, key_rotation: KeyRotationPolicy): ...
    async def generate(self, prompt, **kwargs): ...   # chat / assistant
    async def embed(self, text, **kwargs): ...          # RAG embeddings
    async def extract(self, document, schema, **kwargs): ...  # OCR / field extraction
```

`chat_service.py`, `extraction_service.py`, and `embedding_service.py` each depend on `AIProvider`, not on Gemini directly. Swapping in Claude, OpenAI, or Azure later means writing one new class, not touching three services. This also keeps the three AI concerns (chat, extraction, embeddings) evolving independently — they have different latency, cost, and failure characteristics and shouldn't share one undifferentiated `gemini_client.py`.

---

## 6. Gemini API Key Rotation

### 6.1 Why rotation is needed
Gemini's tiers apply per-key rate limits (RPM, TPM, RPD). A single admin portal doing OCR extraction + risk-relevant field validation + RAG chat + assistant quick-prompts can burst past one key's quota quickly. Rotation spreads load, fails over automatically on rate-limit/errors, and avoids hard outages for the AI Assistant during bursts.

### 6.2 Key pool design
Store keys in `gemini_api_keys` (Supabase), **encrypted at rest** (Supabase Vault, or application-level AES-GCM before insert — never plaintext in the DB or in a committed `.env`). Only FastAPI holds decryption capability, via `MASTER_ENCRYPTION_KEY` set in Railway.

```python
class KeyRotationPolicy:
    """
    Weighted round-robin with health-based exclusion.
    - status='active' keys are eligible.
    - On 429/quota-exceeded: mark 'cooling_down', cooldown_until = now + backoff
      (exponential, capped ~15 min).
    - On repeated auth errors (invalid/revoked key): mark 'disabled', alert.
    - Track used_today / daily_quota; reset via scheduled job at UTC midnight.
    - Pick key: filter eligible -> sort by (priority, used_today ascending) -> pick first.
    """
    async def get_key(self) -> ApiKeyRecord: ...
    async def report_success(self, key_id: str, tokens_used: int) -> None: ...
    async def report_failure(self, key_id: str, error: GeminiError) -> None: ...
```

`GeminiProvider` is the **only** place allowed to import the Gemini SDK / call `generativelanguage.googleapis.com`. On failure it retries once against the next eligible key (bounded depth, default 2) before surfacing a clean "AI temporarily unavailable" error to the frontend rather than a raw 500.

### 6.3 Operational notes
- Add an admin-only `GET/POST /api/v1/admin/gemini-keys` so keys can be added/disabled without a redeploy — surfaced later in Admin Settings.
- Never log full key values — only `key_label` and last 4 characters.

---

## 7. RAG Pipeline

### 7.1 Separate collections, not one index
Don't index everything together. Use distinct `collection` values in `rag_documents` (Section 4):

- Compliance Policies
- Vendor Documents
- Historical Decisions
- Internal SOP
- Product Rules

Each chunk carries metadata (`vendor_id`, `country`, `doc_type`, `category`, `created_at`) so retrieval can be scoped precisely — e.g. a query from a specific Vendor Details page filters to that `vendor_id` plus the global Compliance Policies collection, rather than searching everything and hoping ranking sorts it out. This is what makes retrieval quality dramatically better than a single flat index.

### 7.2 Pipeline stages
```
Ingest → Chunk → Embed (embedding_service.py) → Store (pgvector, scoped by collection)
       → Retrieve (top-k, filtered by collection + metadata) → Augment prompt
       → Generate (chat_service.py via AIProvider) → Stream response
```

- **Chunking:** ~500–800 tokens, ~10% overlap.
- **Embedding model:** Gemini embeddings today, routed through `AIProvider.embed()` — swappable later.
- **Retrieval:** cosine similarity via pgvector, filtered by collection + metadata as above.
- **Re-indexing triggers:** new document approved → OCR → chunk/embed/upsert; vendor decision recorded → embed into Historical Decisions; policy pack edited → re-embed affected chunks. These should run as background jobs (Section 10), not inline in the request that triggered them.

### 7.3 Make the Assistant a Copilot, not a chatbot
The assistant should be context-injected, not a blank chat box. When opened from a Vendor Details page, the backend passes vendor ID, country, risk score, document list, and status into the system context before the first token is generated — so "Why is this High Risk?" resolves without the admin naming the vendor. When opened from the global FAB, it operates unscoped (policy + global collections) with the existing quick prompts (`Show pending vendors`, `High risk vendors`, `Chinese suppliers`, `Expired insurance`, `Missing tax certificates`, `Waiting for approval`) as structured suggestions. Tone stays deliberately un-chatbot-like per the existing product rule: concise, cites vendor/document IDs, feels embedded rather than bolted on.

`POST /api/v1/assistant/chat` streams via SSE/chunked response so `AIComplianceAssistant.tsx` / `AIAssistantChatbot.jsx` can render token-by-token.

---

## 8. API Surface

**Versioned from day one** — `/api/v1/...` — so a future `v2` doesn't break the frontend contract.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/dashboard` | Metrics, approval trend, pipeline funnel, priority queue, recent activity, China approval rate |
| GET | `/api/v1/vendors` | Filterable/sortable list — filters + columns per spec |
| GET | `/api/v1/vendors/{id}` | Full vendor detail incl. risk, overview fields |
| GET | `/api/v1/vendors/{id}/documents` | Documents + extracted fields + confidence |
| POST | `/api/v1/vendors/{id}/documents/{doc_id}/extract` | Queue Gemini OCR + field extraction (worker-backed, Section 10) |
| POST | `/api/v1/vendors/{id}/documents/{doc_id}/validate` | Admin correction of extracted fields |
| GET | `/api/v1/vendors/{id}/risk` | Risk score, level, drivers, recommendation |
| POST | `/api/v1/vendors/{id}/approve` | Emits `VendorApproved` event (Section 9) |
| POST | `/api/v1/vendors/{id}/reject` | Emits `VendorRejected` event |
| POST | `/api/v1/vendors/{id}/request-changes` | Same audit trail requirements |
| GET/POST | `/api/v1/vendors/{id}/communication` | Vendor chat, internal notes, chaser panel |
| GET | `/api/v1/vendors/{id}/activity` | Vendor-scoped audit trail |
| GET | `/api/v1/activity` | Global audit trail |
| GET | `/api/v1/products` | Product Catalog listing |
| GET | `/api/v1/analytics` | Aggregated analytics view data |
| POST | `/api/v1/assistant/chat` | RAG + Gemini, streaming, vendor-scoped or global |
| GET/POST | `/api/v1/admin/gemini-keys` | Key pool management (admin-only) |
| POST | `/api/v1/auth/session` | Bridges Supabase Auth session to backend-issued JWT/cookie |

### Standard response envelope
Every endpoint returns the same shape so the frontend can handle success/error generically:

```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": [],
  "meta": {}
}
```

Implemented once in `core/response.py` and used by every router — not something each route reinvents.

---

## 9. Event-Driven Side Effects

Approving a vendor today implies: vendor status update, activity log entry, timeline update, notification, dashboard metrics refresh, toast — and eventually email, Slack, analytics. Calling all of that inline from `approve()` doesn't scale as more listeners get added. Instead:

```
approve() → emit VendorApproved event → listeners handle status, activity, notification, etc. independently
```

```
backend/events/
├── bus.py                # minimal in-process pub/sub to start
├── vendor_approved.py
├── vendor_rejected.py
├── document_uploaded.py
└── document_verified.py
```

Start with a lightweight in-process bus (a dict of event name → list of async handlers) — this alone decouples the "9 function calls" problem without needing a message broker on day one. The upgrade path (Redis/Supabase Realtime/a real queue) is a swap of `bus.py`'s internals, not a rewrite of every caller, since routers only ever call `emit()`.

---

## 10. Background Workers

Don't let document uploads block on OCR/embedding. Flow:

```
Upload PDF → store (Supabase Storage) → queue extraction job → [respond to client immediately]
           → worker processes: OCR → extract fields → embed → upsert rag_chunks → emit DocumentVerified
```

```
backend/workers/
├── ocr_worker.py
├── embedding_worker.py
├── notification_worker.py
└── risk_recalc_worker.py       # recalculates risk when a new driver-relevant fact lands
```

**Railway deployment:** two services — `backend` (API) and `worker` (queue consumer) — so OCR/embedding/notification/risk-recalc work never blocks API request latency. A simple Postgres-backed job table is enough to start; move to a proper queue (e.g. Redis/RQ) if throughput demands it later.

---

## 11. Audit Logs

Never delete. Every mutation to `activity_log` captures: actor, action, **before**, **after**, reason (where applicable), timestamp, IP address. All admin-mutating endpoints (`approve`, `reject`, `request-changes`, document validation) write to `activity_log` in the same transaction as the mutation itself — this is what backs "Every action is logged" for the Activity tab, and it's the kind of detail enterprise buyers specifically check for.

---

## 12. Deterministic Risk Engine

Risk is rule-based, not AI-generated. Lives in `core/risk_engine.py` as pure business logic — no database calls, no AI calls, no HTTP — because it isn't a service, it's a function:

| Driver | Points |
|---|---|
| Insurance Expired | +25 |
| Tax Missing | +20 |
| GST Mismatch | +15 |
| Address Mismatch | +15 |
| Bank Proof Missing | +10 |
| Low AI Confidence | +10 |
| Vendor Age < 6 months | +5 |

`calculate(vendor, documents) -> RiskResult{score, level, drivers[], recommendation}`. Gemini's role is limited to producing the inputs (extracted fields, confidence scores) this function consumes — the score itself stays explainable and reproducible, matching the "Explainable AI" design philosophy. Risk driver thresholds/points live in `settings/risk_rules.json` (Section 13), not hardcoded, so they're tunable without a redeploy.

---

## 13. Configurable Settings (not hardcoded)

```
backend/settings/
├── countries.json
├── risk_rules.json         # the point table above
├── document_types.json
└── sla.json
```

These get loaded at startup (and hot-reloadable later if needed) rather than baked into code, so an admin — eventually via the Settings screen already in the sidebar per the frontend spec — can adjust risk weights or add a document type without a deploy.

---

## 14. Demo-Critical vs. Deferrable

Given "demo first, production second," here's the gate:

**Needed for a credible demo:**
- Repository layer (Section 3) — cheap to do right from the start, avoids rework
- Core tables (Section 4) minus notification/RAG-collection nuance
- `AIProvider` interface with `GeminiProvider` (Section 5) — even if only `generate()` and `extract()` are wired first
- Basic key rotation (Section 6) — at minimum: try key, on failure try next, mark cooling_down. Full backoff/priority tuning can come later.
- Deterministic risk engine (Section 12)
- `/api/v1/...` versioning and standard response envelope (Section 8) — trivial to start with, painful to retrofit
- RAG over at least one collection (Vendor Documents or Compliance Policies) so the Assistant demo isn't empty

**Safe to stub or defer past the demo:**
- Full event bus (Section 9) — inline function calls are fine short-term; introduce `bus.py` when the second or third listener shows up
- Background workers (Section 10) — synchronous extraction is acceptable for a demo's document volume; move to workers once upload volume or latency becomes a problem
- Notification preferences/multi-channel (Section 10 of the schema) — a single `notifications` table with in-app only is enough initially
- Settings-as-JSON hot config (Section 13) — hardcoded constants are fine until an admin actually needs to tune them
- Multi-provider AI abstraction beyond Gemini — keep the `AIProvider` interface, but don't build a second provider until there's a reason to

---

## 15. Auth Model

- Supabase Auth handles vendor and admin identity (two roles — no third "Vendor Executive" login; it's an assignment field only, per spec).
- FastAPI validates the Supabase JWT on each request (`core/security.py`), enforces role-based access (vendor role limited to its own vendor record; admin role portal-wide).
- RLS policies in Supabase as defense-in-depth, not the primary gate, given the service-role key usage in the backend.

---

## 16. Environment Variables (`backend/.env.example`)

```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# Gemini
GEMINI_API_KEYS_SEED=             # optional bootstrap list, comma-separated (dev only — prod keys live in gemini_api_keys table)
MASTER_ENCRYPTION_KEY=            # for encrypting stored Gemini keys at rest

# Auth
JWT_SECRET=
SUPABASE_JWT_AUD=

# App
ENVIRONMENT=development|staging|production
FRONTEND_ORIGIN=https://<vercel-domain>
```

Frontend (`vendor-management/.env.local`) only ever needs `NEXT_PUBLIC_API_BASE_URL` pointing at the Railway FastAPI URL — no Gemini or Supabase service-role secrets in the frontend env.

---

## 17. Structured Logging

Every request/AI call logs (not printed — structured, e.g. JSON via `core/logger.py`): request ID, vendor ID (if applicable), admin ID, latency, endpoint, tokens used, which Gemini key served the call (label only), and estimated cost. This is what makes key-rotation and cost issues debuggable after the fact instead of guessed at.

---

## 18. Implementation Phases (suggested order for Claude Code)

**Phase 1 — Foundations**
1. Scaffold `backend/app`, `core/config.py`, `core/response.py`, `/api/v1` health-check route, repository layer skeleton.
2. Supabase project + migrations for core tables (Section 4, minus notifications/RAG).
3. `VendorRepository` + `/api/v1/dashboard`, `/api/v1/vendors`, `/api/v1/vendors/{id}` against real Supabase data seeded from `data/mockData.ts` shape.
4. Swap corresponding functions in `services/api.ts` from mock to `fetch()`, behind an env toggle for safe rollback.

**Phase 2 — Documents & Risk**
5. Supabase Storage buckets (`documents/`, `products/`, `avatars/`, `exports/`, `knowledge-base/` — kept separate, not mixed).
6. `core/risk_engine.py` (Section 12) + `/api/v1/vendors/{id}/risk`.
7. `approve` / `reject` / `request-changes` — inline side effects for now (event bus deferred per Section 14), writing `activity_log` + `approval_history` in the same transaction.

**Phase 3 — Gemini + Key Rotation**
8. `gemini_api_keys` table + `key_rotation.py` + `AIProvider`/`GeminiProvider` (Sections 5–6), basic version per Section 14.
9. `extraction_service.py` — Gemini-based OCR/field extraction wired into document upload (synchronous is fine for the demo).

**Phase 4 — RAG + Assistant**
10. `pgvector` setup, `rag_documents`/`rag_chunks`, `rag_pipeline.py`, starting with one collection.
11. `/api/v1/assistant/chat` streaming endpoint, context-injected per vendor (Section 7.3); connect to `AIComplianceAssistant.tsx` / `AIAssistantChatbot.jsx`.
12. Backfill embeddings for existing policy pack + any seeded vendor documents.

**Phase 5 — Hardening (post-demo)**
13. Introduce `events/bus.py` once a second/third listener is needed; move extraction/embedding into `workers/` as a second Railway service.
14. RLS policies, rate limiting on `/assistant/chat`, structured logging rollout, notification preferences.
15. Admin key-management endpoints + Settings-screen hook for `settings/*.json`.
16. Load test key rotation under simulated multi-key exhaustion.

---

## 19. Deployment

- **Backend API:** Railway service #1, `backend/` as root, `uvicorn app.main:app`.
- **Worker:** Railway service #2, once introduced per Section 14/18 — consumes the job queue for OCR/embeddings/notifications/risk recalculation without blocking API latency.
- **Frontend:** Vercel, unchanged, only `NEXT_PUBLIC_API_BASE_URL` added.
- **Database/Storage/Auth:** Supabase managed.
- **CORS:** FastAPI `CORSMiddleware` restricted to `FRONTEND_ORIGIN`.

---

## 20. Open Decisions for the Project Owner

- Exact Gemini model(s) for OCR vs. chat vs. embeddings (cost/latency tradeoff).
- Number of Gemini API keys to provision initially for the rotation pool.
- Whether Supabase Auth should support SSO for the Admin Portal, or email/password is sufficient for now.
- Retention policy for `activity_log` / `rag_chunks` (compliance data retention requirements).
- Timing: when to introduce the event bus and workers (Section 14) relative to the demo date.
