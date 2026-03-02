FROM python:3.11-slim

WORKDIR /app


# If you have requirements.txt (recommended)
COPY requirements*.txt ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# Copy app
COPY . .

# If your backend uses a known port, expose it (change if needed)
EXPOSE 5000

# ---- CHANGE THIS CMD to match your real entrypoint ----
# FastAPI example:
CMD ["python", "server.py", "--host", "0.0.0.0", "--port", "5001"]
