
# 🧠 Neural Arbiter

> **A Multi-Agent AI Debate System** <br>
> *Built for the Protex Hackathon*

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-State_Machine-orange.svg)](https://python.langchain.com/docs/langgraph)

Two AI agents. One controversial topic. A third AI judging every argument in real-time. 

Neural Arbiter is a multi-agent system where two large language models — powered by Google Gemini and Groq's Llama 3 — debate each other on any topic. A third LLM acts as an impartial judge, scoring credibility, detecting logical fallacies, and ultimately delivering a structured final verdict. The entire process streams live to a React dashboard with argument graphs, credibility charts, and a real-time transcript.

## 🎯 The Problem it Solves
We're drowning in information but starving for analysis. Anyone can find 10 articles that "prove" something — and 10 more that say the opposite. Neural Arbiter forces structured adversarial reasoning: one agent builds a case, the other tears it apart, and an independent judge evaluates every exchange on logical merit. 

Think of it as a debate club where every participant has read everything ever written — and none of them get tired or emotional.

---

## ✨ Key Features & The Agents

### 🎙️ The Debaters
* **Agent A (Google Gemini 1.5 Flash):** Takes the "for" position. Grounded in the web search context fetched at the start of each round. Prompted to argue like a Nobel-caliber theoretical physicist — no sci-fi, no hand-waving, mathematics only.
* **Agent B (Groq Llama 3 8B):** Takes the "against" position. Receives the full transcript and web context. Responds to Agent A's last argument directly before advancing its own counter-claim.

### ⚖️ The Judge
* **Gemini (with Groq fallback):** Evaluates each exchange and outputs structured JSON: credibility scores (0–100), bias detection, fallacy identification, and an academic summary. If Gemini fails, it automatically falls back to Groq to ensure no interruption to the debate flow.

### 🖥️ Real-Time Dashboard
The React + Vite frontend features four main panels that update live:
- **Transcript:** The live debate feed, color-coded by agent.
- **Argument Graph:** A ReactFlow node graph mapping the logical structure of claims.
- **Credibility Chart:** A Recharts line chart tracking each agent's score across rounds.
- **Final Verdict:** A structured panel with the judge's conclusion, confidence score, and bias analysis.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Orchestration** | LangGraph |
| **Agent A** | Google Gemini 1.5 Flash (`langchain-google-genai`) |
| **Agent B** | Groq Llama 3 8B (`langchain-groq`) |
| **Judge** | Gemini → Groq fallback, structured output via Pydantic |
| **Web Search** | DuckDuckGo (`duckduckgo-search`) |
| **Backend API** | FastAPI + WebSockets |
| **Frontend** | React 18 + TypeScript + Vite |
| **Visualization** | Recharts (credibility) + ReactFlow (argument graph) |

---

## 🏗️ Architecture Workflow

The backend is a **LangGraph state machine**. Each node reads from a shared state dict and returns only its delta. The FastAPI server streams every state snapshot over a WebSocket connection as it's produced.

```text
User enters topic
       │
       ▼
[Search Node] ──── DuckDuckGo real-time web search
       │
       ▼
[Debater Node] ──── Agent A (Gemini) speaks
       │
       ▼
[Judge Node] ──── Scores agents, detects fallacies
       │
       ├── rounds < 2? ──► [Debater Node] ──── Agent B (Llama 3) speaks
       │                          │
       │                   [Judge Node] ──── Evaluates again
       │
       └── rounds ≥ 2? ──► [Final Verdict Node] ──── Structured conclusion
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Google AI Studio API Key](https://aistudio.google.com/) (Free tier works)
- [Groq API Key](https://console.groq.com/) (Free tier works)

### 1. Backend Setup
```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up your environment variables
cp .env.example .env
```
Edit `.env` and add your keys:
```env
GOOGLE_API_KEY=your_google_ai_studio_key_here
GROQ_API_KEY=your_groq_key_here
TEST_MODE=False
```
*(Set `TEST_MODE=True` to run without API keys — the system will use mock responses to test the UI).*

**Start the server:**
```bash
python main.py
```
*The backend starts on `http://localhost:8000`. The WebSocket endpoint is at `ws://localhost:8000/ws/debate`.*

### 2. Frontend Setup
```bash
cd frontend

npm install
npm run dev
```
*The frontend runs on `http://localhost:5173`.*

---

## 📁 Project Structure

```text
ai-debater/
├── backend/
│   ├── main.py           # FastAPI app + WebSocket handler + state serializer
│   ├── graph.py          # LangGraph state machine definition
│   ├── models.py         # DebateState TypedDict
│   ├── config.py         # API keys, model names, constants
│   ├── debater_node.py   # Agent A + Agent B LLM calls
│   ├── judge_node.py     # Round judge + final verdict
│   ├── search_node.py    # DuckDuckGo web search
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.tsx           # Main app & state management
    │   ├── types.ts          # TypeScript interfaces
    │   └── components/
    │       ├── Chat.tsx      # Live debate transcript
    │       ├── Chart.tsx     # Credibility score line chart
    │       ├── Graph.tsx     # Argument node graph (ReactFlow)
    │       ├── FinalVerdict.tsx 
    │       └── Sidebar.tsx   
    ├── package.json
    └── vite.config.ts
```

---

## 💡 Design Decisions & Limitations

* **LangGraph over standard chains:** The debate loop isn't linear. LangGraph's conditional edges handle cyclical routing cleanly without manual loop management.
* **Dual LLM Providers:** Different base models have genuinely different writing styles. Gemini leans toward mathematical formalism, while Llama 3 is more direct. The contrast makes debates more dynamic.
* **WebSocket Streaming:** LLM calls take 2–5 seconds. WebSocket streaming lets the frontend react the instant each node finishes, eliminating choppy REST API polling.
* **Known Limitations:** * The debate is currently fixed at 2 rounds (4 agent turns). 
  * DuckDuckGo search occasionally returns no results for niche topics (falls back to mock context).
  * The Judge's structured JSON output can occasionally fail on very long transcripts, though the Groq fallback covers most edge cases.

---

## 👤 Author
**Tanmay Kumar** 
*If you're reading this during judging — yes, the agents really are arguing with each other. No, we didn't script the arguments.*
```