"""
Confidence score helpers.
"""

from __future__ import annotations


def compute_overall_confidence(raw_text_by_page: list[dict]) -> float:
    """
    Average mean_confidence across all pages.
    Returns a float 0.0–100.0, rounded to 2 decimals.
    """
    if not raw_text_by_page:
        return 0.0

    total = sum(p.get("mean_confidence", 0.0) for p in raw_text_by_page)
    return round(total / len(raw_text_by_page), 2)
