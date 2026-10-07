# Architecture

Government GIS/API -> integration adapter -> raw source response -> normalizer -> PostgreSQL/PostGIS -> FastAPI -> React/TypeScript UI

Principles:
1. Government responses are not exposed directly to the frontend.
2. Raw source responses are retained for provenance and parser reprocessing.
3. Survey geometry is authoritative when supplied by the source.
4. Sub-survey attributes are separate from geometry.
5. Regulatory conclusions will use deterministic rule evaluation before AI interpretation.
6. Secrets stay in environment variables.
