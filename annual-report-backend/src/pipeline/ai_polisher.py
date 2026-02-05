
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
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            logger.warning("GEMINI_API_KEY not found. AI Polish will be skipped.")
            self.model = None
        else:
            genai.configure(api_key=gemini_key)
            # Use Gemini 1.5 Flash for speed and cost effectiveness
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("AIPolisher initialized with gemini-1.5-flash")

    def refine_with_gemini(self, image: Image.Image, ocr_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends Image + Partial JSON to Gemini to verify and correct data.
        """
        if not self.model:
            return ocr_json
            
        try:
            prompt = """
            You are a Financial Data Auditor.
            1. Analyze the provided financial statement IMAGE.
            2. Review the provided JSON extracted via OCR.
            3. CORRECT any typos, missing numbers, or column misalignments in the JSON.
            4. Ensure the 4-year columns (Bank 2023, Bank 2022, Group 2023, Group 2022) are perfectly aligned with the image.
            5. Return the cleaned JSON ONLY, no markdown.
            
            Key Rules:
            - If a number is illegible in OCR but clear in Image, fix it.
            - If "Note" column is empty in JSON but present in Image, fill it.
            - Do not change keys/labels unless they are obvious OCR typos.
            - Output must be strict list of objects under 'data' key.
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
