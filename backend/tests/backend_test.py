"""Regression tests for cactus config, authentication, product upload/list/search/sort/files/delete APIs."""
import base64
import os
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")

# Valid 1x1 JPEG used for multipart object-storage coverage.
JPEG_BYTES = base64.b64decode(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q=="
)


@pytest.fixture(scope="session")
def credentials():
    path = Path("/app/memory/test_credentials.md")
    if not path.exists():
        pytest.skip("Missing /app/memory/test_credentials.md")
    content = path.read_text(encoding="utf-8")
    if "`admin`" not in content or "`admin123`" not in content:
        pytest.skip("Admin credentials are unusable")
    return {"username": "admin", "password": "admin123"}


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    yield session
    session.close()


@pytest.fixture(scope="session")
def auth_token(api_client, credentials):
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=credentials, timeout=30)
    if response.status_code != 200:
        pytest.fail(f"Authentication failed: {response.status_code} {response.text[:500]}")
    data = response.json()
    token = data.get("token")
    if not isinstance(token, str) or not token:
        pytest.fail("Authentication response did not contain a token")
    return token


@pytest.fixture(scope="session")
def created_products():
    return []


@pytest.fixture(scope="session", autouse=True)
def cleanup(api_client, auth_token, created_products):
    yield
    headers = {"Authorization": f"Bearer {auth_token}"}
    for product in created_products:
        api_client.delete(f"{BASE_URL}/api/products/{product['id']}", headers=headers, timeout=30)


def upload_product(api_client, auth_token, name, price, badge=None):
    data = {"name": name, "price": str(price)}
    if badge:
        data["badge"] = badge
    return api_client.post(
        f"{BASE_URL}/api/products",
        headers={"Authorization": f"Bearer {auth_token}"},
        data=data,
        files={"image": ("test.jpg", JPEG_BYTES, "image/jpeg")},
        timeout=120,
    )


class TestCactusAPI:
    """Config, auth, validation, upload persistence, sorting, files, and deletion."""

    def test_01_config(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/config", timeout=30)
        assert response.status_code == 200
        assert response.json() == {
            "app_name": "cactus",
            "whatsapp_number": "+584149694047",
            "instagram_enabled": False,
        }

    def test_02_initial_products_empty(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/products", timeout=30)
        assert response.status_code == 200
        assert response.json() == []

    def test_03_login_wrong_credentials(self, api_client):
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "wrong", "password": "wrong"},
            timeout=30,
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Credenciales incorrectas"

    def test_04_login_success(self, api_client, credentials):
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=credentials, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert data["user"] == "admin"
        assert isinstance(data["token"], str) and data["token"]

    def test_05_create_requires_token(self, api_client):
        response = api_client.post(
            f"{BASE_URL}/api/products",
            data={"name": "TEST_Unauthorized", "price": "10"},
            files={"image": ("test.jpg", JPEG_BYTES, "image/jpeg")},
            timeout=30,
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Missing bearer token"

    def test_06_create_rejects_missing_name_field(self, api_client, auth_token):
        response = api_client.post(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={"price": "10"},
            files={"image": ("test.jpg", JPEG_BYTES, "image/jpeg")},
            timeout=30,
        )
        assert response.status_code == 400
        assert "nombre" in response.json()["detail"].lower()

    @pytest.mark.parametrize(
        ("name", "price", "expected_detail"),
        [("   ", "10", "El nombre es obligatorio"), ("TEST_Invalid Price", "0", "El precio debe ser mayor a 0")],
    )
    def test_07_create_validates_name_and_price(self, api_client, auth_token, name, price, expected_detail):
        response = api_client.post(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={"name": name, "price": price},
            files={"image": ("test.jpg", JPEG_BYTES, "image/jpeg")},
            timeout=30,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == expected_detail

    def test_08_create_rejects_invalid_image_content_type(self, api_client, auth_token):
        response = api_client.post(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={"name": "TEST_Invalid Image", "price": "10"},
            files={"image": ("test.txt", b"not an image", "text/plain")},
            timeout=30,
        )
        assert response.status_code == 400
        assert "Formato de imagen no permitido" in response.json()["detail"]

    def test_09_create_and_search_product(self, api_client, auth_token, created_products):
        response = upload_product(api_client, auth_token, "TEST_Cactus Aurora", 17.25, "nuevo")
        assert response.status_code == 200, response.text
        product = response.json()
        created_products.append(product)
        assert isinstance(product["id"], str) and product["id"]
        assert product["code"].startswith("CTS-")
        assert product["name"] == "TEST_Cactus Aurora"
        assert product["price"] == 17.25
        assert isinstance(product["image_path"], str) and product["image_path"]
        assert product["badge"] == "nuevo"
        assert product["instagram_status"] == "skipped"

        listed = api_client.get(f"{BASE_URL}/api/products", timeout=30)
        assert listed.status_code == 200
        match = next(item for item in listed.json() if item["id"] == product["id"])
        assert match["name"] == product["name"]
        assert match["instagram_status"] == "skipped"

        searched = api_client.get(f"{BASE_URL}/api/products", params={"q": "Aurora"}, timeout=30)
        assert searched.status_code == 200
        assert [item["id"] for item in searched.json()] == [product["id"]]

    def test_10_sort_prices(self, api_client, auth_token, created_products):
        low_response = upload_product(api_client, auth_token, "TEST_Cactus Low", 5.5, "oferta")
        high_response = upload_product(api_client, auth_token, "TEST_Cactus High", 42.0)
        assert low_response.status_code == 200, low_response.text
        assert high_response.status_code == 200, high_response.text
        low, high = low_response.json(), high_response.json()
        created_products.extend([low, high])

        ascending = api_client.get(f"{BASE_URL}/api/products", params={"sort": "price_asc"}, timeout=30)
        descending = api_client.get(f"{BASE_URL}/api/products", params={"sort": "price_desc"}, timeout=30)
        assert ascending.status_code == descending.status_code == 200
        asc_prices = [item["price"] for item in ascending.json()]
        desc_prices = [item["price"] for item in descending.json()]
        assert asc_prices == sorted(asc_prices)
        assert desc_prices == sorted(desc_prices, reverse=True)
        assert asc_prices[0] == 5.5 and desc_prices[0] == 42.0

    def test_11_product_file_is_public_image(self, api_client, created_products):
        product = created_products[0]
        response = api_client.get(f"{BASE_URL}/api/files/{product['image_path']}", timeout=60)
        assert response.status_code == 200
        assert response.headers["Content-Type"].startswith("image/jpeg")
        assert response.content == JPEG_BYTES

    def test_12_delete_auth_and_persistence(self, api_client, auth_token, created_products):
        product = created_products.pop()
        unauthorized = api_client.delete(f"{BASE_URL}/api/products/{product['id']}", timeout=30)
        assert unauthorized.status_code == 401
        assert unauthorized.json()["detail"] == "Missing bearer token"

        deleted = api_client.delete(
            f"{BASE_URL}/api/products/{product['id']}",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=30,
        )
        assert deleted.status_code == 200
        assert deleted.json() == {"deleted": True}
        listed = api_client.get(f"{BASE_URL}/api/products", timeout=30)
        assert listed.status_code == 200
        assert product["id"] not in [item["id"] for item in listed.json()]
