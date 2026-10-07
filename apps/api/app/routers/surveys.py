from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.integrations.venture_service import (
    VentureServiceClient,
    VentureServiceError,
)
from app.settings import settings

router = APIRouter(prefix="/api/v1/surveys", tags=["surveys"])


@router.get("/{survey_number}")
def get_survey(
    survey_number: str,
    village_id: str = Query(..., description="Maharashtra village identifier"),
) -> dict:
    """
    Return the normalized survey-level payload used by the Land Intelligence UI.

    The village/survey identifiers are translated into the legacy service's
    survey_number_id internally. The frontend never needs to know that legacy
    identifier format.
    """
    survey_number_id = f"{survey_number}_{village_id}"
    client = VentureServiceClient(settings.venture_service_base_url)

    try:
        payload = client.get_survey_data(survey_number_id)
    except VentureServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        **payload,
        "meta": {
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "adapter": "venture-flask-service",
            "survey_number_id": survey_number_id,
        },
    }
