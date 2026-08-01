"""Normalised AI provider failures.

The rotation policy has to branch on *why* a call failed — a rate limit means
cool this key down and try the next one, a revoked key means disable it, a
malformed request means stop and surface the error. The SDK expresses those as
a mix of exception types, HTTP statuses and message strings, so they are
classified once here and nowhere else.

Nothing in this module ever carries a key value. Instances are logged.
"""

from __future__ import annotations

import re

# Substrings that identify a quota/rate failure when no status code is exposed.
_RATE_LIMIT_MARKERS = ("resource_exhausted", "rate limit", "quota", "too many requests")
_AUTH_MARKERS = (
    "api key not valid",
    "api_key_invalid",
    "permission_denied",
    "unauthenticated",
    "invalid authentication",
)
_TRANSIENT_MARKERS = (
    "deadline_exceeded",
    "unavailable",
    "internal error",
    "timeout",
    "connection reset",
)
_STATUS_PATTERN = re.compile(r"\b(4\d\d|5\d\d)\b")


class GeminiError(Exception):
    """A Gemini call that failed, classified for the rotation policy."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code

    @property
    def is_rate_limited(self) -> bool:
        if self.status_code == 429:
            return True
        return self._matches(_RATE_LIMIT_MARKERS)

    @property
    def is_auth_failure(self) -> bool:
        if self.status_code in (401, 403):
            return True
        return self._matches(_AUTH_MARKERS)

    @property
    def is_transient(self) -> bool:
        """Worth retrying — on this key or the next one."""
        if self.status_code is not None and self.status_code >= 500:
            return True
        return self.is_rate_limited or self._matches(_TRANSIENT_MARKERS)

    @property
    def is_client_error(self) -> bool:
        """The request itself is wrong; rotating keys cannot fix it.

        Retrying a malformed prompt across every key in the pool burns quota to
        produce the same error four times, so this stops rotation immediately.
        """
        if self.is_rate_limited or self.is_auth_failure:
            return False
        return self.status_code is not None and 400 <= self.status_code < 500

    def _matches(self, markers: tuple[str, ...]) -> bool:
        text = str(self).lower()
        return any(marker in text for marker in markers)

    def __repr__(self) -> str:  # pragma: no cover - diagnostics only
        return f"GeminiError(status_code={self.status_code}, message={str(self)!r})"


def classify(exc: BaseException) -> GeminiError:
    """Wrap any SDK or transport exception as a `GeminiError`.

    Reads a status code from whichever attribute the SDK exposes, falling back
    to scraping the message. Scraping is a last resort, but misclassifying a
    429 as a permanent failure would take a healthy key out of the pool, which
    is worse than a slightly fuzzy regex.
    """
    if isinstance(exc, GeminiError):
        return exc

    status: int | None = None
    for attribute in ("code", "status_code", "http_status"):
        value = getattr(exc, attribute, None)
        if isinstance(value, int) and 100 <= value <= 599:
            status = value
            break

    response = getattr(exc, "response", None)
    if status is None and response is not None:
        value = getattr(response, "status_code", None)
        if isinstance(value, int):
            status = value

    message = str(exc) or type(exc).__name__
    if status is None:
        match = _STATUS_PATTERN.search(message)
        if match:
            status = int(match.group(1))

    return GeminiError(f"{type(exc).__name__}: {message}", status_code=status)
