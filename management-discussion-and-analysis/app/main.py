"""
FastAPI application — MD&A Extraction Service.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.mongo import ensure_indexes, ping
from app.api.routes.mda import router as mda_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Startup / shutdown events."""
    # ── Startup ────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("  MD&A Extraction Service starting …")
    logger.info("=" * 60)

    # Validate config
    warnings = settings.validate()
    for w in warnings:
        logger.warning("CONFIG  ⚠  %s", w)

    # Check MongoDB
    if ping():
        logger.info("MongoDB connected ✓")
        ensure_indexes()
        logger.info("MongoDB indexes ensured ✓")
    else:
        logger.error("MongoDB is NOT reachable — check MONGO_DB_URL in .env")

    yield

    # ── Shutdown ───────────────────────────────────────────
    logger.info("MD&A Extraction Service shutting down.")


app = FastAPI(
    title="MD&A Extraction Service",
    description="Extract Management Discussion & Analysis from annual reports.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────
app.include_router(mda_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "service": "MD&A Extraction Service",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    mongo_ok = ping()
    return {
        "status": "ok" if mongo_ok else "degraded",
        "mongodb": "connected" if mongo_ok else "unreachable",
    }
