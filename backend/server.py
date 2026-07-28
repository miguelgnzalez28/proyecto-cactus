"""Cactus catalog - FastAPI backend."""
import os
import uuid
import logging
import secrets
import string
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

import jwt
import requests
from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Header,
    Response,
    Query,
    Request,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# ---------------------- setup ----------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("cactus")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
APP_NAME = os.environ.get("APP_NAME", "cactus")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "12"))
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

INSTAGRAM_USER_ID = os.environ.get("INSTAGRAM_USER_ID", "").strip()
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "").strip()
META_GRAPH_VERSION = os.environ.get("META_GRAPH_VERSION", "v25.0")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
products_col = db.products

app = FastAPI(title="Cactus Catalog API")
api = APIRouter(prefix="/api")

# ---------------------- object storage helper ----------------------
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    """Init emergent object storage; returns storage_key or None on failure."""
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY not set - object storage disabled")
        return None
    try:
        r = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_LLM_KEY},
            timeout=30,
        )
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        logger.info("Object storage initialised")
        return _storage_key
    except Exception as exc:
        logger.error("Storage init failed: %s", exc)
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Object storage unavailable")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if r.status_code == 403:
        # refresh key once
        global _storage_key
        _storage_key = None
        key = init_storage()
        r = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(500, "Object storage unavailable")
    r = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if r.status_code == 404:
        raise HTTPException(404, "File not found")
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------------------- models ----------------------
class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    user: str


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    price: float
    image_path: str  # storage path
    badge: Optional[str] = None  # nuevo | oferta | agotado | None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    instagram_status: str = "pending"  # pending|published|failed|skipped
    instagram_media_id: Optional[str] = None
    instagram_error: Optional[str] = None


# ---------------------- auth ----------------------
def make_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("sub") != ADMIN_USER:
        raise HTTPException(403, "Forbidden")
    return payload["sub"]


@api.post("/auth/login", response_model=LoginOut)
async def login(body: LoginIn):
    if body.username.strip() != ADMIN_USER or body.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Credenciales incorrectas")
    return LoginOut(token=make_token(ADMIN_USER), user=ADMIN_USER)


@api.get("/auth/me")
async def me(user: str = Depends(require_admin)):
    return {"user": user}


# ---------------------- instagram publish ----------------------
def publish_to_instagram(product_id: str, public_image_url: str, caption: str):
    """Runs in background. Only posts if creds available."""
    if not (INSTAGRAM_USER_ID and META_ACCESS_TOKEN):
        logger.info("Instagram creds missing - skipping publish for %s", product_id)
        _sync_update_product(product_id, {"instagram_status": "skipped"})
        return
    base = f"https://graph.facebook.com/{META_GRAPH_VERSION}"
    try:
        r1 = requests.post(
            f"{base}/{INSTAGRAM_USER_ID}/media",
            data={"image_url": public_image_url, "caption": caption, "access_token": META_ACCESS_TOKEN},
            timeout=30,
        )
        if r1.status_code >= 400:
            _sync_update_product(product_id, {"instagram_status": "failed", "instagram_error": r1.text[:500]})
            return
        creation_id = r1.json().get("id")
        r2 = requests.post(
            f"{base}/{INSTAGRAM_USER_ID}/media_publish",
            data={"creation_id": creation_id, "access_token": META_ACCESS_TOKEN},
            timeout=30,
        )
        if r2.status_code >= 400:
            _sync_update_product(
                product_id,
                {"instagram_status": "failed", "instagram_error": r2.text[:500]},
            )
            return
        _sync_update_product(
            product_id,
            {"instagram_status": "published", "instagram_media_id": r2.json().get("id"), "instagram_error": None},
        )
    except Exception as exc:
        logger.exception("Instagram publish failed")
        _sync_update_product(product_id, {"instagram_status": "failed", "instagram_error": str(exc)[:500]})


def _sync_update_product(product_id: str, updates: dict):
    """Blocking mongo update via pymongo (for background threads)."""
    from pymongo import MongoClient
    with MongoClient(MONGO_URL) as mc:
        mc[DB_NAME].products.update_one({"id": product_id}, {"$set": updates})


# ---------------------- product helpers ----------------------
def gen_code() -> str:
    return "CTS-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


ALLOWED_BADGES = {"nuevo", "oferta", "agotado"}
ALLOWED_MIME = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}


# ---------------------- routes ----------------------
@api.get("/")
async def root():
    return {"message": "Cactus catalog api", "app": APP_NAME}


@api.get("/config")
async def public_config():
    return {
        "app_name": APP_NAME,
        "whatsapp_number": os.environ.get("WHATSAPP_NUMBER", ""),
        "instagram_enabled": bool(INSTAGRAM_USER_ID and META_ACCESS_TOKEN),
    }


@api.get("/products")
async def list_products(
    q: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),  # price_asc | price_desc | newest
):
    filt = {}
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}},
        ]
    cursor = products_col.find(filt, {"_id": 0})
    if sort == "price_asc":
        cursor = cursor.sort("price", 1)
    elif sort == "price_desc":
        cursor = cursor.sort("price", -1)
    else:
        cursor = cursor.sort("created_at", -1)
    docs = await cursor.to_list(500)
    return docs


@api.post("/products")
async def create_product(
    background: BackgroundTasks,
    name: str = Form(...),
    price: float = Form(...),
    badge: Optional[str] = Form(None),
    image: UploadFile = File(...),
    user: str = Depends(require_admin),
):
    name = name.strip()
    if not name:
        raise HTTPException(400, "El nombre es obligatorio")
    if price <= 0:
        raise HTTPException(400, "El precio debe ser mayor a 0")
    if image.content_type not in ALLOWED_MIME:
        raise HTTPException(400, "Formato de imagen no permitido (usa JPG, PNG, WEBP o GIF)")
    data = await image.read()
    if len(data) == 0:
        raise HTTPException(400, "Imagen vacía")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "Imagen mayor a 10MB")

    if badge:
        badge = badge.lower().strip()
        if badge not in ALLOWED_BADGES:
            raise HTTPException(400, "Badge inválido")
    else:
        badge = None

    ext = ALLOWED_MIME[image.content_type]
    path = f"{APP_NAME}/products/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, image.content_type)

    ig_ready = bool(INSTAGRAM_USER_ID and META_ACCESS_TOKEN)
    base_url = os.environ.get("PUBLIC_BASE_URL") or ""
    initial_status = "pending" if (ig_ready and base_url) else "skipped"

    product = Product(
        code=gen_code(),
        name=name,
        price=price,
        image_path=result["path"],
        badge=badge,
        instagram_status=initial_status,
    )
    await products_col.insert_one(product.model_dump())

    caption = f"🌵 {product.name}\nCódigo: {product.code}\nPrecio: ${product.price:.2f}\n\n#cactus #catalogo"
    if ig_ready and base_url:
        image_public_url = f"{base_url.rstrip('/')}/api/files/{result['path']}"
        background.add_task(publish_to_instagram, product.id, image_public_url, caption)

    return product.model_dump()


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user: str = Depends(require_admin)):
    res = await products_col.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Producto no encontrado")
    return {"deleted": True}


@api.get("/files/{path:path}")
async def download_file(path: str):
    """Public read endpoint - product images are public in a catalog."""
    data, ct = get_object(path)
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=3600"})


# ---------------------- app assembly ----------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Normalise missing required form/body fields to a 400 response."""
    errors = exc.errors()
    if request.url.path == "/api/products" and request.method == "POST":
        missing = [".".join(str(x) for x in e["loc"][1:]) for e in errors if e.get("type") == "missing"]
        if missing:
            return JSONResponse(
                status_code=400,
                content={"detail": f"Campos requeridos faltantes: {', '.join(missing)}"},
            )
    return JSONResponse(status_code=422, content={"detail": errors})


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    init_storage()
    await products_col.create_index("id", unique=True)
    await products_col.create_index("code")
    await products_col.create_index("created_at")
    logger.info("Cactus API ready. Admin user: %s | IG enabled: %s", ADMIN_USER, bool(INSTAGRAM_USER_ID and META_ACCESS_TOKEN))


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
