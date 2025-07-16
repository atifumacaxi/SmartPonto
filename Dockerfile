FROM python:3.10-slim

WORKDIR /app
COPY backend/main.py .
COPY backend/app /app/app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN mkdir -p uploads

EXPOSE 8000
CMD ["gunicorn", "main:app", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
