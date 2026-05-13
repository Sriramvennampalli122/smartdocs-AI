# SmartDoc AI

SmartDoc AI is a production-grade RAG (Retrieval-Augmented Generation) document Q&A assistant designed for high-precision information retrieval with integrated hallucination detection.

## 🚀 Getting Started

To run the complete system, you need to start both the Frontend and the Backend.

### 1. Start the Backend (Python)
Open a terminal and run:
```bash
python backend/main.py
```
The backend will start on `http://127.0.0.1:8000`.

### 2. Start the Frontend (Next.js)
In a separate terminal tab, run:
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

## 🔍 Hallucination Detection Engine
Our custom `ConfidenceScorer` (simulated in this MVP) utilizes a multi-signal approach:
1. **Semantic Similarity**: Cosine distance between generated answers and retrieved context.
2. **Keyword Overlap**: Entity verification between source and output.
3. **Refusal Recognition**: High-confidence scoring for accurate negative responses.

---
Built with Precision by **SmartDoc AI Team**.