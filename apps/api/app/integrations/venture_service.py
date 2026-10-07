from __future__ import annotations

from typing import Any

import httpx


class VentureServiceError(RuntimeError):
    """Raised when the legacy government-data service cannot provide survey data."""


class VentureServiceClient:
    def __init__(self, base_url: str, timeout_seconds: float = 45.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_seconds)

    def _get_json(self, path: str, params: dict[str, str] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        try:
            response = httpx.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            raise VentureServiceError(
                f"Venture service returned HTTP {exc.response.status_code} for {path}"
            ) from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise VentureServiceError(
                f"Unable to retrieve {path} from venture service: {exc}"
            ) from exc

    def get_districts(self) -> list[dict[str, Any]]:
        payload = self._get_json("/getDistricts")
        return payload if isinstance(payload, list) else []

    def get_talukas(self, district_id: str) -> list[dict[str, Any]]:
        payload = self._get_json("/getTalukas", {"district_id": district_id})
        return payload if isinstance(payload, list) else []

    def get_villages(self, taluka_id: str) -> list[dict[str, Any]]:
        payload = self._get_json("/getVillages", {"taluka_id": taluka_id})
        return payload if isinstance(payload, list) else []

    def get_survey_numbers(self, village_id: str) -> list[dict[str, Any]]:
        payload = self._get_json("/getSurveyNumbers", {"village_id": village_id})
        return payload if isinstance(payload, list) else []

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
