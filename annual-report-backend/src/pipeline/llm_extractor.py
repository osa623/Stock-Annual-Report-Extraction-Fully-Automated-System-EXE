"""
LLM-Based Financial Statement Extractor.
Uses high-intelligence multimodal models to extract strict JSON data from statement images.
"""

import os
import base64
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import requests
import time
import random
import threading
import re

# Configure logging
logger = logging.getLogger(__name__)

class LLMFinancialExtractor:
    """
    Extractor that uses Multimodal LLMs (GPT-4o / Gemini 1.5 Pro) to convert
    financial statement images into normalized JSON.
    """
    
    SYSTEM_PROMPT = """@[MyApp] You are a financial statement extraction engine for scanned pages/images.

Return ONLY valid JSON. Do not output markdown, code fences, comments, or extra text.

Primary goal:
- Convert the provided statement page content into a normalized JSON object that matches the required storage layout and will be saved into a database using a folder-like structure.

Hard constraints:
1) No hallucination: do not invent rows, notes, years, page numbers, or values that are not present in the provided input.
2) Output must be strict JSON and parseable.
3) Preserve numeric formatting as strings exactly as shown in the source:
   - Keep comma separators: "1,063,675,345"
   - Keep negatives in parentheses: "(4,308,429)"
   - Keep decimals and asterisks: "15.00*"
   - Keep dashes "-" exactly when the statement shows "-"
4) Clean labels:
   - Do NOT include unit/header noise inside row labels (e.g., remove "Rs 000 Rs 000 ...")
   - Do NOT glue section titles into line item labels (e.g., remove "ASSETS " prefix or "Cash flows from operating activities " prefix if stuck to the first item)
5) No duplicates:
   - If a label appears twice, keep the most complete one (with the most populated columns)
   - Drop rows that are only footnote markers (e.g., "15.00*" alone)
6) Columns:
   - Column keys must be exactly: "YYYY (Bank)" and/or "YYYY (Group)" based on the page header
   - Do not create any other column key formats
7) Include only data rows that have at least one value that looks numeric or "-" (excluding the header row which is mandatory).

If you are uncertain about any row label or a value, keep it as best-effort but add a warning under parse_meta.warnings and reduce confidence.
"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the extractor.
        """
        # Prioritize Google Gemini (Free Tier)
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
        
        # Determine provider based on available keys, preferring Gemini
        if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
            self.provider = "gemini"
        elif os.getenv("OPENAI_API_KEY"):
            self.provider = "openai"
        else:
            self.provider = None

        if self.api_key and self.provider:
            masked_key = self.api_key[:8] + "..." + self.api_key[-4:]
            logger.info(f"LLM Initialized with provider: {self.provider}, Key: {masked_key}")
        
        # Enforce sequential execution to avoid rate limits
        self._concurrency_limit = threading.Semaphore(1)
        
        if not self.api_key:
            logger.warning("No API Key found (OPENAI_API_KEY or GEMINI_API_KEY). Extraction will fail or use mock.")

    def extract_from_image(self, image_path: str) -> Dict[str, Any]:
        """
        Extract financial data from a single image file.
        """
        # Acquire semaphore to prevent concurrent API calls
        with self._concurrency_limit:
            try:
                image_path = Path(image_path)
                if not image_path.exists():
                    raise FileNotFoundError(f"Image not found: {image_path}")

                # 1. Encode image
                base64_image = self._encode_image(image_path)
                
                # 2. Call LLM
                if self.provider == "openai":
                    response_text = self._call_openai(base64_image)
                elif self.provider == "gemini":
                    response_text = self._call_gemini(base64_image)
                else:
                    # Mock response for testing if no key provided
                    logger.warning("Using MOCK extraction (no API key configured)")
                    return self._mock_response(image_path.name)

                # 3. Clean and Parse JSON
                return self._clean_and_parse_json(response_text)

            except Exception as e:
                logger.error(f"LLM Extraction failed for {image_path}: {str(e)}")
                return {
                    "error": str(e),
                    "extraction_success": False
                }

    def _encode_image(self, image_path: Path) -> str:
        """Read and encode image to base64."""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def _call_openai(self, base64_image: str) -> str:
        """Call OpenAI GPT-4o API."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": "gpt-4o",  # High intelligence multimodal model
            "messages": [
                {
                    "role": "system",
                    "content": self.SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract this financial statement page."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.0, # Deterministic outputs
            "max_tokens": 4096
        }
        
        max_retries = 5
        base_delay = 2  # Start with 2 seconds

        for attempt in range(max_retries):
            try:
                response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                
                if response.status_code == 429:
                    if attempt < max_retries - 1:
                        # Add jitter to avoid thundering herd on retry
                        jitter = random.uniform(0.5, 2.0)
                        sleep_time = (base_delay * (2 ** attempt)) + jitter 
                        logger.warning(f"OpenAI 429 Rate Limit. Retrying in {sleep_time:.2f}s (Attempt {attempt+1}/{max_retries})")
                        time.sleep(sleep_time)
                        continue
                    else:
                        logger.error("Max retries reached for OpenAI API.")
                        response.raise_for_status()

                response.raise_for_status()
                result = response.json()
                return result['choices'][0]['message']['content']

            except requests.exceptions.RequestException as e:
                # If it's not a 429 (handled above) or if we are out of retries, raise.
                # If we want to retry on 5xx errors as well, we could add that condition.
                # For now, focused on 429.
                if response.status_code == 429 and attempt < max_retries - 1:
                     # This block is somewhat redundant if the if above catches it, 
                     # but requests.post generally doesn't raise exception on 429 unless raise_for_status is called.
                     # The flow above handles it.
                     pass 
                raise e

    def _call_gemini(self, base64_image: str) -> str:
        """Call Google Gemini Flash API (Latest)."""
        # Clean the API key in case of whitespace
        clean_key = self.api_key.strip() if self.api_key else ""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={clean_key}"
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": self.SYSTEM_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 8192,
                "responseMimeType": "application/json"
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'})
            
            if response.status_code != 200:
                logger.error(f"Gemini API Error {response.status_code}: {response.text}")
                response.raise_for_status()
            
            result = response.json()
            return result['candidates'][0]['content']['parts'][0]['text']
            
        except requests.exceptions.HTTPError as e:
            # Re-raise to be caught by the main handler
            raise e
        except Exception as e:
            logger.error(f"Gemini Call Failed: {str(e)}")
            raise e

    def _clean_and_parse_json(self, text: str) -> Dict[str, Any]:
        """Clean markdown fences and parse JSON."""
        try:
            # 1. Try to find JSON within code blocks first
            match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
            if not match:
                match = re.search(r"```\s*(\{.*?\})\s*```", text, re.DOTALL)
            
            if match:
                clean_text = match.group(1)
            else:
                # 2. If no code blocks, look for the first { and last }
                start = text.find('{')
                end = text.rfind('}')
                
                if start != -1 and end != -1:
                    clean_text = text[start:end+1]
                else:
                    clean_text = text.strip()

            return json.loads(clean_text)
            
        except json.JSONDecodeError as e:
            # Log the problematic text for debugging
            logger.error(f"JSON Parse Error: {str(e)}")
            logger.error(f"Raw Text Preview (First 500 chars): {text[:500]}")
            logger.error(f"Raw Text Preview (Last 500 chars): {text[-500:]}")
            raise e

    def _mock_response(self, filename: str) -> Dict[str, Any]:
        """Return a mock structure for testing UI flow."""
        return {
            "parse_meta": {
                "warnings": ["MOCK DATA - No API Key"],
                "confidence": 0.99
            },
            "financial_data": [
                {
                    "Line Item": "Example Asset Row",
                    "2024 (Group)": "1,000,000",
                    "2023 (Group)": "900,000"
                }
            ]
        }
