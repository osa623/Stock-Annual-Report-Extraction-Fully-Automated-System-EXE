
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=r"f:\PDF-extractor-EXE\MyApp\annual-report-backend\.env")

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

with open("available_models_dump.txt", "w") as f:
    try:
        f.write("List of available models:\n")
        for m in genai.list_models():
            f.write(f"Name: {m.name} | Methods: {m.supported_generation_methods}\n")
    except Exception as e:
        f.write(f"Error: {e}\n")
