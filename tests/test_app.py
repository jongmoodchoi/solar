"""Tests for the Solar System Flask app."""

import pytest
from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client


def test_index_returns_200(client):
    """Simulation page should return 200 OK."""
    response = client.get("/")
    assert response.status_code == 200


def test_index_contains_canvas(client):
    """Simulation page must include the canvas container element."""
    response = client.get("/")
    assert b"canvas-container" in response.data


def test_index_contains_controls(client):
    """Simulation page must include the controls panel."""
    response = client.get("/")
    assert b"controls" in response.data
    assert b"datetime-local" in response.data


def test_history_returns_200(client):
    """History page should return 200 OK."""
    response = client.get("/history")
    assert response.status_code == 200


def test_history_contains_content(client):
    """History page must mention Copernicus and Kepler."""
    response = client.get("/history")
    assert b"Copernicus" in response.data
    assert b"Kepler" in response.data


def test_math_returns_200(client):
    """Math page should return 200 OK."""
    response = client.get("/math")
    assert response.status_code == 200


def test_math_contains_keplers_equation(client):
    """Math page must contain Kepler's equation explanation."""
    response = client.get("/math")
    assert b"Kepler" in response.data
    assert b"eccentric anomaly" in response.data or b"Eccentric anomaly" in response.data


def test_math_contains_orbital_elements(client):
    """Math page must explain orbital elements."""
    response = client.get("/math")
    assert b"Orbital Elements" in response.data or b"orbital elements" in response.data


def test_navigation_links(client):
    """All pages must contain navigation links to all other pages."""
    for path in ["/", "/history", "/math"]:
        response = client.get(path)
        assert b"/history" in response.data
        assert b"/math" in response.data
        assert b"/" in response.data


def test_static_css_served(client):
    """CSS stylesheet must be served."""
    response = client.get("/static/css/style.css")
    assert response.status_code == 200
    assert b"nav" in response.data


def test_static_js_served(client):
    """JavaScript simulation file must be served."""
    response = client.get("/static/js/simulation.js")
    assert response.status_code == 200
    assert b"Kepler" in response.data


def test_unknown_route_returns_404(client):
    """Unknown routes should return 404."""
    response = client.get("/nonexistent")
    assert response.status_code == 404
