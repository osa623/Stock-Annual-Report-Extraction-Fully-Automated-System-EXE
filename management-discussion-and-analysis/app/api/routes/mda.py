"""
MD&A API routes.
"""

from __future__ import annotations

import io
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from pydantic import BaseModel
from PIL import Image
from bson import ObjectId

from app.db.mongo import get_mda_collection
from app.services.pipeline import (
    extract_from_pdf_bytes,
    extract_from_images,
    extract_by_path,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ────────────────────────────────────────────────────────────
# Request / response models
# ────────────────────────────────────────────────────────────

class ByPathRequest(BaseModel):
    sector: str
    company: str
    year: int
    page_from: Optional[int] = None
    page_to: Optional[int] = None


def _serialise(doc: dict) -> dict:
    """Make a MongoDB document JSON-serializable."""
    if doc is None:
        return {}
    doc = dict(doc)
    # ObjectId → str (only if _id is an ObjectId — ours uses uuid str)
    if isinstance(doc.get("_id"), ObjectId):
        doc["_id"] = str(doc["_id"])
    # datetime → ISO string
    for key in ("created_at", "updated_at"):
        if key in doc and hasattr(doc[key], "isoformat"):
            doc[key] = doc[key].isoformat()
    return doc


def _summary(doc: dict) -> dict:
    """Return the lightweight list-view projection."""
    d = _serialise(doc)
    return {
        "_id": d.get("_id"),
        "sector": d.get("sector"),
        "company": d.get("company"),
        "year": d.get("year"),
        "output_path": d.get("output_path"),
        "page_start": d.get("page_start"),
        "page_end": d.get("page_end"),
        "overall_confidence": d.get("overall_confidence"),
        "status": d.get("status"),
        "created_at": d.get("created_at"),
    }


# ────────────────────────────────────────────────────────────
# POST /api/extract/mda  — Upload mode
# ────────────────────────────────────────────────────────────

@router.post("/extract/mda")
async def extract_mda_upload(
    file: Optional[UploadFile] = File(None),
    images: Optional[list[UploadFile]] = File(None),
    sector: Optional[str] = Form(None),
    company: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    page_from: Optional[int] = Form(None),
    page_to: Optional[int] = Form(None),
):
    """
    Extract MD&A from an uploaded PDF or image files.
    """
    try:
        if file is not None:
            # PDF upload
            pdf_bytes = await file.read()
            doc = extract_from_pdf_bytes(
                pdf_bytes,
                filename=file.filename or "upload.pdf",
                sector=sector,
                company=company,
                year=year,
                page_from=page_from,
                page_to=page_to,
            )
        elif images:
            # Image uploads
            pil_images: list[Image.Image] = []
            for img_file in images:
                data = await img_file.read()
                pil_images.append(Image.open(io.BytesIO(data)).convert("RGB"))

            doc = extract_from_images(
                pil_images,
                source_file_name=f"{len(pil_images)} uploaded image(s)",
                sector=sector,
                company=company,
                year=year,
                page_from=page_from,
                page_to=page_to,
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Provide either 'file' (PDF) or 'images[]' (image files).",
            )

        return _serialise(doc)

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Extraction failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ────────────────────────────────────────────────────────────
# POST /api/extract/mda/by-path  — Path-based ingestion
# ────────────────────────────────────────────────────────────

@router.post("/extract/mda/by-path")
async def extract_mda_by_path(body: ByPathRequest):
    """
    Extract MD&A from files on disk at
    data/md&a_extractor/<sector>/<company>/<year>/
    """
    try:
        doc = extract_by_path(
            sector=body.sector,
            company=body.company,
            year=body.year,
            page_from=body.page_from,
            page_to=body.page_to,
        )
        return _serialise(doc)

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Path-based extraction failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ────────────────────────────────────────────────────────────
# GET /api/mda  — List / filter
# ────────────────────────────────────────────────────────────

@router.get("/mda")
async def list_mda_records(
    sector: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
):
    """
    Return a list view of MD&A extractions, optionally filtered.
    """
    query: dict = {}
    if sector:
        query["sector"] = sector
    if company:
        query["company"] = company
    if year:
        query["year"] = year

    col = get_mda_collection()
    cursor = col.find(
        query,
        {
            "sector": 1,
            "company": 1,
            "year": 1,
            "output_path": 1,
            "page_start": 1,
            "page_end": 1,
            "overall_confidence": 1,
            "status": 1,
            "created_at": 1,
        },
    ).sort("created_at", -1)

    return [_summary(doc) for doc in cursor]


# ────────────────────────────────────────────────────────────
# GET /api/mda/{id}  — Full record
# ────────────────────────────────────────────────────────────

@router.get("/mda/{record_id}")
async def get_mda_record(record_id: str):
    """
    Return the full MD&A extraction document by _id.
    """
    col = get_mda_collection()
    doc = col.find_one({"_id": record_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Record not found.")
    return _serialise(doc)
