"""
Simple API tests for demonstration purposes.
Run with: pytest
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test the health endpoint returns expected response."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"


def test_get_assets():
    """Test the assets endpoint returns a list of assets."""
    response = client.get("/assets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 20  # We generate 20 mock assets

    # Check first asset has expected structure
    asset = data[0]
    assert "id" in asset
    assert "nominal_value" in asset
    assert "status" in asset
    assert "due_date" in asset
    assert asset["status"] in ["active", "defaulted", "paid"]


def test_get_insights():
    """Test the insights endpoint returns portfolio metrics."""
    response = client.get("/insights")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 4  # We calculate 4 insights

    # Check we have the expected insights
    insight_names = [insight["name"] for insight in data]
    assert "total_portfolio_value" in insight_names
    assert "default_rate" in insight_names
    assert "outstanding_debt" in insight_names
    assert "collection_rate" in insight_names


def test_cors_headers():
    """Test CORS headers are present in responses."""
    response = client.get("/health")
    assert "access-control-allow-origin" in response.headers
