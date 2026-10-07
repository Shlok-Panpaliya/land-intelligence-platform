from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.settings import settings
from app.routers.surveys import router as surveys_router
from app.routers.locations import router as locations_router

app = FastAPI(title="Land Intelligence API", version="0.1.0", description="Survey-level land intelligence API for Maharashtra.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "land-intelligence-api"}

@app.get("/api/v1")
def api_root() -> dict[str, str]:
    return {"service": "land-intelligence-api", "version": "v1"}

app.include_router(surveys_router)
app.include_router(locations_router)
