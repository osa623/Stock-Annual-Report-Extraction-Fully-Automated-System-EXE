"""
JSON schema validator for the structured_fields output from Gemini.
"""

from typing import Any

# Required top-level keys in structured_fields
_REQUIRED_KEYS = {
    "metadata",
    "overall_performance_summary",
    "revenue_profit_drivers",
    "segment_analysis",
    "cost_efficiency_factors",
    "macroeconomic_factors",
    "liquidity_cashflow_commentary",
    "key_risks",
    "outlook_forward_looking",
    "strategic_actions",
    "warnings",
}

_METADATA_KEYS = {
    "sector",
    "company",
    "year",
    "source_file_name",
    "page_start",
    "page_end",
    "input_path",
    "output_path",
    "extracted_at",
    "overall_confidence",
}


def validate_structured_fields(data: Any) -> tuple[bool, list[str]]:
    """
    Validate the structured_fields JSON object.
    Returns (is_valid, list_of_errors).
    """
    errors: list[str] = []

    if not isinstance(data, dict):
        return False, ["structured_fields must be a JSON object"]

    missing = _REQUIRED_KEYS - set(data.keys())
    if missing:
        errors.append(f"Missing top-level keys: {sorted(missing)}")

    # Validate metadata sub-object
    meta = data.get("metadata")
    if meta is not None:
        if not isinstance(meta, dict):
            errors.append("metadata must be a JSON object")
        else:
            meta_missing = _METADATA_KEYS - set(meta.keys())
            if meta_missing:
                errors.append(f"Missing metadata keys: {sorted(meta_missing)}")

    # Validate list fields
    list_fields = [
        "revenue_profit_drivers",
        "cost_efficiency_factors",
        "macroeconomic_factors",
        "key_risks",
        "strategic_actions",
        "warnings",
    ]
    for field in list_fields:
        val = data.get(field)
        if val is not None and not isinstance(val, list):
            errors.append(f"{field} must be a list or null")

    # Validate segment_analysis
    seg = data.get("segment_analysis")
    if seg is not None:
        if not isinstance(seg, list):
            errors.append("segment_analysis must be a list or null")
        else:
            for i, item in enumerate(seg):
                if not isinstance(item, dict):
                    errors.append(f"segment_analysis[{i}] must be an object")
                elif "segment_name" not in item:
                    errors.append(
                        f"segment_analysis[{i}] missing 'segment_name'"
                    )

    return len(errors) == 0, errors
