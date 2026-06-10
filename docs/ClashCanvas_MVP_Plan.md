# ClashCanvas — MVP 1 Plan
*A brainstorm-to-build document for Claude Code and Lucy*

---

## 🧭 What This File Is

This is the master plan for building ClashCanvas. It was written after a full brainstorming session and captures every decision made, every decision left open, and clear instructions for how Claude Code should work with Lucy on this project.

**Read this before writing a single line of code.**

---

## 🎯 What ClashCanvas Is (Plain English)

ClashCanvas is a web app where a user types any debate topic — "Social media does more harm than good," "Cats are better than dogs" — hits a button, and watches two AI models argue it out in real time. When the debate ends, a beautiful shareable card appears showing who "won," which logical mistakes each side made, and how strong their arguments were.

The user does nothing except type a topic. The app does everything else.

It is built for regular people on Twitter and Reddit — not academics, not developers. It needs to feel fast, look stunning, and produce something people want to screenshot and share.

---

## 👤 The User

- General public. Twitter scrollers. Reddit browsers.
- Zero patience. If nothing happens in 30 seconds, they leave.
- They share things to provoke reactions, not to educate.
- They will not read paragraphs. Visuals carry everything.
- The share motivation is: "look at this wild thing" or "HA I knew Side A would win."

---

## 🗺️ MVP 1 Scope — What We Are Building

MVP 1 is **Quick Mode only.** One mode, no choices, no complexity at the door.

### The Complete User Flow

1. User lands on a clean, minimal page. One text field. One button. A spicy placeholder topic to show them how it works.
2. User types a topic and hits **Start Debate.**
3. The app spins up two AI debaters — Side A (For) and Side B (Against).
4. A fast, **3-4 round debate** plays out on screen with live visual feedback as text streams in.
5. Behind the scenes, while the debate runs, the ML pipeline is already analyzing each argument as it arrives.
6. When the debate ends, the **End Card** appears:
   - The topic
   - A declared winner (or "Too Close to Call") based on ML scoring
   - Fallacy count for each side ("Side A made 2 logical errors")
   - Argument strength score for each side (visual bar or meter)
   - One highlighted "best moment" — the single most dramatic exchange
7. A **Share button** generates a styled card image the user can post directly to Twitter/X or copy as an image.

### What Is NOT In MVP 1
- Deep Mode / longer debates (that's MVP 2)
- Persona picker
- Trending debates feed
- Semantic clash graph
- Bias / rhetorical fingerprint
- User accounts or history
- Voting / community features
- Anything that costs money to run at low traffic

---

## 🤖 The AI Debate Layer (Plain English)

**What is happening here:**

You are calling two separate AI language models (LLMs) and giving each one a different "role." Think of it like hiring two actors and telling one to argue FOR something and one to argue AGAINST it.

- **Debater A** gets a system prompt that says: "You are arguing FOR this topic. Be logical, persuasive, and concise. This is round X of 4."
- **Debater B** gets a system prompt that says: "You are arguing AGAINST this topic. Be logical, persuasive, and concise. Respond directly to what Debater A just said."

They take turns. Each response from A becomes part of the context B reads before responding, and vice versa. This is how you get them to actually clash rather than just monologue.

**The rounds:**
1. Opening statement (each side states their position)
2. Rebuttal (each side attacks the other's opening)
3. Counter-rebuttal (each side defends and pushes back)
4. Closing statement (each side summarizes)

**Streaming:** The responses should stream to the frontend in real time — meaning letters/words appear as they're generated, not all at once after a wait. This makes it feel alive and watchable.

### Which LLMs to Use

The goal is free or near-free. Suggested starting points:

- **Groq API** (free tier) — extremely fast inference, great for the snappy feel MVP 1 needs. Runs open models like Llama 3.
- **Google Gemini API** (free tier) — good quality, generous free quota.

> **Claude Code: You have full freedom to evaluate these choices and suggest better free/low-cost alternatives if you know of ones that would serve the streaming + speed requirements better. Please explain your reasoning to Lucy in plain English if you change this.**

---

## 🧠 The ML Analysis Layer (Plain English)

This is what makes ClashCanvas more than "two APIs talking to each other." This is the real technical heart of the project and what makes it a serious portfolio piece.

**The core concept:** After (or during) the debate, we run each argument through pre-trained machine learning models that analyze the text and return structured data — numbers, labels, scores. That data powers the End Card visuals.

**What is a pre-trained model?** It is a model that someone else already trained on a large dataset. You download it, load it, and use it immediately. No training required. Think of it like downloading a calculator — you didn't build the math, but you're using it. HuggingFace is the platform where thousands of these models live, free to use.

### The Two ML Tasks for MVP 1

#### 1. Fallacy Detection
**What it does:** Reads each argument and flags logical errors — things like "ad hominem" (attacking the person not the idea), "straw man" (misrepresenting the opponent's point), "appeal to emotion" (using feelings instead of logic), etc.

**Why it matters for the product:** It's the most visually dramatic output. "Side A made 3 logical errors" is immediately readable, provokes a reaction, and proves something real is happening under the hood.

**How it works technically:** You pass a sentence or paragraph to the model. It returns a label ("fallacy" / "no fallacy") and ideally a type. Some models also return a confidence score (0.0 to 1.0) — higher means more certain.

**Where to find it:** Search HuggingFace for argument mining or fallacy detection models. Look for ones with high download counts and recent activity as quality signals.

#### 2. Argument Strength Scoring
**What it does:** Reads each argument and returns a numeric score for how persuasive or well-constructed it is.

**Why it matters for the product:** This becomes your "winner" metric. Comparing the average strength score across all of Side A's arguments vs Side B's gives you a defensible, ML-backed winner declaration.

**How it works technically:** The model reads the text and returns a score — usually a number between 0 and 1, or a classification like "strong / weak / moderate." You aggregate these scores per side across all rounds.

**Where to find it:** Search HuggingFace for argument quality, argument strength, or persuasiveness models.

> **Claude Code: These are the two core ML tasks. If you find models that do both in one pass, or better models than what's described, or a smarter architecture for running inference (e.g. running it via HuggingFace Inference API instead of locally to avoid server compute costs), please suggest it. Explain the tradeoff to Lucy in plain English. The hard constraint is: free or near-free at low traffic.**

---

## 🃏 The End Card & Share Mechanic

This is the most important UX moment in the entire app. Everything builds to this.

**The End Card must show:**
- The debate topic (large, readable)
- Side A label and Side B label
- Winner declaration or "Too Close to Call"
- Fallacy count per side (simple number, visually distinct)
- Argument strength bar or score per side
- One "Best Moment" highlight — the single exchange where the scoring swung most dramatically, shown as a short quote pair

**The Share mechanic:**
- A button that generates a static image of the End Card (like a screenshot of just that component)
- User can download it or share directly
- The image should look good on Twitter/X as an attached image — think bold, dark-themed, visually striking

**Technical note for Claude Code:** Generating a shareable image from a DOM element can be done with libraries like `html-to-image` or `dom-to-image`. Server-side with Puppeteer is more robust but adds complexity. For MVP 1, client-side image generation is fine. Please explain your chosen approach to Lucy.

---

## 💰 Cost Constraints (Hard Rule)

This is not a preference. It is a requirement.

- **LLM calls:** Must use free tiers only for MVP 1 (Groq free, Gemini free, or equivalent)
- **ML inference:** Must run either locally, via HuggingFace free Inference API, or equivalent free tier
- **Hosting:** Free tier (Vercel, Railway, Render, HuggingFace Spaces, or equivalent)
- **No paid APIs, no paid model hosting, no paid databases for MVP 1**

> **Claude Code: Every architectural decision must be evaluated through this lens. If something would cost money at low traffic, flag it and suggest the free alternative.**

---

## 🏗️ Stack Decision

**Left intentionally open for Claude Code.**

Lucy's known comfort zone: TypeScript, React, Python. But the best stack for this project takes priority over comfort zone — Claude Code should pick what serves the requirements best.

**Requirements the stack must satisfy:**
- Real-time streaming of debate text to the frontend
- Async ML inference that doesn't block the UI
- Ability to run or call HuggingFace models
- Free to host at low traffic
- Clean separation between frontend and backend

> **Claude Code: Please decide the stack. When you present it to Lucy, explain each piece in plain English — what it is, what job it does in this project, and why you chose it over alternatives. Lucy needs to understand the reasoning so she can make decisions and replicate the architecture herself.**

---

## 📚 Teaching Requirement (Read Carefully)

**This is a learning project. Not just a build project.**

Lucy's goal is not just to have the app exist. Her goal is to understand every layer of it deeply enough to replicate it alone without assistance.

**Claude Code must:**
- Explain every technology choice in plain English before implementing it
- When introducing a new concept (WebSockets, async queues, model inference, etc.), give a one-paragraph plain English explanation of what it is and what job it does here
- Never just drop code without explaining the logic behind it
- When there's a tradeoff or decision point, lay out the options and let Lucy choose
- If Lucy asks "why are we doing it this way," stop and explain fully before continuing
- Build in a way that Lucy could look at any file and understand what it does and why it exists

**The test:** At the end of the build, Lucy should be able to sit down and sketch the architecture on paper from memory. That's the bar.

---

## 🔮 MVP 2 (Future — Do Not Build Now)

Noted here so Claude Code understands the direction without scope-creeping MVP 1.

- **Deep Mode** — longer debates, more rounds, richer ML analysis
- **Semantic clash graph** — visual map of which arguments directly counter each other
- **Bias / rhetorical fingerprint** — tone and style analysis per side
- **Persona picker** — pre-loaded debater archetypes
- **Community voting** — users vote on winner, compared to ML verdict
- **"Go Deeper" button** on the Quick Mode end card that unlocks Deep Mode for that debate

---

## ❓ Open Questions for Claude Code

Before starting, Claude Code should review this plan and ask Lucy about anything unclear. Specifically:

1. Do you have any suggested improvements to the ML model choices or architecture that would serve the free + lean constraint better?
2. Is there a smarter way to handle the debate streaming that Lucy should know about before we start?
3. Are there any MVP 1 features you'd add or remove given what you know about building this type of app?
4. What is your suggested stack and can you explain each piece to Lucy before we begin?

**Do not start building until Lucy has confirmed she's happy with the answers to these questions.**

---

## ✅ Definition of Done for MVP 1

ClashCanvas MVP 1 is complete when:

- [ ] User can type any topic and start a debate
- [ ] 3-4 round debate streams to the screen in real time
- [ ] Fallacy detection runs on each argument and results appear on the End Card
- [ ] Argument strength scoring runs and produces a winner declaration
- [ ] End Card is visually polished and tells the full story at a glance
- [ ] Share button generates a downloadable/shareable image
- [ ] Total cost to run at low traffic = $0
- [ ] Lucy can explain every part of the architecture in her own words

---

*Plan written after brainstorming session. Last updated: June 2026.*
