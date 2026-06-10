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
Wraps `webis/argument-quality-ibm-reproduced` (a BERT model reproducing IBM Project
Debater's argument-quality research).

`POST /score` with `{ "topic": "...", "texts": ["argument 1", ...] }` →
`{ "scores": [0.0–1.0, ...] }`
