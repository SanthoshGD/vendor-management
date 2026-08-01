"""Relational persistence layer.

Owns the SQLAlchemy engine, session lifecycle and declarative base. Everything
that reads or writes Postgres goes through here, and only `repositories/` is
allowed to import it.

**Deviation from plan §2, recorded deliberately.** The plan argues for
`supabase-py` over an ORM. This backend uses both, split by responsibility:

* **SQLAlchemy + Alembic** own the relational layer — typed models, versioned
  migrations, real transactions. Spec §11 requires the status mutation, the
  `approval_history` row and the `activity_log` row to commit *in the same
  transaction*; PostgREST has no transaction spanning multiple requests, so
  that requirement cannot be met through `supabase-py` alone.
* **supabase-py** is retained for Storage and Auth (`core/supabase.py`), which
  are not relational concerns and which an ORM cannot replace.

Both point at the same Supabase project. There is no second database and no
duplicated access path: no module reads a table through PostgREST.
"""
