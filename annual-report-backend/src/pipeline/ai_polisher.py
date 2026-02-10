
import os
import json
import logging
import time
import re
import ast
from typing import Dict, Any, List, Optional
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def clean_json_string(text: str) -> str:
    """
    Cleans common malformations in AI-generated JSON:
    - Trailing commas before } or ]
    - Single quotes instead of double quotes
    - Extra commas, comments
    """
    # Remove single-line comments (// ...)
    text = re.sub(r'//.*?$', '', text, flags=re.MULTILINE)
    # Remove trailing commas before closing braces/brackets
    text = re.sub(r',(\s*[}\]])', r'\1', text)
    # Remove multiple consecutive commas
    text = re.sub(r',\s*,', ',', text)
    # Replace single-quoted keys with double-quoted
    text = re.sub(r"'([^']*)'(\s*:\s*)", r'"\1"\2', text)
    # Replace single-quoted string values with double-quoted
    text = re.sub(r":\s*'([^']*)'", r': "\1"', text)
    # Remove any trailing commas after the last item (multiline)
    text = re.sub(r',(\s*\n\s*[}\]])', r'\1', text)
    return text


class AIPolisher:
    """
    Polishes extracted OCR data using Gemini 2.0 Flash Vision.
    Uses the statement IMAGE as ground truth to correct OCR errors,
    missing rows, misaligned columns, and grammatical label issues.
    """
    
    def __init__(self):
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            logger.warning("GEMINI_API_KEY not found. AI Polish will be skipped.")
            self.model = None
        else:
            genai.configure(api_key=gemini_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("AIPolisher initialized with gemini-2.0-flash")

    def refine_with_gemini(self, image: Image.Image, ocr_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends Image + OCR JSON to Gemini to verify, correct, and reformat data.
        Enforces strict 4-column layout: label + Note + 4 year columns.
        """
        if not self.model:
            return ocr_json
            
        try:
            # Resize image to max 1536px to prevent timeouts
            max_size = 1536
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Strip heavy metadata to save tokens
            simplified_json = self._strip_heavy_metadata(ocr_json)
            
            # Detect the expected column keys from the OCR JSON
            expected_columns = self._detect_column_keys(ocr_json)
            columns_instruction = ""
            if expected_columns:
                col_list = ', '.join([f'"{c}"' for c in expected_columns])
                columns_instruction = f"""
            **MANDATORY COLUMN KEYS (use these EXACT keys for every row):**
            {col_list}
            
            Every row object MUST have exactly these keys: "label", "Note", {col_list}
            Do NOT rename, reorder, or omit any of these column keys.
            """
            
            prompt = f"""You are a Financial Statement Data Extractor. The IMAGE is the GROUND TRUTH.

**TASK:** Look at the financial table IMAGE and produce a perfectly structured JSON extraction.

**STEP 1 — Read the IMAGE column headers:**
Look at the top of the table in the IMAGE. Identify the 4 data columns.
They follow this pattern: YEAR (ENTITY) — e.g. "2023 (Bank)", "2022 (Bank)", "2023 (Group)", "2022 (Group)".
{columns_instruction}
**STEP 2 — Extract every row from the IMAGE:**
For EACH row visible in the IMAGE table, from top to bottom:
- "label": The line item name on the LEFT side (e.g. "Interest Income", "Total Assets").
  * Fix any spelling or grammar errors in the label.
  * Use proper English capitalization and financial terminology.
- "Note": The note reference number (if visible), otherwise "".
- 4 value columns: Extract the EXACT number from that column position in the IMAGE.
  * Keep commas and decimal points as shown.
  * Negative values: use parentheses format "(1,234)" as shown in the image.
  * Empty cell or dash: use "".
  * Fix OCR errors: S→5, O→0, l→1, I→1, B→8.

**STEP 3 — Quality checks:**
- Every row MUST have ALL 6 keys: "label", "Note", and 4 value columns.
- Do NOT skip any rows, even subtotals or section headers.
- Do NOT add rows that don't exist in the IMAGE.
- Ensure each value is in the CORRECT column (match position in the image).

**OUTPUT — Return ONLY this JSON structure:**
{{
  "data": [
    {{"label": "Row Name", "Note": "1", "YYYY (Entity1)": "value", "YYYY-1 (Entity1)": "value", "YYYY (Entity2)": "value", "YYYY-1 (Entity2)": "value"}}
  ]
}}

RULES: Valid JSON only. Double quotes only. No trailing commas. No comments."""

            # Retry with exponential backoff for rate limits
            max_retries = 6
            base_delay = 8  # Start higher to avoid rapid 429s
            
            response = None
            for attempt in range(max_retries):
                try:
                    generation_config = {
                        "response_mime_type": "application/json"
                    }
                    response = self.model.generate_content(
                        [prompt, image, json.dumps(simplified_json)],
                        generation_config=generation_config
                    )
                    break
                except Exception as e:
                    error_str = str(e)
                    if any(code in error_str for code in ["504", "Deadline Exceeded", "429", "Resource exhausted"]):
                        if attempt < max_retries - 1:
                            sleep_time = base_delay * (2 ** attempt)  # 8, 16, 32, 64, 128, 256
                            logger.warning(f"Gemini Rate Limit ({e}). Retrying in {sleep_time}s (Attempt {attempt+1}/{max_retries})...")
                            time.sleep(sleep_time)
                            continue
                    logger.error(f"Gemini Non-Retryable Error: {e}")
                    raise e
            
            if response is None:
                logger.error("All Gemini retries exhausted. Falling back to OCR data.")
                return ocr_json
            
            raw_text = response.text
            
            # Extract Token Usage
            token_counts = {}
            try:
                if hasattr(response, 'usage_metadata') and response.usage_metadata:
                    um = response.usage_metadata
                    token_counts = {
                        "prompt_token_count": um.prompt_token_count,
                        "candidates_token_count": um.candidates_token_count,
                        "total_token_count": um.total_token_count
                    }
                    logger.info(f"Gemini Token Usage: {token_counts}")
            except Exception as usage_err:
                logger.warning(f"Could not extract token usage: {usage_err}")

            # Clean and parse JSON
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            clean_text = clean_json_string(clean_text)
            
            polished_data = self._safe_json_parse(clean_text)
            if polished_data is None:
                logger.error("JSON parsing failed. Falling back to OCR data.")
                return ocr_json
            
            # POST-PROCESSING: Enforce strict column format
            if expected_columns:
                polished_data = self._enforce_column_format(polished_data, expected_columns)
            
            # Add metadata
            if isinstance(polished_data, dict):
                if "parse_meta" not in polished_data:
                    polished_data["parse_meta"] = {}
                polished_data["parse_meta"]["method"] = "hybrid_gemini_flash_lite"
                if token_counts:
                    polished_data["parse_meta"]["token_usage"] = token_counts
                 
            return polished_data

        except Exception as e:
            logger.error(f"AI Polish Failed: {e}")
            return ocr_json

    def _safe_json_parse(self, text: str) -> Optional[Dict]:
        """Try multiple strategies to parse potentially malformed JSON."""
        # Attempt 1: Standard parse
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse attempt 1 failed: {e}")
        
        # Attempt 2: Fix and retry
        try:
            fixed = clean_json_string(text)
            return json.loads(fixed)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse attempt 2 failed: {e}")
            logger.debug(f"Context around error: ...{text[max(0,e.pos-80):e.pos+80]}...")
        
        # Attempt 3: Python literal eval (handles single quotes, trailing commas)
        try:
            return ast.literal_eval(text)
        except Exception as e:
            logger.warning(f"JSON parse attempt 3 (literal_eval) failed: {e}")
        
        # Attempt 4: Extract just the data array if we can find it
        try:
            match = re.search(r'"data"\s*:\s*\[', text)
            if match:
                start = text.rfind('{', 0, match.start())
                if start == -1:
                    start = 0
                # Find matching end
                depth = 0
                end = start
                for i in range(start, len(text)):
                    if text[i] == '{':
                        depth += 1
                    elif text[i] == '}':
                        depth -= 1
                        if depth == 0:
                            end = i + 1
                            break
                subset = text[start:end]
                subset = clean_json_string(subset)
                return json.loads(subset)
        except Exception as e:
            logger.warning(f"JSON parse attempt 4 (extract data) failed: {e}")
        
        return None

    def _detect_column_keys(self, ocr_json: Dict[str, Any]) -> List[str]:
        """
        Detect the expected year/entity column keys from the OCR JSON data.
        Returns list like: ['2023 (Bank)', '2022 (Bank)', '2023 (Group)', '2022 (Group)']
        """
        columns = []
        if not isinstance(ocr_json, dict):
            return columns
            
        data = ocr_json.get("data", [])
        if not data or not isinstance(data, list):
            return columns
        
        # Scan first few rows to find all year-entity keys
        skip_keys = {"label", "Note", "note", "parse_meta"}
        seen = set()
        for row in data[:10]:  # Check first 10 rows
            if isinstance(row, dict):
                for key in row.keys():
                    if key not in skip_keys and key not in seen:
                        # Check if it looks like a year column: "YYYY (Entity)"
                        if re.match(r'\d{4}\s*\(', key):
                            seen.add(key)
                            columns.append(key)
        
        # Sort: current year first, then by entity
        columns.sort(key=lambda x: (
            -int(re.search(r'\d{4}', x).group()),  # Year descending
            0 if 'bank' in x.lower() or 'company' in x.lower() else 1  # Bank/Company before Group
        ))
        
        if columns:
            logger.info(f"Detected schema columns: {columns}")
        return columns

    def _enforce_column_format(self, data: Dict[str, Any], expected_columns: List[str]) -> Dict[str, Any]:
        """
        Post-process Gemini output to ensure every row has exactly the expected columns.
        Fixes column key mismatches and ensures consistency.
        """
        if not isinstance(data, dict) or "data" not in data:
            return data
            
        rows = data.get("data", [])
        if not isinstance(rows, list):
            return data
        
        fixed_rows = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            
            fixed_row = {
                "label": row.get("label", "").strip(),
                "Note": str(row.get("Note", row.get("note", ""))).strip()
            }
            
            # Skip empty label rows
            if not fixed_row["label"]:
                continue
            
            # Map each expected column
            for col in expected_columns:
                if col in row:
                    fixed_row[col] = str(row[col]).strip() if row[col] is not None else ""
                else:
                    # Try to find a similar key (Gemini may have reformatted slightly)
                    matched = self._fuzzy_match_column(col, row)
                    fixed_row[col] = str(matched).strip() if matched is not None else ""
            
            fixed_rows.append(fixed_row)
        
        data["data"] = fixed_rows
        logger.info(f"Format enforced: {len(fixed_rows)} rows, {len(expected_columns)} value columns each")
        return data
    
    def _fuzzy_match_column(self, expected_key: str, row: Dict) -> Optional[str]:
        """
        Try to fuzzy-match a column key from the row to the expected key.
        Handles cases like Gemini returning '2023(Bank)' instead of '2023 (Bank)'.
        """
        # Extract year and entity from expected key
        match = re.match(r'(\d{4})\s*\((\w+)\)', expected_key)
        if not match:
            return None
        
        year, entity = match.group(1), match.group(2).lower()
        
        for key, value in row.items():
            if key in ("label", "Note", "note"):
                continue
            key_lower = key.lower()
            if year in key and entity in key_lower:
                return value
        
        return None

    def _strip_heavy_metadata(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Removes unnecessary fields (coordinates, confidence, internal paths)
        from the JSON before sending to LLM to reduce token usage.
        """
        if not isinstance(data, dict):
            return data
            
        clean_data = {}
        
        if "data" in data:
            clean_data["data"] = data["data"]
        
        if "currency_unit" in data:
            clean_data["currency_unit"] = data["currency_unit"]
            
        if "data" not in data and isinstance(data, list):
            return data
             
        return clean_data
