# SmartDoc AI — Complete Application Documentation
Version: 2.0.0 | Status: Stable | Last Updated: May 2026

---

## 1. OVERVIEW

SmartDoc AI is a full-stack Retrieval-Augmented Generation (RAG) application that allows users to upload PDF documents and ask natural language questions about their content. The AI reads only your document and provides grounded, cited answers — it does not hallucinate from general knowledge.

**Core Capability:** Upload any PDF → Ask any question → Get a precise, page-cited answer.

---

## 2. TECH STACK

### Frontend
| Component | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| AI SDK | Genkit (`@genkit-ai/google-genai`) |
| Runtime | Node.js |

### Backend
| Component | Technology |
|---|---|
| Framework | FastAPI (Python) |
| PDF Parsing | PyMuPDF (`fitz`) |
| Retrieval | TF-IDF (pure Python, no external API) |
| LLM | Groq API — LLaMA 3.3 70B Versatile |
| HTTP Client | `requests` library |
| Server | Uvicorn (ASGI) |

---

## 3. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│              http://localhost:9002                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS FRONTEND  (Port 9002)              │
│  • React UI (dark theme, sidebar + chat layout)         │
│  • FileUpload component → reads PDF as base64           │
│  • ChatWindow component → displays Q&A messages         │
│  • Server Actions (upload-and-process-document.ts)      │
│  • Server Actions (get-ai-answer-with-confidence.ts)    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP calls to backend
                        ▼
┌─────────────────────────────────────────────────────────┐
│              FASTAPI BACKEND  (Port 8001)               │
│                                                         │
│  POST /upload                                           │
│    1. Receive PDF bytes                                 │
│    2. Extract text page-by-page (PyMuPDF)               │
│    3. Chunk text (800 chars, 100 overlap)               │
│    4. Build TF-IDF index (in-memory)                    │
│    5. Return doc_id + chunk count                       │
│                                                         │
│  POST /ask                                              │
│    1. Receive question + doc_id                         │
│    2. TF-IDF cosine similarity search → top 5 chunks    │
│    3. Build prompt with context                         │
│    4. Call Groq API (LLaMA 3.3 70B)                     │
│    5. Return answer + confidence + sources              │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS REST call
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  GROQ CLOUD API                         │
│  Model: llama-3.3-70b-versatile                         │
│  Endpoint: api.groq.com/openai/v1/chat/completions      │
│  Free tier: 6,000 tokens/min, 500,000 tokens/day        │
└─────────────────────────────────────────────────────────┘
```

---

## 4. FILE STRUCTURE

```
project/
├── .env                          ← API keys (GROQ_API_KEY, GEMINI_API_KEY, etc.)
├── package.json                  ← Node.js deps + npm scripts
├── next.config.ts                ← Next.js config
├── tailwind.config.ts            ← Tailwind theme
│
├── backend/
│   ├── main.py                   ← FastAPI app (entire RAG backend)
│   └── requirements.txt          ← Python dependencies
│
└── src/
    ├── app/
    │   ├── page.tsx              ← Main UI page (sidebar + chat layout)
    │   ├── layout.tsx            ← Root layout, metadata
    │   └── globals.css           ← Global styles
    │
    ├── ai/
    │   ├── genkit.ts             ← Genkit client config (googleAI plugin)
    │   └── flows/
    │       ├── upload-and-process-document.ts   ← Upload server action
    │       └── get-ai-answer-with-confidence-flow.ts  ← Ask server action
    │
    └── components/
        ├── ui/                   ← shadcn/ui primitives
        └── smartdoc/
            ├── ChatWindow.tsx    ← Chat message area + input box
            ├── FileUpload.tsx    ← PDF drag-and-drop uploader
            ├── MessageBubble.tsx ← Individual chat message
            ├── HallucinationBadge.tsx  ← Risk indicator badge
            └── SourcePanel.tsx   ← Source page citations panel
```

---

## 5. ENVIRONMENT VARIABLES (.env)

```env
# Required for LLM generation (Groq)
GROQ_API_KEY=gsk_...

# Backend URL (Next.js uses this to find the Python server)
BACKEND_API_URL=http://127.0.0.1:8001

# Google AI keys (used by Genkit on frontend — optional fallback)
GEMINI_API_KEY=AIza...
GOOGLE_GENAI_API_KEY=AIza...
GOOGLE_API_KEY=AIza...
```

**To get a GROQ_API_KEY:** Visit https://console.groq.com → Sign up → API Keys → Create Key

---

## 6. RAG PIPELINE — STEP BY STEP

### Phase 1: Document Ingestion (Upload)

1. **User selects a PDF** in the browser (max 10 MB)
2. **FileUpload.tsx** reads it as a base64 `dataURI`
3. **upload-and-process-document.ts** (server action) sends it to `POST /upload`
4. **Backend** decodes bytes → opens with PyMuPDF
5. **Text extraction:** PyMuPDF reads each page's text layer
6. **Chunking:** Text split into 800-character chunks with 100-character overlap
7. **TF-IDF indexing:**
   - Tokenize all chunks (remove stopwords, lowercase)
   - Compute document frequency (DF) for each term
   - Compute IDF = log((N+1)/(df+1)) + 1
   - Build normalized TF-IDF vectors for all chunks
8. **Store in memory:** `document_store[doc_id] = {chunks, index}`
9. **Return** `{doc_id, chunks, filename}` to frontend

### Phase 2: Question Answering (Ask)

1. **User types a question** in ChatWindow
2. **get-ai-answer-with-confidence-flow.ts** sends `{question, doc_id}` to `POST /ask`
3. **Backend TF-IDF Search:**
   - Tokenize the question
   - Build TF-IDF vector for the question
   - Compute cosine similarity against all chunk vectors
   - Return top 5 most relevant chunks
4. **Prompt construction:**
   ```
   System: You are an expert document analysis assistant...
   User:   CONTEXT: [Page 1] ... [Page 3] ...
           QUESTION: <user question>
           ANSWER:
   ```
5. **Groq API call:** POST to `api.groq.com/openai/v1/chat/completions`
   - Model: `llama-3.3-70b-versatile`
   - Temperature: 0.2 (factual, low creativity)
   - Max tokens: 1024
6. **Response returned:** `{answer, confidence, confidence_label, hallucination_risk, sources}`
7. **UI renders:** Answer bubble + source panels with page numbers

---

## 7. RETRIEVAL — TF-IDF EXPLAINED

TF-IDF (Term Frequency–Inverse Document Frequency) is a classical information retrieval technique used to find the most relevant text chunks for a given question.

- **TF (Term Frequency):** How often a word appears in a chunk
- **IDF (Inverse Document Frequency):** How rare the word is across all chunks (rare words are more informative)
- **TF-IDF score:** TF × IDF — high for words that are frequent in one chunk but rare overall
- **Cosine similarity:** Measures the angle between the question vector and each chunk vector

**Why TF-IDF instead of embeddings?**
- Zero API calls during indexing — instant upload processing
- No embedding API quota issues
- Works well for factual document retrieval
- Deterministic — same query always returns same chunks

---

## 8. CONFIDENCE & HALLUCINATION SCORING

The backend computes a confidence score from the TF-IDF cosine similarity of the best matching chunk:

| TF-IDF Score | Confidence Label | Hallucination Risk |
|---|---|---|
| ≥ 0.15 | High | Safe |
| 0.05 – 0.14 | Medium | Uncertain |
| < 0.05 | Low | Risky |

The display confidence (0–1) is `min(raw_score × 6, 1.0)` for better UX representation.

---

## 9. API ENDPOINTS

### GET /
Health check
```json
{"status": "online", "message": "SmartDoc AI Backend v8 (Groq-powered) is active"}
```

### POST /upload
**Request:** multipart/form-data with `file` (PDF)
**Response:**
```json
{
  "doc_id": "uuid-string",
  "chunks": 52,
  "filename": "document.pdf"
}
```
**Errors:**
- `400` — Not a PDF or empty file
- `422` — No extractable text (scanned/image PDF)
- `500` — Server error

### POST /ask
**Request:**
```json
{"question": "What is the main topic?", "doc_id": "uuid-string"}
```
**Response:**
```json
{
  "answer": "The document discusses...",
  "confidence": 0.87,
  "confidence_label": "High",
  "hallucination_risk": "Safe",
  "sources": [
    {"text": "first 300 chars of chunk...", "page": 3},
    {"text": "another chunk...", "page": 7}
  ]
}
```
**Errors:**
- `404` — doc_id not found (server restarted, re-upload needed)
- `500` — Groq API error or other failure

---

## 10. PYTHON DEPENDENCIES

```txt
fastapi
uvicorn
python-multipart
PyMuPDF
requests
google-generativeai
google-genai
numpy
python-dotenv
```

Install: `pip install -r backend/requirements.txt`

---

## 11. NPM SCRIPTS

```json
"dev"     : "next dev --turbopack -p 9002"    ← Start frontend
"backend" : "python3 backend/main.py || python backend/main.py"  ← Start backend
"build"   : "next build"                       ← Production build
"start"   : "next start -p 9002"               ← Run production build
```

---

## 12. HOW TO RUN

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key (free at https://console.groq.com)

### Step 1 — Install dependencies
```bash
# Python
pip install -r backend/requirements.txt

# Node.js
npm install
```

### Step 2 — Configure .env
```env
GROQ_API_KEY=your_groq_key_here
BACKEND_API_URL=http://127.0.0.1:8001
```

### Step 3 — Start backend (Terminal 1)
```bash
npm run backend
# or: python backend/main.py
# Runs on: http://localhost:8001
```

### Step 4 — Start frontend (Terminal 2)
```bash
npm run dev
# Runs on: http://localhost:9002
```

### Step 5 — Use the app
1. Open http://localhost:9002
2. Click "Click or drag PDF" in the sidebar
3. Select your PDF → Click "Analyze Document"
4. Wait for "Ready: N chunks indexed"
5. Type your question in the chat box
6. Receive a grounded, cited AI answer

---

## 13. KNOWN LIMITATIONS

| Limitation | Details |
|---|---|
| Scanned PDFs | Image-only PDFs have no text layer — upload will fail with a clear error |
| In-memory storage | Indexed documents are lost when the backend restarts — re-upload required |
| 10 MB limit | Large PDFs are rejected at the frontend |
| Single document | Currently one document per session; re-upload to switch |
| TF-IDF retrieval | Exact keyword matches work best; synonyms/paraphrases may reduce retrieval accuracy |

---

## 14. TROUBLESHOOTING

| Problem | Solution |
|---|---|
| `ECONNREFUSED` on upload | Backend is not running — run `npm run backend` |
| `Port 8001 already in use` | Kill existing: `taskkill /F /PID <pid>` (find PID via `netstat -ano \| findstr 8001`) |
| `Document not found` | Backend was restarted — re-upload your PDF |
| `No text extracted` | PDF is scanned/image-based — convert to text PDF first |
| Groq 429 error | Rate limit hit — wait 1 minute and try again |
| Frontend won't start | Port 9002 busy — another Next.js instance running, kill it |

---

## 15. FUTURE IMPROVEMENTS

- **Persistent storage** — Replace in-memory store with ChromaDB or SQLite for persistence across restarts
- **Semantic embeddings** — Replace TF-IDF with dense embeddings (when a working embedding API key is available)
- **Multi-document** — Support querying across multiple uploaded documents
- **Streaming answers** — Stream Groq responses token-by-token for better UX
- **OCR support** — Add Tesseract OCR for scanned PDF support
- **Authentication** — Add user sessions to maintain document history

---

## 16. SECURITY NOTES

- The `.env` file contains secret API keys — **never commit it to Git**
- The backend allows all CORS origins (`*`) — restrict in production
- No authentication is implemented — add auth before deploying publicly
- API keys should be rotated periodically

---

*SmartDoc AI — Built with FastAPI, Next.js, Groq LLaMA 3.3, and TF-IDF RAG*
