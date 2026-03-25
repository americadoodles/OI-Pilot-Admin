"""OA-Admin Backend — FastAPI application."""

import logging
import os
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.auth import hash_password
from app.core.db import SessionLocal, get_db_session, init_db
from app.models.admin_models import Dealer
from app.routers import auth, compliance, consignment, dealers, financing, stats

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

ADMIN_EMAIL = "admin@opulent.ai"
ADMIN_PASSWORD = "admin1234"


async def _seed_admin() -> None:
    """Create the default admin user if it does not exist."""
    try:
        async with SessionLocal() as session:
            result = await session.execute(
                select(Dealer).where(Dealer.email == ADMIN_EMAIL)
            )
            if result.scalar_one_or_none() is None:
                admin = Dealer(
                    email=ADMIN_EMAIL,
                    hashed_password=hash_password(ADMIN_PASSWORD),
                    business_name="Opulent Admin",
                    contact_name="Platform Admin",
                    role="admin",
                    compliance_status="active",
                    is_active=True,
                )
                session.add(admin)
                await session.commit()
                logger.info("Seeded admin user: %s", ADMIN_EMAIL)
            else:
                logger.info("Admin user already exists: %s", ADMIN_EMAIL)
    except Exception as exc:
        logger.warning("Could not seed admin user: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting OA-Admin backend...")
    await init_db()
    await _seed_admin()
    yield
    logger.info("Shutting down OA-Admin backend.")


app = FastAPI(
    title="Opulent Admin API",
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS ---
allowed_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3001").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request logging middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = (time.time() - start) * 1000
    logger.info(
        "%s %s -> %s (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


# --- Routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(dealers.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(consignment.router, prefix="/api")
app.include_router(financing.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")


# --- Health ---
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "oa-admin"}
