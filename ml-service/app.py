"""ClashCanvas strength scorer — a tiny API around a pre-trained HuggingFace model.

This runs as a free CPU Space on HuggingFace. It loads a DistilBERT model
fine-tuned for argument effectiveness (trained on the Feedback Prize corpus,
which labels real arguments Ineffective / Adequate / Effective), then scores
any text you POST to /score on a 0..1 quality scale.

The 3-class output collapses to one number as an expected value:
    score = P(Ineffective)*0.0 + P(Adequate)*0.5 + P(Effective)*1.0
so a confidently-effective argument scores near 1, a confidently-weak one near 0.
"""

from fastapi import FastAPI
from pydantic import BaseModel
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_ID = "FareehaAly/fator-argument-quality"

# How much each predicted class is "worth" in the final 0..1 score.
CLASS_VALUE = {"Ineffective": 0.0, "Adequate": 0.5, "Effective": 1.0}

app = FastAPI(title="ClashCanvas Strength Scorer")

# Loaded once when the Space boots, reused for every request.
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
model.eval()

# Map class index → value using the model's own label names, so this keeps
# working even if the label order in the config ever changes.
label_values = torch.tensor(
    [CLASS_VALUE[model.config.id2label[i]] for i in range(model.config.num_labels)]
)


class ScoreRequest(BaseModel):
    topic: str  # accepted for API stability; this model scores text alone
    texts: list[str]


@app.get("/")
def health():
    return {"status": "ok", "model": MODEL_ID}


@app.post("/score")
def score(req: ScoreRequest):
    scores = []
    with torch.no_grad():
        for text in req.texts:
            inputs = tokenizer(text, truncation=True, max_length=512, return_tensors="pt")
            probs = torch.softmax(model(**inputs).logits.squeeze(0), dim=-1)
            scores.append((probs * label_values).sum().item())
    return {"scores": scores}
