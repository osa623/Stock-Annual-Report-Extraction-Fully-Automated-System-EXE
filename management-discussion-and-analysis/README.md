# MD&A Extraction Service

A FastAPI microservice that extracts, structures, and stores the **Management Discussion & Analysis** section from annual-report PDFs / images. Data is persisted in **MongoDB** and structured via **Gemini 2.0 Flash** with a deterministic rule-based fallback.

---

## Prerequisites

| Dependency | Notes |
|---|---|
| **Python 3.10+** | Required |
| **Tesseract OCR** | Install from <https://github.com/tesseract-ocr/tesseract>. Must be on `PATH`. |
| **Poppler** | Required by `pdf2image`. Windows: download from <https://github.com/oschwartz10612/poppler-windows/releases> and add `bin/` to `PATH`. |
| **MongoDB** | Connection string goes in `.env` → `MONGO_DB_URL`. |
| **Gemini API Key** | Free key from <https://makersuite.google.com/app/apikey> → `.env` → `GEMINI_API_KEY`. |

---

## Setup

```bash
# 1. Navigate to the project directory
cd MyApp/management-discussion-and-analysis

# 2. Create & activate a virtual environment (recommended)
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Edit .env and set:
#   MONGO_DB_URL=<your MongoDB connection string>
#   GEMINI_API_KEY=<your Gemini API key>

# 5. Run the server
python server.py
```

The server starts at **http://localhost:8000**.  
Interactive API docs at **http://localhost:8000/docs**.

---

## API Endpoints

### 1. Upload-based extraction

```
POST /api/extract/mda
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File (PDF) | One of `file` or `images[]` | Annual report PDF |
| `images[]` | File[] (PNG/JPG) | One of `file` or `images[]` | Page images |
| `sector` | string | No | e.g. `"Food Beverages and Tobacco"` |
| `company` | string | No | e.g. `"Harishchandra"` |
| `year` | int | No | e.g. `2024` |
| `page_from` | int | No | First page (1-based) |
| `page_to` | int | No | Last page (1-based) |

**curl example:**

```bash
curl -X POST http://localhost:8000/api/extract/mda \
  -F "file=@annual_report.pdf" \
  -F "sector=Food Beverages and Tobacco" \
  -F "company=Harishchandra" \
  -F "year=2024" \
  -F "page_from=15" \
  -F "page_to=22"
```

### 2. Path-based ingestion

```
POST /api/extract/mda/by-path
Content-Type: application/json
```

```json
{
  "sector": "Food Beverages and Tobacco",
  "company": "Harishchandra",
  "year": 2024,
  "page_from": null,
  "page_to": null
}
```

The backend reads from:
```
data/md&a_extractor/Food Beverages and Tobacco/Harishchandra/2024/
```

It auto-detects: PDF first, then images (`images/` subfolder or root).

**curl example:**

```bash
curl -X POST http://localhost:8000/api/extract/mda/by-path \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "Food Beverages and Tobacco",
    "company": "Harishchandra",
    "year": 2024
  }'
```

### 3. List extractions

```
GET /api/mda?sector=...&company=...&year=...
```

All query params are optional. Returns a list:

```json
[
  {
    "_id": "uuid",
    "sector": "Food Beverages and Tobacco",
    "company": "Harishchandra",
    "year": 2024,
    "output_path": "/output/Food Beverages and Tobacco/Harishchandra/2024/json",
    "page_start": 15,
    "page_end": 22,
    "overall_confidence": 87.5,
    "status": "Done",
    "created_at": "2026-02-11T10:30:00+00:00"
  }
]
```

**curl examples:**

```bash
# All records
curl http://localhost:8000/api/mda

# Filter by sector
curl "http://localhost:8000/api/mda?sector=Food%20Beverages%20and%20Tobacco"

# Filter by company + year
curl "http://localhost:8000/api/mda?company=Harishchandra&year=2024"
```

### 4. Get full record

```
GET /api/mda/{id}
```

Returns the complete document including `structured_fields`, `raw_blocks`, and `raw_text_by_page`.

```bash
curl http://localhost:8000/api/mda/some-uuid-here
```

### 5. Health check

```bash
curl http://localhost:8000/health
```

---

## Project Structure

```
management-discussion-and-analysis/
├── .env                          # Environment variables
├── .gitignore
├── requirements.txt
├── server.py                     # python server.py entry point
├── README.md
├── data/
│   └── md&a_extractor/           # Path-based input directory
│       └── <sector>/<company>/<year>/
│           ├── annual_report.pdf  (preferred)
│           └── images/            (fallback)
│               ├── page_001.png
│               └── page_002.png
└── app/
    ├── main.py                   # FastAPI app + lifespan
    ├── core/
    │   └── config.py             # Settings from .env
    ├── db/
    │   └── mongo.py              # MongoDB client, collection, indexes
    ├── api/
    │   └── routes/
    │       └── mda.py            # All 4 API endpoints
    ├── services/
    │   ├── pipeline.py           # Orchestrates full extraction flow
    │   ├── pdf_to_images.py      # PDF → PIL Images (poppler)
    │   ├── ocr.py                # pytesseract OCR + confidence
    │   ├── mda_detector.py       # Fuzzy heading detection for MD&A range
    │   ├── mda_parser_rules.py   # Block segmentation + rule-based tagging
    │   ├── mda_formatter_gemini.py # Gemini 2.0 Flash structuring
    │   └── confidence.py         # Overall confidence computation
    └── utils/
        ├── text_cleaning.py      # OCR text normalization
        └── json_validator.py     # Structured-fields schema validation
```

---

## Extraction Pipeline

1. **Input normalization** — PDF → images via `pdf2image`, or load sorted image files.
2. **OCR** — `pytesseract.image_to_data` per page; compute mean confidence.
3. **MD&A detection** — Fuzzy match on section headings to find start/end pages.
4. **Block segmentation** — Split into paragraph blocks with page references.
5. **Rule-based tagging** — Classify each block: type, impact, related statement.
6. **Gemini 2.0 Flash** — Send OCR text + blocks → strict JSON output.
7. **Schema validation** — Validate Gemini output; fallback to rules if invalid.
8. **MongoDB save** — Single document with full results.

---

## MongoDB Collection: `mda_extractions`

Indexes: `sector`, `company`, `year`, `output_path`, compound `(sector, company, year)`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_DB_URL` | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | Recommended | Google Gemini API key (falls back to rules if missing) |
| `MONGO_DB_NAME` | No | Database name (default: `mda_service`) |
