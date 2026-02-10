"""
Gemini 2.0 Flash formatter — normalizes OCR-extracted MD&A text into
a strict JSON schema.  Falls back to rule-based extraction on failure.
"""

from __future__ import annotations

import json
import logging
import traceback

import google.generativeai as genai

from app.core.config import settings
from app.utils.json_validator import validate_structured_fields

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────
# Prompt template
# ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a financial-document structuring engine.
You will receive OCR-extracted text from the Management Discussion & Analysis
(MD&A) section of a company's annual report, together with pre-tagged paragraph
blocks.

Your task:
1. Read the text carefully.
2. Produce a STRICT JSON object matching the schema below.
3. Do NOT invent facts that are not in the input text.
4. If a field cannot be determined from the text, set it to null (for strings)
   or an empty array (for lists).
5. Add a short message to the "warnings" array for every field you could not
   confidently populate.
6. Output ONLY the JSON object — no markdown fences, no extra commentary.

Required JSON schema:
{
  "overall_performance_summary": "string|null",
  "revenue_profit_drivers": ["string", ...],
  "segment_analysis": [
    {
      "segment_name": "string",
      "performance_summary": "string|null",
      "drivers": ["string", ...],
      "challenges": ["string", ...]
    }
  ],
  "cost_efficiency_factors": ["string", ...],
  "macroeconomic_factors": ["string", ...],
  "liquidity_cashflow_commentary": "string|null",
  "key_risks": ["string", ...],
  "outlook_forward_looking": "string|null",
  "strategic_actions": ["string", ...],
  "warnings": ["string", ...]
}
"""


def _build_user_prompt(mda_text: str, blocks: list[dict]) -> str:
    """Compose the user message with OCR text and block summaries."""
    block_summaries = "\n".join(
        f"[Block {b['block_id']} | Page {b['page_number']} | "
        f"Type={b['tags']['type']} | Impact={b['tags']['impact']}]\n"
        f"{b['text'][:500]}"
        for b in blocks[:60]  # cap to avoid token overflow
    )

    return (
        "=== OCR TEXT (MD&A SECTION) ===\n"
        f"{mda_text[:12000]}\n\n"
        "=== PRE-TAGGED BLOCKS ===\n"
        f"{block_summaries}\n\n"
        "Produce the JSON now."
    )


# ────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────

def format_with_gemini(
    mda_text: str,
    blocks: list[dict],
) -> tuple[dict | None, list[str]]:
    """
    Call Gemini 2.0 Flash to structure the MD&A text.

    Returns:
        (structured_fields_partial, warnings)
        – structured_fields_partial  contains all schema keys EXCEPT metadata
          (metadata is filled by the pipeline).
        – If Gemini fails or returns invalid JSON, returns (None, warnings).
    """
    warnings: list[str] = []

    if not settings.GEMINI_API_KEY:
        warnings.append("GEMINI_API_KEY not set — skipping Gemini formatting.")
        return None, warnings

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        user_prompt = _build_user_prompt(mda_text, blocks)

        response = model.generate_content(
            [
                {"role": "user", "parts": [_SYSTEM_PROMPT + "\n\n" + user_prompt]},
            ],
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=4096,
            ),
        )

        raw_output = response.text.strip()

        # Strip markdown fences if Gemini adds them despite instructions
        if raw_output.startswith("```"):
            # Remove first line (```json) and last line (```)
            lines = raw_output.split("\n")
            raw_output = "\n".join(lines[1:-1]).strip()

        parsed: dict = json.loads(raw_output)

    except json.JSONDecodeError as exc:
        warnings.append(f"Gemini returned non-JSON output: {exc}")
        logger.warning("Gemini JSON parse error: %s", exc)
        return None, warnings

    except Exception as exc:
        warnings.append(f"Gemini API call failed: {exc}")
        logger.warning("Gemini call failed:\n%s", traceback.format_exc())
        return None, warnings

    # Validate against our schema (ignoring metadata which we add later)
    parsed.setdefault("metadata", {})
    is_valid, validation_errors = validate_structured_fields(parsed)
    if not is_valid:
        warnings.append(
            f"Gemini output failed schema validation: {validation_errors}"
        )
        logger.warning("Gemini schema validation errors: %s", validation_errors)
        return None, warnings

    # Remove metadata key (the pipeline fills it)
    parsed.pop("metadata", None)

    return parsed, warnings
