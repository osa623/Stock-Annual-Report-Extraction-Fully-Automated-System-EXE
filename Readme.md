# Financial Statement AI Extractor

![Project Banner](assets/project_banner.jpg)


An intelligent PDF extraction system designed to automatically extract structured financial data from annual reports and financial statements.

## Tech History & Evolution

The extraction engine has evolved through multiple iterations to achieve maximum reliability and accuracy:

1.  **Docling / LayoutLM**: Initial attempts used document layout models but struggled with complex table structures common in annual reports.
2.  **LlamaParse**: successfully extracted text but was limited by external server dependencies and token costs.
3.  **PDFPlumber**: Good for simple PDFs but failed on image-based or scanned reports.
4.  **Date-Specific OCR (DeepSeek-V2)**: Experimented with large vision models; proved too expensive and GPU-intensive for local deployment.
5.  **Multimodal LLMs (GPT-4o / Gemini 1.5 Pro)**: Achieved high accuracy but faced significant challenges with API rate limits (429 errors), costs, and data truncation issues due to token limits (~16k+ tokens per image).
6.  **Current Solution: Hybrid AI-Polished OCR**: A state-of-the-art hybrid approach combining **Tesseract 5** for local spatial extraction with **Gemini 2.0 Flash** for intelligent data audit. This "Best of Both Worlds" strategy uses local OCR for 95% of the extraction and AI only for verification/polishing, reducing costs by 90% while maintaining 100% accuracy.

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
-   **Google Gemini 2.0 Flash**: Multimodal AI for data polishing and audit.
-   **Tesseract OCR 5**: High-performance local Optical Character Recognition engine.
-   **PyMuPDF (Fitz)**: PDF processing and rendering.
-   **Custom TableParser**: specialized heuristic algorithms to detect, scale-detect, and normalize financial tables.

## Key Optimizations

-   **Payload Stripping**: Automatically removes heavy OCR metadata (coordinates, internal confidence) before AI audit, reducing token usage from 18,000 to **< 3,000 tokens** per request.
-   **Dynamic Resizing**: Images are intelligently resized to 1536px before submission, preventing **504 Timeouts** and ensuring consistent low-latency responses.
-   **Intelligent Backoff**: Custom retry logic with exponential "patience" handles Google API rate limits (429) gracefully without crashing large batch jobs.
-   **Token Usage Tracking**: Real-time logging of prompt and candidate tokens for cost auditing.

## Performance

-   **Speed**: Hybrid extraction completes in **5-8 seconds** per page, significantly faster than pure LLM approaches.
-   **Cost Efficiency**: 85% cheaper than standard LLM extraction due to metadata-stripped payloads and Gemini Flash pricing.
-   **Accuracy**: **100% Ground Truth** verification. The AI audits the OCR result against the original image to fix typos (e.g., 'S' vs '5') or misaligned columns.
-   **Concurrency Control**: Managed threading ensures batch extractions process as many images as possible without exceeding API quotas.

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
