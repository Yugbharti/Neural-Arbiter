# 🧠 Neural Arbiter — Multi-Agent AI Debate System

> **Built for Protex Hackathon**

Two AI agents. One controversial topic. A third AI judging every argument in real-time.

Neural Arbiter is a multi-agent system where two large language models — powered by Google Gemini and Groq's Llama 3 — debate each other on any topic you throw at them. A third LLM acts as an impartial judge, scoring credibility, detecting logical fallacies, and ultimately delivering a structured final verdict. The entire process streams live to a React dashboard with argument graphs, credibility charts, and a real-time transcript.

---

## 🎯 What Problem Does This Solve?

We're drowning in information but starving for analysis. Anyone can find 10 articles that "prove" something — and 10 more that say the opposite. Neural Arbiter forces structured adversarial reasoning: one agent builds a case, the other tears it apart, and an independent judge evaluates every exchange on logical merit. It's less about finding "the answer" and more about understanding *why* something is or isn't true.

Think of it as a debate club where every participant has read everything ever written — and none of them get tired or emotional.

---

## 🏗️ Architecture

```
User enters topic
       │
       ▼
[Search Node] ──── DuckDuckGo real-time web search
       │
       ▼
[Debater Node] ──── Agent A (Gemini 1.5 Flash) speaks
       │
       ▼
[Judge Node] ──── Scores both agents, detects fallacies
       │
       ├── rounds < 2? ──► [Debater Node] ──── Agent B (Groq Llama 3) speaks
       │                          │
       │                   [Judge Node] ──── Evaluates again
       │
       └── rounds ≥ 2? ──► [Final Verdict Node] ──── Structured conclusion
```

The whole backend is a **LangGraph state machine** — each node reads from a shared state dict and returns only its delta. The FastAPI server streams every state snapshot over a WebSocket connection as it's produced, so the frontend updates in real-time without polling.

---

## 🤖 The Agents

### Agent A — Google Gemini 1.5 Flash
Takes the "for" position. Grounded in the web search context fetched at the start of each round. Prompted to argue like a Nobel-caliber theoretical physicist — no sci-fi, no hand-waving, mathematics only.

### Agent B — Groq Llama 3 8B
Takes the "against" position. Also receives the full transcript and web context. Responds to Agent A's last argument directly before advancing its own counter-claim.

### The Judge — Gemini (with Groq fallback)
Evaluates each exchange and outputs structured JSON: credibility scores (0–100), bias detection, fallacy identification, and a two-sentence academic summary of the round. If Gemini fails, it automatically falls back to Groq — no interruption to the debate flow.

---

## 🖥️ Frontend

Built with **React + TypeScript + Vite**. The dashboard has four main panels that update live as the debate unfolds:

- **Transcript** — The live debate feed, styled like a chat interface, color-coded by agent
- **Argument Graph** — A ReactFlow node graph showing the logical structure of claims
- **Credibility Chart** — Recharts line chart tracking each agent's score across rounds
- **Final Verdict** — Structured panel with the judge's conclusion, confidence score, and bias analysis

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Orchestration | LangGraph |
| Agent A | Google Gemini 1.5 Flash (`langchain-google-genai`) |
| Agent B | Groq Llama 3 8B (`langchain-groq`) |
| Judge | Gemini → Groq fallback, structured output via Pydantic |
| Web Search | DuckDuckGo (`duckduckgo-search`) |
| Backend API | FastAPI + WebSockets |
| Frontend | React 18 + TypeScript + Vite |
| Visualization | Recharts (credibility scores) + ReactFlow (argument graph) |

---

## 🚀 Running It Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Google AI Studio API key (free tier works)
- A Groq API key (free tier works)

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up your environment variables
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY and GROQ_API_KEY

# Start the server
python main.py
```

The backend starts on `http://localhost:8000`. The WebSocket endpoint is at `ws://localhost:8000/ws/debate`.

### Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### Environment Variables

Create a `.env` file in `/backend` with:

```env
GOOGLE_API_KEY=your_google_ai_studio_key_here
GROQ_API_KEY=your_groq_key_here
TEST_MODE=False
```

Set `TEST_MODE=True` if you want to run without API keys — the agents return hardcoded arguments and the judge returns mock scores. Useful for testing the frontend or the graph logic in isolation.

---

## 🔁 How a Debate Works (Step by Step)

1. You type a topic in the frontend and hit **Start Debate**
2. The frontend sends the topic over WebSocket to the backend
3. The **Search Node** runs a live DuckDuckGo query and stores relevant snippets in state
4. **Agent A** (Gemini) reads the search context and delivers its opening argument
5. The **Judge** scores Agent A's argument, notes any fallacies, updates credibility scores
6. **Agent B** (Llama 3) reads the transcript + search context and delivers a rebuttal
7. The **Judge** evaluates again — round complete
8. This repeats for up to 2 full rounds (4 agent turns total)
9. The **Final Verdict Node** reads the complete transcript and outputs a structured conclusion
10. Every state update streams to the frontend in real-time — the chart and graph update as the debate progresses

---

## 📁 Project Structure

```
ai-debater/
├── backend/
│   ├── main.py           # FastAPI app + WebSocket handler + state serializer
│   ├── graph.py          # LangGraph state machine definition
│   ├── models.py         # DebateState TypedDict
│   ├── config.py         # API keys, model names, constants
│   ├── debater_node.py   # Agent A + Agent B LLM calls
│   ├── judge_node.py     # Round judge + final verdict (Pydantic structured output)
│   ├── search_node.py    # DuckDuckGo web search
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.tsx           # Main app, WebSocket connection, state management
    │   ├── types.ts          # TypeScript interfaces matching backend state
    │   └── components/
    │       ├── Chat.tsx       # Live debate transcript
    │       ├── Chart.tsx      # Credibility score line chart
    │       ├── Graph.tsx      # Argument node graph (ReactFlow)
    │       ├── FinalVerdict.tsx  # Final verdict panel
    │       └── Sidebar.tsx    # Topic input + debate controls
    ├── package.json
    └── vite.config.ts
```

---

## 💡 Design Decisions Worth Mentioning

**Why LangGraph instead of just chaining LLM calls?**
The debate loop isn't linear — the judge decides whether to continue or finalize based on state. LangGraph's conditional edges handle this cleanly without manual loop management, and the shared state dict makes it trivial to pass context between nodes without threading it through function arguments.

**Why two different LLM providers?**
Partially practical (fallback if one goes down), partially intentional — different base models have genuinely different writing styles and reasoning tendencies. Gemini tends toward mathematical formalism; Llama 3 is more direct and confrontational. The contrast actually makes the debates more interesting.

**Why WebSockets instead of REST + polling?**
LLM calls can take 2–5 seconds each. Polling would feel choppy and waste requests. WebSocket streaming lets the frontend react the instant each node finishes, and the 1.2-second pacing delay gives charts and graphs time to animate smoothly between updates.

**Structured output from the Judge**
The judge doesn't just return text — it returns a Pydantic-validated JSON object with typed fields for scores, fallacy names, and summaries. This means the frontend can reliably render charts and graphs without parsing or cleaning LLM output.

---

## ⚠️ Known Limitations

- The debate is currently fixed at 2 rounds (4 agent turns). Configurable via `graph.py`.
- DuckDuckGo search occasionally returns no results for niche topics — the system falls back to mock context in that case.
- The Judge's structured output can fail on very long transcripts due to context window limits. The fallback chain (Gemini → Groq) covers most cases.

---

## 👤 Author

**Tanmay Kumar**  
Built during Protex Hackathon, April 2026

---

*If you're reading this during judging — yes, the agents really are arguing with each other. No, we didn't script the arguments.*
