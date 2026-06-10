"""ClashCanvas strength scorer — a tiny API around a pre-trained HuggingFace model.

This runs as a free CPU Space on HuggingFace. It loads
webis/argument-quality-ibm-reproduced (a BERT model that reproduces IBM Project
Debater's argument-quality research) once at startup, then scores any text you
POST to /score on a 0..1 quality scale.

Deploy: create a new Space at huggingface.co/spaces (SDK: Docker), and push
this folder's three files (app.py, requirements.txt, Dockerfile) to it.
"""

from fastapi import FastAPI
from pydantic import BaseModel
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_ID = "webis/argument-quality-ibm-reproduced"

app = FastAPI(title="ClashCanvas Strength Scorer")

# Loaded once when the Space boots, reused for every request.
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
model.eval()


class ScoreRequest(BaseModel):
    topic: str
    texts: list[str]


@app.get("/")
def health():
    return {"status": "ok", "model": MODEL_ID}


@app.post("/score")
def score(req: ScoreRequest):
    scores = []
    with torch.no_grad():
        for text in req.texts:
            # The model was trained on (argument, topic) pairs, so we feed both.
            inputs = tokenizer(
                text, req.topic, truncation=True, max_length=512, return_tensors="pt"
            )
            logit = model(**inputs).logits.squeeze().item()
            # Squash the raw regression output into a guaranteed 0..1 range.
            scores.append(torch.sigmoid(torch.tensor(logit)).item())
    return {"scores": scores}
