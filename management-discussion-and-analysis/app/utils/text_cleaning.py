"""
Text-cleaning utilities for OCR output.
"""

import re


def fix_hyphenation(text: str) -> str:
    """Re-join words split across lines by a hyphen."""
    return re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)


def normalize_whitespace(text: str) -> str:
    """Collapse multiple spaces / tabs into single spaces, strip edges."""
    text = text.replace("\t", " ")
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_ocr_text(text: str) -> str:
    """Full cleaning pipeline for a single page of OCR text."""
    text = fix_hyphenation(text)
    text = normalize_whitespace(text)
    # Remove stray non-printable chars (keep newlines)
    text = re.sub(r"[^\S\n]+", " ", text)
    return text.strip()
