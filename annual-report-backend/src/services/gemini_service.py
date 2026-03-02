"""
Gemini 2.0 Financial Data Extraction Service

Extracts structured financial data from PDFs using separate API calls
for each statement type (Income Statement, Balance Sheet, Cash Flow)
to avoid token-limit truncation on large annual reports.
"""

import os
import re
import json
import time
import logging
from pathlib import Path
from dotenv import load_dotenv

import google.generativeai as genai

load_dotenv()
logger = logging.getLogger(__name__)

# ── Gemini Configuration ──────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.0-flash"

if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables!")
else:
    genai.configure(api_key=GEMINI_API_KEY)


# ── Per-statement prompts ─────────────────────────────────────────────

_COMMON_RULES = """
**Extraction rules (apply strictly):**
- Extract ALL row items (line items / account names) exactly as written in the PDF.
- Extract ALL column headers (years, periods) exactly as written.
- Extract ALL numerical values, preserving signs (negative numbers).
- Use `null` for cells that are empty or contain dashes.
- Numbers must be plain numbers (no commas, no currency symbols). Keep negative signs.
- If the statement has BOTH Group/Consolidated AND Company/Separate columns, include ALL columns and label them clearly in the headers.
- Preserve the exact hierarchy of line items (sub-items, totals, sub-totals).
- For numbers in thousands or millions, note the unit in the `notes` field.
- Return ONLY valid JSON. No markdown, no explanations, no code fences.
- If the statement is NOT found in this PDF, return exactly: `null`
"""

PROMPT_INCOME_STATEMENT = f"""You are a financial data extraction expert. Analyze the uploaded PDF and extract ONLY the **Income Statement** (also called "Statement of Profit or Loss", "Statement of Comprehensive Income", or similar).

Return a JSON object with this EXACT structure:
{{
  "title": "Exact title as appears in the PDF",
  "headers": ["Item", "Group 2024", "Group 2023", "Company 2024", "Company 2023"],
  "rows": [
    {{"item": "Revenue", "values": [123456, 112233, 100000, 95000]}},
    {{"item": "Cost of Sales", "values": [-98000, -87000, -80000, -75000]}}
  ],
  "page_numbers": [10, 11],
  "notes": "Amounts in thousands of LKR"
}}

{_COMMON_RULES}
"""

PROMPT_BALANCE_SHEET = f"""You are a financial data extraction expert. Analyze the uploaded PDF and extract ONLY the **Balance Sheet** (also called "Statement of Financial Position" or similar).

Return a JSON object with this EXACT structure:
{{
  "title": "Exact title as appears in the PDF",
  "headers": ["Item", "Group 2024", "Group 2023", "Company 2024", "Company 2023"],
  "rows": [
    {{"item": "Total Assets", "values": [500000, 450000, 400000, 380000]}}
  ],
  "page_numbers": [12, 13],
  "notes": "Amounts in thousands of LKR"
}}

{_COMMON_RULES}
"""

PROMPT_CASH_FLOW = f"""You are a financial data extraction expert. Analyze the uploaded PDF and extract ONLY the **Cash Flow Statement** (also called "Statement of Cash Flows" or similar).

Return a JSON object with this EXACT structure:
{{
  "title": "Exact title as appears in the PDF",
  "headers": ["Item", "Group 2024", "Group 2023", "Company 2024", "Company 2023"],
  "rows": [
    {{"item": "Cash from Operations", "values": [80000, 75000, 70000, 65000]}}
  ],
  "page_numbers": [14],
  "notes": "Amounts in thousands of LKR"
}}

{_COMMON_RULES}
"""

# Statement extraction config: (key, prompt, display_name)
STATEMENT_CONFIGS = [
    ("income_statement", PROMPT_INCOME_STATEMENT, "Income Statement"),
    ("balance_sheet",    PROMPT_BALANCE_SHEET,    "Balance Sheet"),
    ("cash_flow",        PROMPT_CASH_FLOW,        "Cash Flow Statement"),
]


class GeminiFinancialExtractor:
    """Extracts structured financial data from PDFs using Gemini 2.0."""

    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        self.model = genai.GenerativeModel(GEMINI_MODEL)

    def extract_from_pdf(self, pdf_path: str, progress_callback=None) -> dict:
        """
        Upload a PDF to Gemini and extract financial statements.
        Each statement type gets its own API call to avoid truncation.

        Args:
            pdf_path: Absolute path to the PDF file
            progress_callback: Optional callable(step: int, total: int, message: str)

        Returns:
            Dict with income_statement, balance_sheet, cash_flow, additional_sections
        """
        pdf_path = Path(pdf_path)
        total_steps = 8  # validate, upload, wait, IS, BS, CF, combine, done

        def emit(step, message):
            if progress_callback:
                try:
                    progress_callback(step, total_steps, message)
                except Exception:
                    pass

        # ── Step 1: Validate ──────────────────────────────────────────
        emit(1, "Validating PDF file...")

        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        if pdf_path.suffix.lower() != ".pdf":
            raise ValueError(f"Not a PDF file: {pdf_path.name}")

        file_size_mb = pdf_path.stat().st_size / (1024 * 1024)
        if file_size_mb > 100:
            raise ValueError(f"PDF too large ({file_size_mb:.1f} MB). Maximum is 100 MB.")

        # ── Step 2: Upload ────────────────────────────────────────────
        emit(2, "Uploading document for processing...")
        logger.info(f"Uploading PDF: {pdf_path.name} ({file_size_mb:.1f} MB)")

        uploaded_file = None
        try:
            uploaded_file = genai.upload_file(
                str(pdf_path),
                mime_type="application/pdf",
                display_name=pdf_path.name,
            )
            logger.info(f"Upload complete: {uploaded_file.name}")

            # ── Step 3: Wait for processing ───────────────────────────
            emit(3, "Processing document structure...")
            self._wait_for_file_active(uploaded_file)

            # ── Steps 4-6: Extract each statement separately ──────────
            result = {"additional_sections": []}

            for idx, (key, prompt, display_name) in enumerate(STATEMENT_CONFIGS):
                step_num = 4 + idx
                emit(step_num, f"Extracting {display_name}...")
                logger.info(f"Extracting {display_name}...")

                start = time.time()
                section_data = self._extract_single_statement(uploaded_file, prompt, display_name)
                elapsed = time.time() - start
                logger.info(f"  {display_name} done in {elapsed:.1f}s — "
                            f"{self._row_count(section_data)} rows")

                result[key] = section_data

            # ── Step 7: Combine ───────────────────────────────────────
            emit(7, "Combining extracted data...")

            is_rows = self._row_count(result.get('income_statement'))
            bs_rows = self._row_count(result.get('balance_sheet'))
            cf_rows = self._row_count(result.get('cash_flow'))
            total_rows = is_rows + bs_rows + cf_rows

            # ── Step 8: Complete ──────────────────────────────────────
            emit(8, f"Extraction complete — {total_rows} rows extracted")
            logger.info(f"Done — IS:{is_rows} BS:{bs_rows} CF:{cf_rows}")

            return result

        except Exception as e:
            logger.error(f"Extraction failed: {e}", exc_info=True)

            error_str = str(e).lower()
            if "quota" in error_str or "rate" in error_str or "429" in error_str:
                raise RuntimeError(
                    "Service rate limit reached. Please wait a moment and try again."
                ) from e
            elif "permission" in error_str or "403" in error_str:
                raise RuntimeError(
                    "Service access denied. Please check configuration."
                ) from e
            elif "not found" in error_str or "404" in error_str:
                raise RuntimeError(
                    "Extraction service unavailable. Please try again later."
                ) from e
            else:
                raise RuntimeError(f"Extraction failed: {e}") from e

        finally:
            if uploaded_file:
                try:
                    genai.delete_file(uploaded_file.name)
                    logger.info("Cleaned up uploaded file")
                except Exception:
                    pass

    # ── Core: extract one statement ───────────────────────────────────

    def _extract_single_statement(self, uploaded_file, prompt: str, display_name: str, retries: int = 2):
        """
        Send a single extraction prompt to Gemini for one statement type.
        Returns the parsed dict or None if not found.
        Retries on parse failure.
        """
        last_err = None

        for attempt in range(1, retries + 1):
            try:
                response = self.model.generate_content(
                    [uploaded_file, prompt],
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=50000,
                        response_mime_type="application/json",
                    ),
                )

                parsed = self._parse_section_response(response)
                return parsed  # can be None (statement not found) or a dict

            except Exception as e:
                last_err = e
                logger.warning(
                    f"  {display_name} attempt {attempt}/{retries} failed: {e}"
                )
                if attempt < retries:
                    time.sleep(2)

        logger.error(f"  {display_name}: all {retries} attempts failed")
        # Return None rather than crashing — the other statements may still succeed
        return None

    # ── Private helpers ───────────────────────────────────────────────

    @staticmethod
    def _wait_for_file_active(uploaded_file, timeout: int = 120):
        """Poll until the uploaded file is in ACTIVE state."""
        start = time.time()
        while time.time() - start < timeout:
            file_info = genai.get_file(uploaded_file.name)
            if file_info.state.name == "ACTIVE":
                return
            if file_info.state.name == "FAILED":
                raise RuntimeError("Document processing failed")
            logger.info(f"  File state: {file_info.state.name}, waiting...")
            time.sleep(2)
        raise RuntimeError(f"Document processing timed out after {timeout}s")

    @staticmethod
    def _parse_section_response(response) -> dict | None:
        """
        Parse a single-statement response.
        Returns the section dict, or None if the model returned null / empty.
        Includes truncation-repair logic.
        """
        text = response.text.strip()

        # Strip markdown code fences robustly
        if text.startswith("```"):
            text = re.sub(r'^```[a-zA-Z]*\n?', '', text)
            text = re.sub(r'\n?```\s*$', '', text)
            text = text.strip()

        # Handle explicit null / empty
        if text.lower() in ('null', 'none', ''):
            return None

        # ── Attempt 1: direct parse ──────────────────────────────────
        try:
            data = json.loads(text)
            if data is None:
                return None
            if isinstance(data, dict):
                return data
            logger.warning(f"Unexpected response type: {type(data)}")
            return None
        except json.JSONDecodeError as first_err:
            logger.warning(f"Direct JSON parse failed ({len(text)} chars): {first_err}")
            logger.warning(f"Last 300 chars: ...{text[-300:]}")

        # ── Attempt 2: truncation repair ─────────────────────────────
        repaired = text
        repaired = re.sub(r',\s*$', '', repaired)
        repaired = re.sub(r':\s*$', ': null', repaired)
        repaired = re.sub(r',\s*"[^"]*$', '', repaired)
        repaired = re.sub(r'"[^"]*$', '""', repaired)
        # Remove trailing partial number
        repaired = re.sub(r',\s*-?\d*\.?\d*$', '', repaired)

        open_braces = repaired.count('{') - repaired.count('}')
        open_brackets = repaired.count('[') - repaired.count(']')
        repaired += ']' * max(open_brackets, 0)
        repaired += '}' * max(open_braces, 0)

        try:
            data = json.loads(repaired)
            logger.info(f"Truncation repair succeeded ({len(text)} → {len(repaired)} chars)")
            if isinstance(data, dict):
                return data
            return None
        except json.JSONDecodeError:
            logger.error(f"Repair also failed. First 1000 chars: {text[:1000]}")
            raise RuntimeError(
                "Received an incomplete response. Please try again."
            ) from first_err

    @staticmethod
    def _row_count(section) -> int:
        if section and isinstance(section, dict):
            return len(section.get("rows", []))
        return 0
        if section and isinstance(section, dict):
            return len(section.get("rows", []))
        return 0
