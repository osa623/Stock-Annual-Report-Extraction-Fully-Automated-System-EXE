
import os
import json
import logging
from typing import Dict, Any, List
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

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
            # Use Gemini 1.5 Flash for speed and cost effectiveness
            self.model = genai.GenerativeModel('gemini-flash-latest')
            logger.info("AIPolisher initialized with gemini-flash-latest")

    def refine_with_gemini(self, image: Image.Image, ocr_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends Image + Partial JSON to Gemini to verify and correct data.
        """
        if not self.model:
            return ocr_json
            
        try:
            prompt = """
            You are a Financial Data Auditor. Your goal is to produce a **100% accurate** digital representation of the Financial Statement Table in the provided IMAGE.
            
            **Input:**
            1. IMAGE: The ground truth.
            2. JSON: An OCR extraction that may have typos, missing rows, or wrong years.

            **Your Task:**
            1. **Verify Headers:** Look at the IMAGE headers. Does the JSON have the correct Years and Entities (e.g., "Group 2024", "Bank 2023")? If not, FIX THE KEYS in the output to match the image exactly.
            2. **Verify Rows:** Go through every row in the IMAGE. Ensure it exists in the JSON. If missing, ADD IT.
            3. **Verify Values:** Check every single number.
               - Fix OCR typos (e.g., 'S' -> '5', 'O' -> '0').
               - Fix missing decimals or commas.
               - Ensure values are in the correct column (Note vs Year 1 vs Year 2).
            4. **Clean Noise:** Remove empty rows or garbage text.

            **Output Format:**
            Return a SINGLE JSON object with a "data" key, containing a list of row objects.
            Example:
            {
              "data": [
                {"label": "Revenue", "Note": "3", "2024 (Group)": "100,000", "2023 (Group)": "90,000", ...},
                ...
              ]
            }
            
            **Strict Constraints:**
            - Output JSON ONLY. No markdown, no explanations.
            - Do not hallucinate. If a value is blank in the image, keep it blank.
            - The "label" must match the text in the image row.
            """
            
            # Pass image and json string
            response = self.model.generate_content([prompt, image, json.dumps(ocr_json)])
            
            # Parse response
            raw_text = response.text
            # Remove markdown logic if present
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()
            
            polished_data = json.loads(clean_text)
            
            # Add meta tag
            if isinstance(polished_data, dict):
                 if "parse_meta" not in polished_data: polished_data["parse_meta"] = {}
                 polished_data["parse_meta"]["method"] = "hybrid_gemini_flash"
                 
            return polished_data

        except Exception as e:
            logger.error(f"AI Polish Failed: {e}")
            # Fallback to original OCR data if AI fails
            return ocr_json
