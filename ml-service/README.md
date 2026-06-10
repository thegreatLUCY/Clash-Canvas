---
title: ClashCanvas Scorer
emoji: ⚖️
colorFrom: red
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# ClashCanvas Strength Scorer

Argument-quality scoring API for [ClashCanvas](https://github.com/thegreatLUCY/Clash-Canvas).
Wraps `FareehaAly/fator-argument-quality`, a DistilBERT model fine-tuned on the
Feedback Prize argument-effectiveness corpus (Ineffective / Adequate / Effective),
collapsed to a 0–1 score as an expected value over the three classes.

`POST /score` with `{ "topic": "...", "texts": ["argument 1", ...] }` →
`{ "scores": [0.0–1.0, ...] }`
