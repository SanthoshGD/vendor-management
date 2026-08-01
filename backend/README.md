# StyleSphere Nexus — Backend API

FastAPI service for vendor onboarding and compliance orchestration.
Built to `BACKEND_AI_INTEGRATION_PLAN.md` (repo root), which is authoritative
for anything backend-related.

> **Scaffold status.** Structure, layering, routing, dependency wiring, schemas
> and service seams are complete and verified to boot. **No business logic is
> implemented** — those endpoints answer `501 Not Implemented` inside the
> standard envelope. `/`, `/health` and `/health/ready` are fully implemented.

## Requirements

- Python **3.12** (pinned in `.python-version`, `pyproject.toml`, `nixpacks.toml`)
- Supabase project (optional locally — the API boots without one and reports
  `degraded` on `/health/ready`)

## Local development

```bash
python -m venv .venv
```

```bash
.venv/Scripts/activate
```

```bash
pip install -r requirements.txt
```

```bash
cp .env.example .env
```

```bash
uvicorn app.main:app --reload --port 8000
```

Docs: <http://127.0.0.1:8000/docs> (disabled automatically in production).

## Tests

```bash
pytest -q
```

Asserts the app assembles, every route is under `/api/v1`, no endpoint 404s or
500s, the envelope is uniform, request-id propagation works, CORS admits only
the configured origin, and no Gemini key value can leave through the API.

## Layout (plan §3)

```
backend/
├── app/main.py          FastAPI entrypoint: CORS, routers, error handlers
├── api/
│   ├── deps.py          auth, current user, pagination, DI wiring
│   └── v1/              one module per resource + health
├── repositories/        the ONLY layer that talks to Supabase
├── services/
│   ├── ai/              AIProvider, GeminiProvider, key rotation, RAG
│   ├── notification/    notification fan-out
│   ├── storage/         Supabase Storage buckets
│   └── analytics/       server-side aggregates
├── core/                config · response · logger · security · risk_engine
├── events/              in-process pub/sub (plan §9)
├── workers/             Railway service #2 (plan §10)
├── schemas/             Pydantic wire contracts mirroring types/*.ts
├── models/              Supabase row shapes (not ORM models)
├── settings/            risk_rules · countries · document_types · sla (JSON)
└── tests/
```

Dependency direction is one-way and never skipped:

```
router → repository / service → supabase
```

No Supabase call ever happens inside a router. Services never import FastAPI
types.

## Conventions

- **Envelope (§8)** — every response is
  `{ success, data, message, errors, meta }`. Pagination lives in `meta`.
  A failure is never reported as a success.
- **Casing** — snake_case in Python, camelCase on the wire, so
  `services/api.ts` needs no response transformation.
- **Correlation (§17)** — every response carries `X-Request-ID`; an inbound one
  is honoured. The same id appears on every log line for that request.
- **Risk (§12)** — deterministic and explainable. Gemini produces the inputs;
  `core/risk_engine.py` produces the score, always with its driver breakdown.
- **Gemini (§6)** — `services/ai/gemini_provider.py` is the only module allowed
  to import the SDK. Keys are encrypted at rest and never logged or returned.
- **Audit (§11)** — append-only. Actor and timestamp are derived from the
  session and server clock, never from a request body.

## Deploying to Railway (§19)

Two services, same repo, root directory `backend/`:

| Service | Start command | Healthcheck |
|---|---|---|
| `backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `/health` |
| `worker` | `python -m workers.runner` | none |

`/health` is liveness only and never touches Supabase, so a database outage
cannot trigger a restart loop.

Required variables (both services): `ENVIRONMENT=production`, `DEBUG=false`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MASTER_ENCRYPTION_KEY`,
`JWT_SECRET`, `FRONTEND_ORIGIN`. `PORT` is injected by Railway.

Startup fails fast in production if any of those are missing — better than
serving a misconfigured process.

The frontend only ever needs `NEXT_PUBLIC_API_BASE_URL`.
