# Land Intelligence API

FastAPI backend for the survey-level MVP.

Run locally with uvicorn on port 8000.

Government GIS integration will be implemented as an adapter after the endpoint contract and authentication details are supplied.


## Survey API

The survey route is backed by the existing government-data acquisition service:

`GET /api/v1/surveys/{survey_number}?village_id={village_id}`

Example:

`GET /api/v1/surveys/10?village_id=270700090077070000`

The frontend does not call the legacy service directly.

The adapter expects the legacy service to expose:

`GET /getSurveyData?survey_number_id={survey_number}_{village_id}`

The normalized payload contains:

- survey identity and area
- authoritative survey-level GeoJSON geometry when supplied by Bhu-Nakasha
- survey bounding box
- sub-survey/land-record attributes
- owner aggregation
- explicit `sub_survey_geometry_available: false`
- source/provenance metadata

No sub-survey geometry is reconstructed or inferred.
