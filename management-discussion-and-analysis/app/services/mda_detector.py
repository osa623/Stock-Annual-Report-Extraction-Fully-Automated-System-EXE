"""
Detect the start and end pages of the MD&A section using fuzzy heading matching.
"""

from __future__ import annotations

from rapidfuzz import fuzz

# ── Headings that signal the START of MD&A ──────────────────────────

_MDA_START_PATTERNS: list[str] = [
    "MANAGEMENT DISCUSSION AND ANALYSIS",
    "MANAGEMENT DISCUSSION & ANALYSIS",
    "MANAGEMENT'S DISCUSSION AND ANALYSIS",
    "MD&A",
    "MANAGEMENT DISCUSSION AND ANALYSIS (CONTD.)",
    "MANAGEMENT DISCUSSION & ANALYSIS (CONTD.)",
]

# ── Headings that signal the END of MD&A (next major section) ──────

_MDA_END_PATTERNS: list[str] = [
    "AWARDS",
    "CORPORATE GOVERNANCE",
    "RISK MANAGEMENT",
    "COMMITTEE REPORT",
    "INDEPENDENT AUDITORS REPORT",
    "INDEPENDENT AUDITOR'S REPORT",
    "STATEMENT OF PROFIT OR LOSS",
    "STATEMENT OF FINANCIAL POSITION",
    "FINANCIAL STATEMENTS",
    "DIRECTORS REPORT",
    "DIRECTOR'S REPORT",
    "BOARD OF DIRECTORS",
    "AUDIT COMMITTEE REPORT",
    "REMUNERATION COMMITTEE",
    "RELATED PARTY TRANSACTIONS",
    "NOTES TO THE FINANCIAL STATEMENTS",
    "STATEMENT OF CHANGES IN EQUITY",
    "CASH FLOW STATEMENT",
    "STATEMENT OF CASH FLOWS",
    "SUSTAINABILITY REPORT",
    "CHAIRMAN'S REVIEW",
    "MANAGING DIRECTOR'S REPORT",
    "VALUE ADDED STATEMENT",
    "TEN YEAR SUMMARY",
    "INVESTOR INFORMATION",
    "SHAREHOLDER INFORMATION",
]

_FUZZY_THRESHOLD = 80  # minimum score for a match


def _extract_heading_candidates(page_text: str) -> list[str]:
    """
    Heuristic: take the first 8 non-empty lines of a page as heading candidates.
    Also look for ALL-CAPS lines anywhere in the page.
    """
    lines = page_text.split("\n")
    candidates: list[str] = []

    # First few lines (likely heading area)
    count = 0
    for line in lines:
        stripped = line.strip()
        if stripped:
            candidates.append(stripped)
            count += 1
            if count >= 8:
                break

    # All-caps lines anywhere (section headings are often uppercase)
    for line in lines:
        stripped = line.strip()
        if stripped and stripped == stripped.upper() and len(stripped) > 4:
            candidates.append(stripped)

    return candidates


def _matches_any(
    candidates: list[str], patterns: list[str], threshold: int = _FUZZY_THRESHOLD
) -> bool:
    """Check if any candidate fuzzy-matches any pattern."""
    for cand in candidates:
        cand_upper = cand.upper()
        for pat in patterns:
            score = fuzz.partial_ratio(pat, cand_upper)
            if score >= threshold:
                return True
    return False


def detect_mda_pages(
    raw_text_by_page: list[dict],
) -> tuple[int | None, int | None]:
    """
    Detect the page range of the MD&A section.

    Args:
        raw_text_by_page:  List of {page_number, text, mean_confidence}.

    Returns:
        (start_page_number, end_page_number)  — both inclusive, or None.
    """
    start_page: int | None = None
    end_page: int | None = None

    for entry in raw_text_by_page:
        page_num = entry["page_number"]
        text = entry.get("text", "")
        candidates = _extract_heading_candidates(text)

        if start_page is None:
            if _matches_any(candidates, _MDA_START_PATTERNS):
                start_page = page_num
        else:
            # Already inside MD&A — look for the next section heading
            if _matches_any(candidates, _MDA_END_PATTERNS):
                # The end page is the PREVIOUS page (the heading itself
                # belongs to the next section)
                end_page = page_num - 1
                break

    # If we found a start but never found an end, use the last page
    if start_page is not None and end_page is None:
        end_page = raw_text_by_page[-1]["page_number"] if raw_text_by_page else start_page

    return start_page, end_page


def filter_mda_pages(
    raw_text_by_page: list[dict],
    start_page: int,
    end_page: int,
) -> list[dict]:
    """Return only the pages within [start_page, end_page] inclusive."""
    return [
        p
        for p in raw_text_by_page
        if start_page <= p["page_number"] <= end_page
    ]
