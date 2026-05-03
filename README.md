# AI Research Assistant

A complete, production-ready Research Assistant Web Application featuring Multi-modal RAG, a Multi-Agent Debate system, and Human-in-the-loop verification.

## Tech Stack
* **Frontend:** React (Vite) + Tailwind CSS (Glassmorphism design)
* **Backend:** FastAPI (Python)
* **Database:** PostgreSQL with `pgvector`
* **AI:** Groq API (`llama3-70b-8192`)
* **Embeddings:** Local `sentence-transformers` (`all-MiniLM-L6-v2`)
* **OCR:** `pytesseract`

## Features Implemented
1. **Multi-modal RAG**: Upload PDFs and Images. Extracts text using OCR and stores chunks using `pgvector`.
2. **Chat Interface**: WebSocket-based chat interface.
3. **Multi-Agent Debate**: Orchestrates 3 AI agents (Generator, Critic, Synthesizer) via Groq to formulate the best answer. Transcript is visible in the UI.
4. **Human-in-the-loop**: Intercepts "Web Search" intents and prompts the user in the UI to Approve or Deny.
5. **Confidence Score & Sources**: Highlights source documents retrieved from RAG.

---

## Setup Instructions

### 1. Database Setup
You need Docker installed to run the PostgreSQL instance with `pgvector`.
```bash
docker-compose up -d
```

### 2. Backend Setup
Requires Python 3.9+. You must have Tesseract OCR installed on your system for PDF/Image extraction.
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Environment Variables
Copy `.env.example` to `backend/.env` and add your **Groq API Key**.

---

## Troubleshooting
* **`greenlet` compilation error on Windows**: If `pip install` fails on `greenlet`, ensure you have Microsoft Visual C++ Build Tools installed, or use a pre-compiled Python distribution like Anaconda.
* **Tesseract Error**: If OCR fails, ensure `tesseract` is installed and added to your system PATH.
