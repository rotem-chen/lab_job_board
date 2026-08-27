from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db 
# 1. Create a mock database session
mock_session = MagicMock()

# 2. Override the real database dependency with our mock
def override_get_db():
    yield mock_session

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# --- TESTS ---

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_create_job_valid():
    valid_data = {
        "title": "DevOps Engineer",
        "company": "Tech Corp",
        "description": "CI/CD and Kubernetes expert",
        "location": "Remote"
    }
    response = client.post("/jobs/", json=valid_data)
    assert response.status_code == 201

def test_create_job_missing_fields():
    invalid_data = {"title": "Backend Developer"} 
    response = client.post("/jobs/", json=invalid_data)
    assert response.status_code == 422

def test_get_job_not_found():
    mock_session.query.return_value.filter.return_value.first.return_value = None
    response = client.get("/jobs/9999")
    assert response.status_code == 404