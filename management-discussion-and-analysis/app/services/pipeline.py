"""
MD&A extraction pipeline — orchestrates the full flow from images/PDF
through OCR, section detection, block segmentation, Gemini formatting,
and MongoDB persistence.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image

from app.db.mongo import get_mda_collection
from app.services.pdf_to_images import pdf_to_images, load_images_from_dir
from app.services.ocr import ocr_pages
from app.services.mda_detector import detect_mda_pages, filter_mda_pages
from app.services.mda_parser_rules import (
    segment_into_blocks,
    rule_based_structured_fields,
)
from app.services.mda_formatter_gemini import format_with_gemini
from app.services.confidence import compute_overall_confidence

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────
# Path helpers
# ────────────────────────────────────────────────────────────────

def _build_input_path(sector: str, company: str, year: int) -> str:
    return f"data/md&a_extractor/{sector}/{company}/{year}"


def _build_output_path(sector: str, company: str, year: int) -> str:
    return f"/output/{sector}/{company}/{year}/json"


# ────────────────────────────────────────────────────────────────
# Core pipeline
# ────────────────────────────────────────────────────────────────

def run_pipeline(
    *,
    images: list[Image.Image],
    source_file_name: str | None = None,
    sector: str | None = None,
    company: str | None = None,
    year: int | None = None,
    page_from: int | None = None,
    page_to: int | None = None,
    input_path: str | None = None,
) -> dict:
    """
    Execute the full MD&A extraction pipeline and save to MongoDB.

    Returns the saved MongoDB document (as dict).
    """
    col = get_mda_collection()

    # ── 0. Create initial DB record (status=Processing) ────────
    now = datetime.now(timezone.utc)
    output_path = (
        _build_output_path(sector, company, year)
        if sector and company and year
        else None
    )
    if input_path is None and sector and company and year:
        input_path = _build_input_path(sector, company, year)

    doc_id = str(uuid.uuid4())
    doc: dict[str, Any] = {
        "_id": doc_id,
        "sector": sector,
        "company": company,
        "year": year,
        "input_path": input_path,
        "output_path": output_path,
        "source_file_name": source_file_name,
        "page_start": None,
        "page_end": None,
        "raw_text_by_page": [],
        "raw_blocks": [],
        "structured_fields": {},
        "overall_confidence": 0.0,
        "status": "Processing",
        "error_message": None,
        "created_at": now,
        "updated_at": now,
    }
    col.insert_one(doc)

    try:
        # ── 1. OCR all pages ───────────────────────────────────
        page_offset = (page_from - 1) if page_from else 0
        raw_text_by_page = ocr_pages(images, page_offset=page_offset)

        if not raw_text_by_page or all(
            not p["text"].strip() for p in raw_text_by_page
        ):
            raise ValueError("OCR produced no readable text from the input.")

        # ── 2. Detect MD&A page range ──────────────────────────
        start_page, end_page = detect_mda_pages(raw_text_by_page)

        if start_page is None:
            # Could not detect heading — use all pages
            logger.warning("MD&A heading not detected; using all input pages.")
            start_page = raw_text_by_page[0]["page_number"]
            end_page = raw_text_by_page[-1]["page_number"]

        mda_pages = filter_mda_pages(raw_text_by_page, start_page, end_page)

        # ── 3. Block segmentation & tagging ────────────────────
        raw_blocks = segment_into_blocks(mda_pages)

        # ── 4. Gemini formatting (with fallback) ───────────────
        mda_text = "\n\n".join(p["text"] for p in mda_pages)
        gemini_result, gemini_warnings = format_with_gemini(mda_text, raw_blocks)

        if gemini_result is not None:
            structured = gemini_result
            structured.setdefault("warnings", []).extend(gemini_warnings)
        else:
            structured = rule_based_structured_fields(
                raw_blocks, warnings=gemini_warnings
            )

        # ── 5. Compute confidence ──────────────────────────────
        overall_conf = compute_overall_confidence(mda_pages)

        # ── 6. Fill metadata ───────────────────────────────────
        extracted_at = datetime.now(timezone.utc).isoformat()
        structured["metadata"] = {
            "sector": sector,
            "company": company,
            "year": year,
            "source_file_name": source_file_name,
            "page_start": start_page,
            "page_end": end_page,
            "input_path": input_path,
            "output_path": output_path,
            "extracted_at": extracted_at,
            "overall_confidence": overall_conf,
        }

        # ── 7. Update DB record ────────────────────────────────
        col.update_one(
            {"_id": doc_id},
            {
                "$set": {
                    "page_start": start_page,
                    "page_end": end_page,
                    "raw_text_by_page": raw_text_by_page,
                    "raw_blocks": raw_blocks,
                    "structured_fields": structured,
                    "overall_confidence": overall_conf,
                    "status": "Done",
                    "error_message": None,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        return col.find_one({"_id": doc_id})

    except Exception as exc:
        logger.exception("Pipeline failed for doc %s", doc_id)
        col.update_one(
            {"_id": doc_id},
            {
                "$set": {
                    "status": "Error",
                    "error_message": str(exc),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        raise


# ────────────────────────────────────────────────────────────────
# High-level entry points
# ────────────────────────────────────────────────────────────────

def extract_from_images(
    pil_images: list[Image.Image],
    *,
    source_file_name: str | None = None,
    sector: str | None = None,
    company: str | None = None,
    year: int | None = None,
    page_from: int | None = None,
    page_to: int | None = None,
) -> dict:
    """Pipeline entry point when caller already has PIL images."""
    return run_pipeline(
        images=pil_images,
        source_file_name=source_file_name,
        sector=sector,
        company=company,
        year=year,
        page_from=page_from,
        page_to=page_to,
    )


def extract_from_pdf_bytes(
    pdf_bytes: bytes,
    *,
    filename: str = "upload.pdf",
    sector: str | None = None,
    company: str | None = None,
    year: int | None = None,
    page_from: int | None = None,
    page_to: int | None = None,
) -> dict:
    """Pipeline entry point for an uploaded PDF (raw bytes)."""
    import tempfile, os

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        images = pdf_to_images(tmp_path, page_from=page_from, page_to=page_to)
    finally:
        os.unlink(tmp_path)

    return run_pipeline(
        images=images,
        source_file_name=filename,
        sector=sector,
        company=company,
        year=year,
        page_from=page_from,
        page_to=page_to,
    )


def extract_by_path(
    sector: str,
    company: str,
    year: int,
    *,
    page_from: int | None = None,
    page_to: int | None = None,
    base_dir: Path | None = None,
) -> dict:
    """
    Pipeline entry point for path-based ingestion.
    Reads files from data/md&a_extractor/<sector>/<company>/<year>/
    """
    from app.core.config import settings as _settings

    root = base_dir or _settings.DATA_DIR
    folder = root / sector / company / str(year)

    if not folder.exists():
        raise FileNotFoundError(
            f"Input directory does not exist: {folder}"
        )

    # Prefer PDF
    pdfs = list(folder.glob("*.pdf"))
    source_file_name: str | None = None

    if pdfs:
        pdf_path = pdfs[0]
        source_file_name = pdf_path.name
        images = pdf_to_images(pdf_path, page_from=page_from, page_to=page_to)
    else:
        images_dir = folder / "images"
        if not images_dir.exists():
            images_dir = folder  # images may be directly in the folder
        images = load_images_from_dir(images_dir, page_from=page_from, page_to=page_to)
        source_file_name = f"{len(images)} image(s) from {folder.name}/"

    input_path = _build_input_path(sector, company, year)

    return run_pipeline(
        images=images,
        source_file_name=source_file_name,
        sector=sector,
        company=company,
        year=year,
        page_from=page_from,
        page_to=page_to,
        input_path=input_path,
    )
