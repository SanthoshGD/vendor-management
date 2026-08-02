"""Tests for DecisionService and vendor decision endpoints (spec §9, §11)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from services.vendor.decision_service import DecisionService


@pytest.mark.asyncio
async def test_decision_service_approve_demo_mode():
    svc = DecisionService(supabase=None)
    res = await svc.approve(
        vendor_id="VND-001",
        comment="All compliance checks verified",
        reviewer="Test Admin",
        reviewer_id="usr-123",
        ip_address="127.0.0.1",
    )
    assert res.vendor_id == "VND-001"
    assert res.decision == "approved"
    assert res.status.value == "Approved"
    assert res.reviewer == "Test Admin"
    assert res.activity_log_id is not None


@pytest.mark.asyncio
async def test_decision_service_reject_demo_mode():
    svc = DecisionService(supabase=None)
    res = await svc.reject(
        vendor_id="VND-002",
        comment="Tax certificate mismatch",
        reviewer="Test Admin",
        reviewer_id="usr-123",
    )
    assert res.vendor_id == "VND-002"
    assert res.decision == "rejected"
    assert res.status.value == "Rejected"


@pytest.mark.asyncio
async def test_decision_service_request_changes_demo_mode():
    svc = DecisionService(supabase=None)
    res = await svc.request_changes(
        vendor_id="VND-003",
        comment="Please resubmit document",
        changes=["Upload valid GST certificate", "Update insurance policy"],
        reviewer="Test Admin",
        reviewer_id="usr-123",
    )
    assert res.vendor_id == "VND-003"
    assert res.decision == "changes_requested"
    assert res.status.value == "Changes Requested"


def test_api_approve_vendor():
    app = create_app()
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/vendors/VND-100/approve",
            json={"comment": "Approved following automated compliance audit"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["vendorId"] == "VND-100"
        assert body["data"]["decision"] == "approved"
        assert body["data"]["status"] == "Approved"


def test_api_reject_vendor():
    app = create_app()
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/vendors/VND-101/reject",
            json={"comment": "Expired Certificate of Insurance"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["vendorId"] == "VND-101"
        assert body["data"]["decision"] == "rejected"
        assert body["data"]["status"] == "Rejected"


def test_api_request_changes():
    app = create_app()
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/vendors/VND-102/request-changes",
            json={
                "comment": "Document verification incomplete",
                "changes": ["Re-upload Bank Account Verification Letter"],
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["vendorId"] == "VND-102"
        assert body["data"]["decision"] == "changes_requested"
        assert body["data"]["status"] == "Changes Requested"


def test_api_approve_vendor_role_gated():
    from core.security import CurrentUser, Role
    from api.deps import get_current_user

    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="00000000-0000-0000-0000-000000000002",
        email="vendor@example.com",
        name="Vendor User",
        role=Role.vendor,
        vendor_id="VND-100",
    )

    with TestClient(app) as client:
        res = client.post(
            "/api/v1/vendors/VND-100/approve",
            json={"comment": "Attempting unauthorized approval"},
        )
        assert res.status_code == 403
        body = res.json()
        assert body["success"] is False
        assert body["errors"][0]["code"] == "forbidden"


def test_api_reject_vendor_role_gated():
    from core.security import CurrentUser, Role
    from api.deps import get_current_user

    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="00000000-0000-0000-0000-000000000002",
        email="vendor@example.com",
        name="Vendor User",
        role=Role.vendor,
        vendor_id="VND-101",
    )

    with TestClient(app) as client:
        res = client.post(
            "/api/v1/vendors/VND-101/reject",
            json={"comment": "Attempting unauthorized rejection"},
        )
        assert res.status_code == 403
        body = res.json()
        assert body["success"] is False
        assert body["errors"][0]["code"] == "forbidden"
