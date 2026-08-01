# Migrations

Alembic owns the Supabase Postgres schema (spec §4). `alembic.ini` carries no
URL — `env.py` reads `DATABASE_URL` from `core.config.Settings`, so migrations
and the running API can never point at different databases.

```bash
alembic upgrade head
```

```bash
alembic revision --autogenerate -m "describe the change"
```

```bash
alembic downgrade -1
```

Run from `backend/` with the virtualenv active and `DATABASE_URL` set.

## Revisions

| Revision | Contains |
|---|---|
| `0001_core_schema` | `pgcrypto`; vendors, documents, risk drivers, products, activity log, approval history, communications, users |
| `0002_ai_rag_jobs` | `vector`; Gemini key pool, notifications, RAG collections/chunks + HNSW index, job queue |

The split is intentional: `0001` is everything the vendor workflow needs and
depends only on `pgcrypto`. `0002` adds the AI surface and is the only revision
that requires the `vector` extension, so a deployment target without pgvector
fails on a revision boundary with an obvious message rather than midway through
creating the core tables.

## Conventions

- **Autogenerate is a draft, not an answer.** Review every emitted revision.
  Alembic does not detect column renames (it emits drop + add, which loses
  data), and cannot infer a backfill.
- **Constraint names come from `db/base.py`'s naming convention.** Never write
  `op.drop_constraint(None, ...)` — an unnamed constraint is not droppable.
- **`activity_log` is append-only** (spec §11). No migration may add an update
  path to it, and the production database role should have UPDATE and DELETE
  revoked on that table.
