"""
OCR service — runs pytesseract on page images and computes confidence.
"""

from __future__ import annotations

import pytesseract
import pandas as pd
from PIL import Image

from app.utils.text_cleaning import clean_ocr_text


def ocr_page(image: Image.Image) -> tuple[str, float]:
    """
    Run OCR on a single page image.

    Returns:
        (cleaned_text, mean_confidence)  where confidence is 0.0–100.0
    """
    try:
        data = pytesseract.image_to_data(
            image, output_type=pytesseract.Output.DATAFRAME
        )
    except Exception as exc:
        raise RuntimeError(
            "pytesseract failed — is Tesseract-OCR installed and on PATH? "
            f"Error: {exc}"
        ) from exc

    # Filter to rows that have actual text
    data = data.dropna(subset=["text"])
    data = data[data["text"].str.strip().astype(bool)]

    if data.empty:
        return "", 0.0

    # Confidence: pytesseract gives -1 for low-confidence; treat as 0
    confs = data["conf"].apply(lambda c: max(float(c), 0.0))
    mean_conf = float(confs.mean()) if len(confs) > 0 else 0.0

    raw_text = pytesseract.image_to_string(image)
    cleaned = clean_ocr_text(raw_text)

    return cleaned, round(mean_conf, 2)


def ocr_pages(
    images: list[Image.Image],
    page_offset: int = 0,
) -> list[dict]:
    """
    OCR a list of page images.

    Args:
        images:       List of PIL Image objects.
        page_offset:  Offset to add to 0-based index for page_number.

    Returns:
        List of dicts: [{page_number, text, mean_confidence}, ...]
    """
    results: list[dict] = []
    for idx, img in enumerate(images):
        text, conf = ocr_page(img)
        results.append(
            {
                "page_number": idx + 1 + page_offset,
                "text": text,
                "mean_confidence": conf,
            }
        )
    return results
