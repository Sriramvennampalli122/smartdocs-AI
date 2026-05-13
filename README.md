# SmartDoc AI

SmartDoc AI is a production-grade RAG (Retrieval-Augmented Generation) document Q&A assistant designed for high-precision information retrieval with integrated hallucination detection.

## 🚀 Getting Started

To run the complete system, you need to start both the Frontend and the Backend. **You will need two terminal tabs open.**

### 1. Start the Backend (Python)
In your first terminal tab, run:
```bash
npm run backend
```
*Alternatively, you can run:* `python backend/main.py`

The backend will start on `http://127.0.0.1:8000`. You should see a message saying "Uvicorn running on...".

### 2. Start the Frontend (Next.js)
In a second terminal tab, run:
```bash
npm run dev
```
The frontend will be available on `http://localhost:9002`.

## 🛠 Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Lucide Icons, ShadCN UI.
- **AI/LLM**: Genkit, Google Gemini (via `@genkit-ai/google-genai`).
- **Backend**: FastAPI (Python), Uvicorn.

## ⚙️ Configuration
Ensure your `.env` file contains:
- `GEMINI_API_KEY`: Your Google AI API Key.
- `BACKEND_API_URL`: `http://127.0.0.1:8000`

---
Built with Precision by **SmartDoc AI Team**.
