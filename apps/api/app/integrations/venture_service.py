from __future__ import annotations

from typing import Any

import httpx


class VentureServiceError(RuntimeError):
    """Raised when the legacy government-data service cannot provide survey data."""


class VentureServiceClient:
    def __init__(self, base_url: str, timeout_seconds: float = 45.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_seconds)

    def get_survey_data(self, survey_number_id: str) -> dict[str, Any]:
        url = f"{self.base_url}/getSurveyData"

        try:
            response = httpx.get(
                url,
                params={"survey_number_id": survey_number_id},
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPStatusError as exc:
            raise VentureServiceError(
                f"Venture service returned HTTP {exc.response.status_code}"
            ) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise VentureServiceError(
                f"Unable to retrieve survey data from venture service: {exc}"
            ) from exc

        if not isinstance(payload, dict):
            raise VentureServiceError("Venture service returned an invalid payload")

        if payload.get("error"):
            raise VentureServiceError(str(payload["error"]))

        return payload
