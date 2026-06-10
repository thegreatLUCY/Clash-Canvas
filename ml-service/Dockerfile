# HuggingFace Spaces runs this on a free CPU machine. Port 7860 is the
# port Spaces expects apps to listen on.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Pre-download the model into the image so cold starts don't re-fetch it.
RUN python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; \
    AutoTokenizer.from_pretrained('webis/argument-quality-ibm-reproduced'); \
    AutoModelForSequenceClassification.from_pretrained('webis/argument-quality-ibm-reproduced')"

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
