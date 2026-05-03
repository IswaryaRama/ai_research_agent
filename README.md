# AI Research Assistant

A completely local, self-contained Research Assistant Web Application featuring Multi-modal RAG, a Multi-Agent Debate system, and Human-in-the-loop verification.

## Tech Stack
* **Frontend:** React (Vite) + Tailwind CSS (Modern Glassmorphism design)
* **Backend:** FastAPI (Python)
* **Database:** SQLite (Local)
* **Vector Database:** ChromaDB (Local)
* **AI Engine:** Groq API (`llama-3.3-70b-versatile`)
* **Embeddings:** Local `sentence-transformers` (`all-MiniLM-L6-v2`)
* **OCR:** `pytesseract` & `pdf2image`

## Features Implemented
1. **Multi-modal Local RAG**: Upload PDFs and Images. Extracts text using local OCR and stores vector chunks completely locally using ChromaDB, requiring no cloud database.
2. **Chat Interface**: Fast, responsive WebSocket-based chat interface.
3. **Multi-Agent Debate**: Orchestrates 3 AI agents (Generator, Critic, Synthesizer) via Groq to formulate the best possible, logically sound answer. The full debate transcript is visible in the UI.
4. **Human-in-the-loop**: Intercepts "Web Search" intents and prompts the user in the UI to Approve or Deny actions.
5. **Completely Docker-Free**: Runs entirely in a standard Python virtual environment for maximum portability and ease of setup.

---

## Setup Instructions

### 1. Backend Setup
Requires Python 3.9+. You must have Tesseract OCR installed on your system for PDF/Image extraction.
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies (this will download PyTorch and ChromaDB)
pip install -r requirements.txt

# Start the server (runs on http://127.0.0.1:8000)
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables
Create a file named `.env` in the `backend/` folder and add your **Groq API Key**:
```env
GROQ_API_KEY=gsk_your_api_key_here
```

---

## Troubleshooting
* **`sqlite3` version error**: ChromaDB requires a modern version of SQLite. If you encounter an error on older Python versions, ensure your system SQLite is up to date or use `pysqlite3`.
* **Tesseract Error**: If PDF/Image OCR fails, ensure `tesseract` is installed on your system and added to your system PATH.
