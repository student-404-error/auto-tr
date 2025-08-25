FROM python:3.11-slim

WORKDIR /app

# Copy root-level requirements into image (compose build context is repo root)
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy only backend source into the image
COPY backend/ /app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
