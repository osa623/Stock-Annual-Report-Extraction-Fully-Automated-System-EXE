# Financial Statement AI Extractor

![Project Banner](assets/project_banner.jpg)


An intelligent PDF extraction system designed to automatically extract structured financial data from annual reports and financial statements.

## Tech History & Evolution

The extraction engine has evolved through multiple iterations to achieve maximum reliability and accuracy:

1.  **Docling / LayoutLM**: Initial attempts used document layout models but struggled with complex table structures common in annual reports.
2.  **LlamaParse**: successfully extracted text but was limited by external server dependencies and token costs.
3.  **PDFPlumber**: Good for simple PDFs but failed on image-based or scanned reports.
4.  **Date-Specific OCR (DeepSeek-V2)**: Experimented with large vision models; proved too expensive and GPU-intensive for local deployment.
5.  **Multimodal LLMs (GPT-4o / Gemini 1.5 Pro)**: Achieved high accuracy but faced significant challenges with API rate limits (429 errors), costs, and data truncation issues due to token limits.
6.  **Current Solution**: A robust **Hybrid / Pure Local OCR** approach using optimized Tesseract 5 with specific segmentation modes (`--psm 3`) and a deterministic custom Table Parser. This eliminates API costs, avoids rate limits, and guarantees 100% data privacy and consistency.

## Current Tech Stack

### Frontend
-   **React.js**: Responsive admin dashboard with sidebar navigation and modular page layout.
-   **Tailwind CSS**: Modern enterprise UI — monochrome palette, rounded cards, responsive sidebar with mobile hamburger collapse.
-   **React Router v6**: Client-side routing with protected routes and a shared `DashboardLayout` (sidebar + top bar).
-   **Recharts**: Interactive data visualization.


#### Extraction Modules

**Financial Statement Extraction (existing)**
| Module | Description | Status |
|---|---|---|
| PDF Data Handler | Save/view extracted Income Statement, Financial Position, Cash Flow | Active |
| Annual PDF Extractor | Automated extraction from annual report PDFs | Active |
| Raw Image Extractor | OCR extraction from raw statement images | Active |
| Quarterly PDF Extractor | Extraction from interim report PDFs | Coming Soon |

**Report Data Extraction (new — frontend UI)**
| Section | Category |
|---|---|
| Chairman's Review | Leadership Reports |
| Managing Director's Report | Leadership Reports |
| Management Discussion & Analysis | Leadership Reports |
| Corporate Governance | Governance & Risk |
| Risk Management | Governance & Risk |
| Audit / Risk Committee Report | Governance & Risk |
| Remuneration Committee Report | Governance & Risk |
| Related Party Transactions Review Committee Report | Governance & Risk |
| Board of Directors | Company Information |
| Independent Auditor's Report | Financial Reports |
| Statement of Value Added | Financial Reports |
| Ten-Year Statistical Summary | Financial Reports |
| Investor Information | Company Information |
| CSR / Sustainability | Company Information |

Each report section page provides:
- **Extract tab**: PDF dropzone, optional page range, extraction trigger with status badge
- **View tab**: Sortable data table, detail slide-over drawer, JSON/CSV export

### Backend (Node.js)
-   **Express.js**: RESTful API for file management and data serving.
-   **MongoDB**: Flexible storage for hierarchical financial data (Sector -> Company -> Year).

### Extraction Engine (Python)
-   **Flask**: Lightweight API for the extraction microservice.
-   **Tesseract OCR 5**: High-performance local Optical Character Recognition engine.
-   **PyMuPDF (Fitz)**: PDF processing and rendering.
-   **Custom TableParser**: specialized heuristic algorithms to detect, split, and normalize financial tables without AI hallucinations.

## Performance

-   **Speed**: Extraction completes in **seconds** per page locally, compared to 30-60+ seconds with LLMs.
-   **Reliability**: **100% Uptime**. No dependency on external APIs, meaning no 429 Rate Limit errors or random 503 outages.
-   **Accuracy**: Enforced schema validation guarantees that extracted data always matches the strict `[Note | Bank 2023 | Bank 2022 | Group 2023 | Group 2022]` format required for financial analysis.
-   **Scalability**: Capable of processing batch requests in parallel (Multi-threaded) without hitting provider quotas.

## Summary

This tool transforms raw PDF annual reports into queryable, structured JSON data. It bridges the gap between unstructured financial documents and quantitative analysis, enabling automated insights into company performance across sectors.

---

## License

This project is part of the Stock Exchange Prediction Model Project.

**Version:** 1.0
**Last Updated:** February 2026

**Usage & License**

This repository is public for **viewing and educational reference only**.

Reproduction, modification, redistribution, or commercial use of
any part of this codebase is **strictly prohibited** without explicit
written permission from the author.

© 2026 Osanda Muthukumarana. All rights reserved.
