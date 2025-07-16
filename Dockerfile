FROM python:3.10-slim

# Install system dependencies for OpenCV and Tesseract
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    tesseract-ocr \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/ .
COPY start_server.py .
RUN pip install --no-cache-dir -r requirements.txt
RUN mkdir -p uploads

EXPOSE 8000
CMD ["python", "start_server.py"]
