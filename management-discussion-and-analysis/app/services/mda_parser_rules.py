"""
Rule-based MD&A block segmentation and tagging.
"""

from __future__ import annotations

import re
from rapidfuzz import fuzz

# ────────────────────────────────────────────────────────────
# Keyword lists for rule-based tagging
# ────────────────────────────────────────────────────────────

_PERFORMANCE_KW = [
    "revenue", "profit", "earnings", "growth", "turnover", "margin",
    "performance", "sales", "income", "return on",
]
_RISK_KW = [
    "risk", "uncertainty", "challenge", "threat", "volatility",
    "adverse", "exposure", "downturn",
]
_STRATEGY_KW = [
    "strategy", "strategic", "expansion", "initiative", "acquisition",
    "investment", "plan", "diversif", "innovation", "digital",
]
_COST_KW = [
    "cost", "expense", "efficiency", "saving", "reduction",
    "operational cost", "overhead",
]
_MACRO_KW = [
    "macro", "economic", "gdp", "inflation", "interest rate",
    "exchange rate", "global", "geopolitical", "pandemic",
    "government policy", "regulatory",
]
_LIQUIDITY_KW = [
    "liquidity", "cash flow", "cashflow", "borrowing", "debt",
    "capital", "working capital", "solvency", "funding",
]

_POSITIVE_KW = [
    "increase", "growth", "improve", "gain", "strong", "positive",
    "upward", "exceeded", "surpass", "record",
]
_NEGATIVE_KW = [
    "decrease", "decline", "loss", "drop", "weak", "negative",
    "adverse", "downturn", "shortfall", "impairment",
]

_INCOME_KW = ["revenue", "profit", "income", "earnings", "turnover", "margin"]
_CASHFLOW_KW = ["cash flow", "cashflow", "liquidity", "operating cash"]
_BALANCE_KW = ["asset", "liability", "equity", "balance sheet", "financial position", "net worth"]


def _contains_any(text: str, keywords: list[str]) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)


def _classify_type(text: str) -> str:
    if _contains_any(text, _PERFORMANCE_KW):
        return "Performance"
    if _contains_any(text, _RISK_KW):
        return "Risk"
    if _contains_any(text, _STRATEGY_KW):
        return "Strategy"
    if _contains_any(text, _COST_KW):
        return "Cost"
    if _contains_any(text, _MACRO_KW):
        return "Macro"
    if _contains_any(text, _LIQUIDITY_KW):
        return "Liquidity"
    return "Other"


def _classify_impact(text: str) -> str:
    pos = sum(1 for kw in _POSITIVE_KW if kw in text.lower())
    neg = sum(1 for kw in _NEGATIVE_KW if kw in text.lower())
    if pos > neg:
        return "Positive"
    if neg > pos:
        return "Negative"
    return "Neutral"


def _classify_related_statement(text: str) -> str:
    if _contains_any(text, _CASHFLOW_KW):
        return "CashFlow"
    if _contains_any(text, _BALANCE_KW):
        return "BalanceSheet"
    if _contains_any(text, _INCOME_KW):
        return "Income"
    return "None"


# ────────────────────────────────────────────────────────────
# Block segmentation
# ────────────────────────────────────────────────────────────

def segment_into_blocks(mda_pages: list[dict]) -> list[dict]:
    """
    Split MD&A page texts into paragraph blocks and tag each.

    Args:
        mda_pages: List of {page_number, text, mean_confidence}.

    Returns:
        List of block dicts:
        [{ block_id, page_number, text, tags: { type, impact, related_statement } }]
    """
    blocks: list[dict] = []
    block_id = 0

    for page in mda_pages:
        page_num = page["page_number"]
        page_text = page.get("text", "")

        # Split on double-newline or single-newline followed by uppercase (heading)
        paragraphs = re.split(r"\n{2,}", page_text)

        for para in paragraphs:
            para = para.strip()
            if len(para) < 15:
                # Skip very short fragments / noise
                continue

            block_id += 1
            blocks.append(
                {
                    "block_id": block_id,
                    "page_number": page_num,
                    "text": para,
                    "tags": {
                        "type": _classify_type(para),
                        "impact": _classify_impact(para),
                        "related_statement": _classify_related_statement(para),
                    },
                }
            )

    return blocks


# ────────────────────────────────────────────────────────────
# Rule-based structured field extraction (fallback)
# ────────────────────────────────────────────────────────────

def rule_based_structured_fields(
    blocks: list[dict],
    warnings: list[str] | None = None,
) -> dict:
    """
    Build a partial structured_fields dict using only deterministic rules.
    Used as a fallback when Gemini is unavailable or returns invalid JSON.
    """
    if warnings is None:
        warnings = []

    performance_blocks = [b for b in blocks if b["tags"]["type"] == "Performance"]
    risk_blocks = [b for b in blocks if b["tags"]["type"] == "Risk"]
    strategy_blocks = [b for b in blocks if b["tags"]["type"] == "Strategy"]
    cost_blocks = [b for b in blocks if b["tags"]["type"] == "Cost"]
    macro_blocks = [b for b in blocks if b["tags"]["type"] == "Macro"]
    liquidity_blocks = [b for b in blocks if b["tags"]["type"] == "Liquidity"]

    def _first_text(bl: list[dict]) -> str | None:
        return bl[0]["text"] if bl else None

    def _texts(bl: list[dict]) -> list[str]:
        return [b["text"][:300] for b in bl]

    return {
        "metadata": {},  # caller fills this in
        "overall_performance_summary": _first_text(performance_blocks),
        "revenue_profit_drivers": _texts(performance_blocks)[:5],
        "segment_analysis": [],
        "cost_efficiency_factors": _texts(cost_blocks)[:5],
        "macroeconomic_factors": _texts(macro_blocks)[:5],
        "liquidity_cashflow_commentary": _first_text(liquidity_blocks),
        "key_risks": _texts(risk_blocks)[:5],
        "outlook_forward_looking": _first_text(strategy_blocks),
        "strategic_actions": _texts(strategy_blocks)[:5],
        "warnings": warnings + ["Extracted using rule-based fallback only."],
    }
