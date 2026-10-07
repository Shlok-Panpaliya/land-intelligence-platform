from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.integrations.venture_service import VentureServiceClient, VentureServiceError
from app.settings import settings

router = APIRouter(prefix="/api/v1/locations", tags=["locations"])
client = VentureServiceClient(settings.venture_service_base_url)


def _call(fetcher):
    try:
        return fetcher()
    except VentureServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/districts")
def get_districts() -> list[dict]:
    return _call(client.get_districts)


@router.get("/talukas")
def get_talukas(district_id: str = Query(...)) -> list[dict]:
    return _call(lambda: client.get_talukas(district_id))


@router.get("/villages")
def get_villages(taluka_id: str = Query(...)) -> list[dict]:
    return _call(lambda: client.get_villages(taluka_id))


@router.get("/surveys")
def get_surveys(village_id: str = Query(...)) -> list[dict]:
    return _call(lambda: client.get_survey_numbers(village_id))
