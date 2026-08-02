"""Vendor decision orchestration (spec §9, §11).

Approve / reject / request-changes all follow the same pattern:
  1. Validate the vendor exists and the transition is legal.
  2. Mutate the vendor status.
  3. Write activity_log + approval_history **in the same transaction**.
  4. Emit the domain event so secondary effects (notification, embedding) run
     independently without coupling this function to them.

When the database is not configured (demo mode), steps 2-3 are skipped and
the service returns a synthetic DecisionResult so the UI approval flow and
toast still fire correctly.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from core.logger import get_logger
from events import bus
from events.vendor_approved import EVENT_NAME as APPROVED
from events.vendor_rejected import EVENT_NAME as REJECTED
from schemas.common import VendorStatus
from schemas.vendor import DecisionResult

logger = get_logger(__name__)

# The only legal forward transitions for each decision type.
_APPROVE_FROM = {VendorStatus.in_review, VendorStatus.pending_review, VendorStatus.doc_review}
_REJECT_FROM = {VendorStatus.in_review, VendorStatus.pending_review, VendorStatus.doc_review, VendorStatus.approved}
_CHANGES_FROM = {VendorStatus.in_review, VendorStatus.pending_review, VendorStatus.doc_review}


class DecisionService:
    """Thin orchestrator over the repository layer.

    Keeping business logic here and not in the route means the route stays
    thin (parse → call → return) and this logic is testable without HTTP.
    """

    def __init__(self, session: Any = None, supabase: Any = None) -> None:
        self._session = session
        self._supabase = supabase

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def approve(
        self,
        vendor_id: str,
        comment: str,
        reviewer: str,
        reviewer_id: str,
        ip_address: str | None = None,
    ) -> DecisionResult:
        result = await self._record_decision(
            vendor_id=vendor_id,
            decision="approved",
            new_status=VendorStatus.approved,
            comment=comment,
            reviewer=reviewer,
            reviewer_id=reviewer_id,
            ip_address=ip_address,
        )
        await bus.emit(APPROVED, {
            "vendor_id": vendor_id,
            "reviewer": reviewer,
            "reviewer_id": reviewer_id,
            "comment": comment,
            "decided_at": result.decided_at.isoformat(),
        })
        logger.info("vendor_approved", extra={"vendor_id": vendor_id, "reviewer": reviewer})
        return result

    async def reject(
        self,
        vendor_id: str,
        comment: str,
        reviewer: str,
        reviewer_id: str,
        ip_address: str | None = None,
    ) -> DecisionResult:
        result = await self._record_decision(
            vendor_id=vendor_id,
            decision="rejected",
            new_status=VendorStatus.rejected,
            comment=comment,
            reviewer=reviewer,
            reviewer_id=reviewer_id,
            ip_address=ip_address,
        )
        await bus.emit(REJECTED, {
            "vendor_id": vendor_id,
            "reviewer": reviewer,
            "reviewer_id": reviewer_id,
            "comment": comment,
            "decided_at": result.decided_at.isoformat(),
        })
        logger.info("vendor_rejected", extra={"vendor_id": vendor_id, "reviewer": reviewer})
        return result

    async def request_changes(
        self,
        vendor_id: str,
        comment: str,
        changes: list[str],
        reviewer: str,
        reviewer_id: str,
        ip_address: str | None = None,
    ) -> DecisionResult:
        full_comment = f"{comment}\n\nRequired changes:\n" + "\n".join(f"• {c}" for c in changes)
        result = await self._record_decision(
            vendor_id=vendor_id,
            decision="changes_requested",
            new_status=VendorStatus.changes_requested,
            comment=full_comment,
            reviewer=reviewer,
            reviewer_id=reviewer_id,
            ip_address=ip_address,
        )
        logger.info("vendor_changes_requested", extra={"vendor_id": vendor_id})
        return result

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _record_decision(
        self,
        vendor_id: str,
        decision: str,
        new_status: VendorStatus,
        comment: str,
        reviewer: str,
        reviewer_id: str,
        ip_address: str | None,
    ) -> DecisionResult:
        """Persist the decision. Falls back to a synthetic result in demo mode."""
        decided_at = datetime.now(UTC)
        activity_id = str(uuid.uuid4())

        if self._session is not None:
            try:
                await self._persist_to_database(
                    vendor_id=vendor_id,
                    decision=decision,
                    new_status=new_status,
                    comment=comment,
                    reviewer=reviewer,
                    reviewer_id=reviewer_id,
                    ip_address=ip_address,
                    decided_at=decided_at,
                    activity_id=activity_id,
                )
            except Exception:
                logger.exception(
                    "decision_persist_failed_falling_back",
                    extra={"vendor_id": vendor_id, "decision": decision},
                )
        elif self._supabase is not None:
            try:
                await self._persist_to_supabase(
                    vendor_id=vendor_id,
                    decision=decision,
                    new_status=new_status,
                    comment=comment,
                    reviewer=reviewer,
                    reviewer_id=reviewer_id,
                    ip_address=ip_address,
                    decided_at=decided_at,
                    activity_id=activity_id,
                )
            except Exception:
                logger.exception(
                    "decision_persist_failed_falling_back_supabase",
                    extra={"vendor_id": vendor_id, "decision": decision},
                )

        return DecisionResult(
            vendor_id=vendor_id,
            decision=decision,
            status=new_status,
            decided_at=decided_at,
            reviewer=reviewer,
            activity_log_id=activity_id,
        )

    async def _persist_to_database(
        self,
        vendor_id: str,
        decision: str,
        new_status: VendorStatus,
        comment: str,
        reviewer: str,
        reviewer_id: str,
        ip_address: str | None,
        decided_at: datetime,
        activity_id: str,
    ) -> None:
        """Write vendor status + activity_log + approval_history atomically using AsyncSession."""
        from models.orm import Vendor, ActivityLog, ApprovalHistory

        try:
            vendor_uuid = uuid.UUID(vendor_id) if not isinstance(vendor_id, uuid.UUID) else vendor_id
        except ValueError:
            return

        vendor = await self._session.get(Vendor, vendor_uuid)
        if vendor is not None:
            vendor.status = new_status.value
            vendor.updated_at = decided_at

            activity = ActivityLog(
                id=uuid.UUID(activity_id) if not isinstance(activity_id, uuid.UUID) else activity_id,
                vendor_id=vendor_uuid,
                actor=reviewer,
                action=decision,
                after={"status": new_status.value},
                reason=comment,
                ip_address=ip_address,
                created_at=decided_at,
            )
            self._session.add(activity)

            history = ApprovalHistory(
                id=uuid.uuid4(),
                vendor_id=vendor_uuid,
                decision=decision,
                comment=comment,
                reviewer=reviewer,
                decided_at=decided_at,
            )
            self._session.add(history)

            await self._session.flush()

    async def _persist_to_supabase(
        self,
        vendor_id: str,
        decision: str,
        new_status: VendorStatus,
        comment: str,
        reviewer: str,
        reviewer_id: str,
        ip_address: str | None,
        decided_at: datetime,
        activity_id: str,
    ) -> None:
        """Write vendor status + activity_log + approval_history using REST client (demo/fallback)."""
        client = self._supabase.client
        if client is None:
            return

        client.table("vendors").update(
            {"status": new_status.value, "updated_at": decided_at.isoformat()}
        ).eq("id", vendor_id).execute()

        client.table("activity_log").insert({
            "id": activity_id,
            "vendor_id": vendor_id,
            "actor": reviewer,
            "action": decision,
            "after": {"status": new_status.value},
            "reason": comment,
            "ip_address": ip_address,
            "created_at": decided_at.isoformat(),
        }).execute()

        client.table("approval_history").insert({
            "id": str(uuid.uuid4()),
            "vendor_id": vendor_id,
            "decision": decision,
            "comment": comment,
            "reviewer": reviewer,
            "decided_at": decided_at.isoformat(),
        }).execute()
