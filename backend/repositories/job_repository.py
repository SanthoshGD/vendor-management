"""Job queue persistence (spec §10).

A Postgres-backed job table, which the plan explicitly says is enough to start.
The interface is narrow - enqueue / claim / complete / fail - so replacing it
with Redis or RQ later touches this file and the worker, nothing else.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import select, text, update

from models.orm import Job
from repositories.base import BaseRepository, parse_uuid

# Doubling backoff between attempts, so a dependency that is briefly down does
# not get hammered by a job retrying every two seconds.
RETRY_BACKOFF_SECONDS = (30, 120, 600)


class JobRepository(BaseRepository[Job]):
    model: ClassVar[type[Job]] = Job

    async def enqueue(
        self,
        *,
        job_type: str,
        payload: dict[str, Any],
        run_after: datetime | None = None,
        max_attempts: int = 3,
    ) -> Job:
        """Queue work. No commit - the job lands with the mutation that caused it.

        That ordering matters: a job enqueued in its own transaction can be
        picked up by a worker before the row it refers to is visible.
        """
        return await self.add(
            Job(
                job_type=job_type,
                payload=payload,
                status="pending",
                attempts=0,
                max_attempts=max_attempts,
                run_after=run_after or datetime.now(UTC),
            )
        )

    async def claim(self, *, worker_id: str, job_types: list[str] | None = None) -> Job | None:
        """Atomically claim the next due job.

        `FOR UPDATE SKIP LOCKED` inside a single `UPDATE ... RETURNING` is what
        stops two workers taking the same row. A read-then-update in Python
        would race, and the failure mode - a document extracted twice - is
        silent.
        """
        type_filter = ""
        params: dict[str, Any] = {"worker_id": worker_id, "now": datetime.now(UTC)}
        if job_types:
            type_filter = "AND job_type = ANY(:job_types)"
            params["job_types"] = job_types

        statement = text(
            f"""
            UPDATE jobs
               SET status = 'running',
                   attempts = attempts + 1,
                   locked_at = :now,
                   locked_by = :worker_id,
                   updated_at = :now
             WHERE id = (
                   SELECT id
                     FROM jobs
                    WHERE status = 'pending'
                      AND run_after <= :now
                      {type_filter}
                    ORDER BY run_after ASC, created_at ASC
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
             )
         RETURNING id
            """
        )
        result = await self.session.execute(statement, params)
        claimed_id = result.scalar_one_or_none()
        if claimed_id is None:
            return None
        return await self.session.get(Job, claimed_id)

    async def complete(self, job_id: str | UUID) -> None:
        now = datetime.now(UTC)
        await self.session.execute(
            update(Job)
            .where(Job.id == parse_uuid(job_id, field="job_id"))
            .values(status="succeeded", completed_at=now, locked_at=None, locked_by=None,
                    last_error=None)
        )
        await self.session.flush()

    async def fail(self, job_id: str | UUID, *, error: str) -> None:
        """Record a failure and either schedule a retry or give up.

        Truncated because `last_error` is read by humans on a dashboard, and a
        multi-kilobyte traceback in a table cell helps nobody.
        """
        job = await self.session.get(Job, parse_uuid(job_id, field="job_id"))
        if job is None:
            return
        job.last_error = error[:2000]
        job.locked_at = None
        job.locked_by = None
        if job.attempts >= job.max_attempts:
            job.status = "failed"
            job.completed_at = datetime.now(UTC)
        else:
            index = min(job.attempts - 1, len(RETRY_BACKOFF_SECONDS) - 1)
            job.status = "pending"
            job.run_after = datetime.now(UTC) + timedelta(
                seconds=RETRY_BACKOFF_SECONDS[max(index, 0)]
            )
        await self.session.flush()

    async def pending_count(self, *, job_type: str | None = None) -> int:
        statement = select(Job).where(Job.status == "pending")
        if job_type:
            statement = statement.where(Job.job_type == job_type)
        return await self.count(statement)
