
import os
import json
import logging
import time
import re
import ast
from typing import Dict, Any, List
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
    - Unquoted property names
    - Extra commas
    """
    # Remove trailing commas before closing braces/brackets
    text = re.sub(r',(\s*[}\]])', r'\1', text)
    
    # Remove multiple consecutive commas
    text = re.sub(r',\s*,', ',', text)
    
    # Replace single quotes with double quotes (but be careful with apostrophes in values)
    # This is a simplified approach - replace ' with " for keys and string values
    text = re.sub(r"'([^']*)'(\s*:\s*)", r'"\1"\2', text)  # Fix keys with single quotes
    text = re.sub(r":\s*'([^']*)'", r': "\1"', text)  # Fix values with single quotes
    
    # Remove any trailing commas after the last item in arrays/objects (aggressive cleanup)
    text = re.sub(r',(\s*\n\s*[}\]])', r'\1', text)
    
    return text

class AIPolisher:
    """
    Polishes extracted data using Gemini 1.5 Flash Vision.
    Corrects OCR errors, visual misalignments, and missing values.
    """
    
    def __init__(self):
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            logger.warning("GEMINI_API_KEY not found. AI Polish will be skipped.")
            self.model = None
        else:
            genai.configure(api_key=gemini_key)
            # Use Gemini 2.0 Flash (Stable)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("AIPolisher initialized with gemini-2.0-flash")

    def refine_with_gemini(self, image: Image.Image, ocr_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends Image + Simplified JSON to Gemini to verify and correct data.
        """
        if not self.model:
            return ocr_json
            
        try:
            # OPTIMIZATION: Resize image to max 1536px to prevent 504 Timeouts & Reduce Tokens
            # Financial tables need detail, but 4k+ images are overkill and cause timeouts
            max_size = 1536
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # OPTIMIZATION: Strip heavy metadata (coordinates, confidence, etc) to save tokens
            simplified_json = self._strip_heavy_metadata(ocr_json)
            
            prompt = """
            You are a Financial Data Auditor. Your PRIMARY SOURCE is the IMAGE. Extract the EXACT data visible in the financial statement table.
            
            **Input:**
            1. IMAGE: The GROUND TRUTH - this is your primary source
            2. JSON: A draft OCR extraction (may have errors, use IMAGE to verify)

            **CRITICAL - Table Structure:**
            Financial statements typically have:
            - LEFT COLUMN: Statement line item labels (e.g., "Revenue", "Total Assets", "Cash Flow from Operations")
            - SECOND COLUMN: Note reference numbers (if present)
            - NEXT 4 COLUMNS: Four numerical data columns, usually in this pattern:
              * Column 1: Current Year Bank/Company (e.g., "2024 (Bank)" or "2023 (Company)")
              * Column 2: Previous Year Bank/Company (e.g., "2023 (Bank)" or "2022 (Company)")
              * Column 3: Current Year Group (e.g., "2024 (Group)")
              * Column 4: Previous Year Group (e.g., "2023 (Group)")

            **Your Task - BY LOOKING AT THE IMAGE:**
            1. **Identify Columns:** Look at the IMAGE headers. Extract the EXACT column names as they appear (including year and entity type).
            2. **Extract ALL Rows:** Go through EVERY row in the IMAGE from top to bottom:
               - Extract the label (left-most text)
               - Extract Note number (if present)
               - Extract ALL FOUR numerical values in their respective columns
               - If a cell is empty or shows "-" or "—", use empty string ""
            3. **Verify Each Number:** 
               - Fix OCR typos: 'S'→'5', 'O'→'0', 'l'→'1', 'I'→'1'
               - Preserve formatting: keep commas, decimals, parentheses for negatives
               - Ensure each value is in its CORRECT column
            4. **Do NOT skip rows** - even if OCR JSON is missing data, YOU must extract it from the IMAGE

            **CRITICAL - Output Format:**
            Return ONLY valid JSON. No trailing commas. Use double quotes for all keys and strings.
            Structure: ONE object with "data" array, each row object should have "label" + "Note" + FOUR YEAR COLUMNS.
            
            Example for Income Statement:
            {
              "data": [
                {"label": "Interest Income", "Note": "5", "2023 (Bank)": "12,500,000", "2022 (Bank)": "11,200,000", "2023 (Group)": "13,800,000", "2022 (Group)": "12,500,000"},
                {"label": "Interest Expense", "Note": "6", "2023 (Bank)": "(5,200,000)", "2022 (Bank)": "(4,800,000)", "2023 (Group)": "(5,500,000)", "2022 (Group)": "(5,000,000)"}
              ]
            }
            
            NO trailing commas. Every row MUST have all columns that exist in the header.
            """
            
            # Pass image and json string
            max_retries = 6
            base_delay = 4
            
            for attempt in range(max_retries):
                try:
                    # Send simplified JSON to save tokens
                    # Configure for JSON output mode (Gemini 2.0 Flash supports this)
                    generation_config = {
                        "response_mime_type": "application/json"
                    }
                    response = self.model.generate_content(
                        [prompt, image, json.dumps(simplified_json)],
                        generation_config=generation_config
                    )
                    break # Success, exit retry loop
                except Exception as e:
                    if "504" in str(e) or "Deadline Exceeded" in str(e) or "429" in str(e) or "Resource exhausted" in str(e):
                        if attempt < max_retries - 1:
                            sleep_time = (base_delay * (2 ** attempt)) + (attempt * 2) # Exponential backoff: 4, 10, 22, 46...
                            logger.warning(f"Gemini Rate Limit/Error ({e}). Retrying in {sleep_time}s (Attempt {attempt+1}/{max_retries})...")
                            time.sleep(sleep_time)
                            continue
                    
                    logger.error(f"Gemini Non-Retryable Error: {e}")
                    raise e # Re-raise if not retryable or max retries reached
            
            # Parse response
            raw_text = response.text
            
            # Parse response
            raw_text = response.text
            
            # Extract Token Usage (Safely)
            token_counts = {}
            try:
                # Check if attribute exists
                if hasattr(response, 'usage_metadata'):
                    usage_metadata = response.usage_metadata
                    # Check if usage_metadata is not None
                    if usage_metadata:
                        token_counts = {
                            "prompt_token_count": usage_metadata.prompt_token_count,
                            "candidates_token_count": usage_metadata.candidates_token_count,
                            "total_token_count": usage_metadata.total_token_count
                        }
                        logger.info(f"Gemini Token Usage: {token_counts}")
            except Exception as usage_err:
                logger.warning(f"Could not extract token usage: {usage_err}")

            # Remove markdown logic if present
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            
            # Clean trailing commas (common AI JSON error)
            clean_text = clean_json_string(clean_text)
            
            try:
                polished_data = json.loads(clean_text)
            except json.JSONDecodeError as json_err:
                logger.error(f"JSON Parse Error: {json_err}")
                logger.error(f"Problematic JSON context (chars {max(0, json_err.pos-100)}:{json_err.pos+100}):")
                logger.error(clean_text[max(0, json_err.pos-100):json_err.pos+100])
                
                # Try one more aggressive fix: use json5 or eval as last resort
                try:
                    # Attempt to fix by removing all comments and fixing common issues
                    import ast
                    # Try to evaluate as Python literal (more forgiving)
                    polished_data = ast.literal_eval(clean_text)
                except:
                    logger.error("All JSON parsing attempts failed. Falling back to OCR data.")
                    return ocr_json
            
            # Add meta tag
            if isinstance(polished_data, dict):
                 if "parse_meta" not in polished_data: polished_data["parse_meta"] = {}
                 polished_data["parse_meta"]["method"] = "hybrid_gemini_flash_lite"
                 
                 # Inject token usage
                 if token_counts:
                     polished_data["parse_meta"]["token_usage"] = token_counts
                 
            return polished_data

        except Exception as e:
            logger.error(f"AI Polish Failed: {e}")
            # Fallback to original OCR data if AI fails
            return ocr_json

    def _strip_heavy_metadata(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Removes unnecessary fields (coordinates, confidence, internal paths) 
        from the JSON before sending to LLM to reduce token usage.
        """
        if not isinstance(data, dict):
            return data
            
        clean_data = {}
        
        # Keep only essential fields for correction
        if "data" in data:
            clean_data["data"] = data["data"] # The actual rows
        
        if "currency_unit" in data:
            clean_data["currency_unit"] = data["currency_unit"]
            
        # If "data" is missing, maybe it's the raw list itself?
        if "data" not in data and isinstance(data, list):
             return data
             
        return clean_data
