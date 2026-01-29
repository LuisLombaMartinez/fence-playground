from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import Asset, Insight, HealthResponse
from app.services import get_assets, calculate_insights

app = FastAPI(title="Portfolio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="healthy", version="1.0.0")

@app.get("/assets", response_model=list[Asset])
def list_assets():
    return get_assets()

@app.get("/insights", response_model=list[Insight])
def list_insights():
    assets = get_assets()
    return calculate_insights(assets)
