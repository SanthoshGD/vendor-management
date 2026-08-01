"""Boot smoke tests.

Deliberately minimal: they assert the app assembles, every registered endpoint
boots, the spec §8 envelope is uniform, request-id propagation works, and CORS
admits only the configured origin. They are the regression net for the
scaffold itself, not for business logic that does not exist yet.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_app_boots() -> None:
    assert create_app().title


def test_health_is_ok() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_readiness_reports_dependencies() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health/ready")
        assert response.status_code in (200, 503)
        names = {d["name"] for d in response.json()["dependencies"]}
        assert {"supabase", "configuration"} <= names


def test_openapi_schema_generates() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/openapi.json")
        assert response.status_code == 200
        assert response.json()["paths"]


def test_routes_are_under_the_api_v1_prefix() -> None:
    """Spec §8: versioned from day one."""
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    versioned = [p for p in paths if p not in ("/", "/health", "/health/ready")]
    assert versioned
    assert all(p.startswith("/api/v1/") for p in versioned), versioned


def test_every_route_boots() -> None:
    """No endpoint may 404 (unregistered) or 500 (crash on wiring)."""
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        paths = client.get("/openapi.json").json()["paths"]
        checked = 0
        for path, operations in paths.items():
            url = path
            while "{" in url:
                head, _, rest = url.partition("{")
                _, _, tail = rest.partition("}")
                url = f"{head}TEST-ID{tail}"
            for method in operations:
                response = client.request(method.upper(), url, json={})
                assert response.status_code not in (404, 500), (
                    f"{method.upper()} {path} -> {response.status_code}"
                )
                checked += 1
        assert checked >= 20


def test_error_uses_the_standard_envelope() -> None:
    """Spec §8: {success, data, message, errors, meta} on every response."""
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        body = client.get("/api/v1/dashboard").json()
        assert body["success"] is False
        assert body["data"] is None
        assert body["message"]
        assert body["errors"] and body["errors"][0]["code"] == "not_implemented"
        assert "meta" in body


def test_request_id_is_echoed_and_honoured() -> None:
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        response = client.get("/api/v1/dashboard", headers={"X-Request-ID": "trace-xyz"})
        assert response.headers["X-Request-ID"] == "trace-xyz"
        assert response.json()["meta"]["requestId"] == "trace-xyz"


def test_out_of_range_pagination_is_422_not_500() -> None:
    """Regression: the bound lives on the Query, not only on the model.

    A model-only constraint raises inside the dependency and surfaces as a 500.
    """
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        assert client.get("/api/v1/vendors?page=0").status_code == 422
        assert client.get("/api/v1/vendors?pageSize=9999").status_code == 422


def test_unknown_route_uses_the_error_envelope() -> None:
    """Regression: framework 404s must not bypass the envelope."""
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        response = client.get("/api/v1/does-not-exist")
        assert response.status_code == 404
        body = response.json()
        assert body["success"] is False
        assert body["errors"][0]["code"] == "not_found"


def test_cors_allows_the_frontend_origin_only() -> None:
    with TestClient(create_app()) as client:
        allowed = client.options(
            "/api/v1/vendors",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"

        refused = client.get("/health", headers={"Origin": "https://evil.example.com"})
        assert "access-control-allow-origin" not in refused.headers


def test_forbidden_gemini_key_never_leaves_the_api() -> None:
    """Spec §6.3: no response schema may carry a key value."""
    with TestClient(create_app()) as client:
        schema = client.get("/openapi.json").json()
    key_out = schema["components"]["schemas"]["GeminiKeyOut"]["properties"]
    assert "apiKey" not in key_out
    assert "encryptedKey" not in key_out
    assert "maskedKey" in key_out
