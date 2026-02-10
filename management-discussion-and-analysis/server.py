"""
Entry-point script — run the MD&A Extraction Service.

Usage:
    python server.py
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=5001,
        reload=True,
    )
