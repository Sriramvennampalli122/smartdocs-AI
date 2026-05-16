
import os
import uuid
import math
import logging
import re
import json
import requests as http_requests
from pathlib import Path
from typing import List, Tuple
from collections import Counter

# ── Load .env ─────────────────────────────────────────────────────────────────
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _, _v = _line.partition('=')
                os.environ.setdefault(_k.strip(), _v.strip())

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("smartdoc-ai-backend")

# ── Groq API (free, no project restrictions) ──────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"  # confirmed working

if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not set. Get a free key at https://console.groq.com")

CHUNK_SIZE    = 800
CHUNK_OVERLAP = 100
TOP_K         = 5

document_store: dict = {}

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="SmartDoc AI Backend", version="8.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

# ── Pydantic models ───────────────────────────────────────────────────────────
class QuestionRequest(BaseModel):
    question: str
    doc_id: str

class Source(BaseModel):
    text: str
    page: int

class AskResponse(BaseModel):
    answer: str
    confidence: float
    confidence_label: str
    hallucination_risk: str
    sources: List[Source]

# ── TF-IDF retrieval ──────────────────────────────────────────────────────────
STOPWORDS = {
    "a","an","the","is","it","in","on","at","to","for","of","and","or","but",
    "was","were","are","be","been","being","have","has","had","do","does","did",
    "will","would","could","should","may","might","shall","with","from","by",
    "this","that","these","those","what","which","who","how","when","where","why",
    "i","you","he","she","we","they","me","him","her","us","them","my","your",
    "his","its","our","their","not","no","so","if","as","up","out","about",
}

def tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"[a-z0-9]+", text.lower())
            if w not in STOPWORDS and len(w) > 1]

def build_tfidf_index(chunks: List[dict]) -> dict:
    corpus = [tokenize(c["text"]) for c in chunks]
    N = len(corpus)
    df: Counter = Counter()
    for tokens in corpus:
        df.update(set(tokens))
    idf = {t: math.log((N + 1) / (df[t] + 1)) + 1 for t in df}
    vectors = []
    for tokens in corpus:
        tf = Counter(tokens)
        total = max(len(tokens), 1)
        vec = {t: (count / total) * idf.get(t, 1.0) for t, count in tf.items()}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        vectors.append({t: v / norm for t, v in vec.items()})
    return {"idf": idf, "vectors": vectors}

def tfidf_search(question: str, doc_id: str) -> Tuple[List[dict], List[float]]:
    store = document_store[doc_id]
    idf, vectors, chunks = store["index"]["idf"], store["index"]["vectors"], store["chunks"]
    q_tokens = tokenize(question)
    if not q_tokens:
        return chunks[:TOP_K], [0.1] * min(TOP_K, len(chunks))
    q_tf = Counter(q_tokens)
    q_total = max(len(q_tokens), 1)
    q_vec = {t: (count / q_total) * idf.get(t, 1.0) for t, count in q_tf.items()}
    q_norm = math.sqrt(sum(v * v for v in q_vec.values())) or 1.0
    q_vec = {t: v / q_norm for t, v in q_vec.items()}
    scores = [sum(q_vec.get(t, 0.0) * vec.get(t, 0.0) for t in q_vec) for vec in vectors]
    top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:TOP_K]
    return [chunks[i] for i in top_idx], [scores[i] for i in top_idx]

# ── PDF helpers ───────────────────────────────────────────────────────────────
def extract_text_from_pdf(pdf_bytes: bytes) -> List[dict]:
    pages = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages.append({"page": page_num, "text": text})
    return pages

def chunk_pages(pages: List[dict]) -> List[dict]:
    chunks = []
    for item in pages:
        text, page = item["text"], item["page"]
        start = 0
        while start < len(text):
            chunk_text = text[start : start + CHUNK_SIZE].strip()
            if chunk_text:
                chunks.append({"page": page, "text": chunk_text})
            start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks

# ── Groq LLM call ─────────────────────────────────────────────────────────────
def call_groq(question: str, chunks: List[dict]) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. "
            "Get a free key at https://console.groq.com and add it to your .env file as GROQ_API_KEY=..."
        )

    context = "\n\n---\n\n".join(f"[Page {c['page']}] {c['text']}" for c in chunks)
    system_msg = (
        "You are an expert document analysis assistant. "
        "Answer questions based ONLY on the provided document context. "
        "If the answer is not found, say: \"I could not find information about that in the provided document.\" "
        "Always cite the relevant page numbers."
    )
    user_msg = f"DOCUMENT CONTEXT:\n{context}\n\nQUESTION: {question}\n\nANSWER:"

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.2,
        "max_tokens": 1024,
    }

    resp = http_requests.post(
        GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )

    if resp.status_code != 200:
        raise RuntimeError(f"Groq API error {resp.status_code}: {resp.text[:300]}")

    return resp.json()["choices"][0]["message"]["content"].strip()

def score_label(score: float):
    if score >= 0.15: return "High", "Safe"
    elif score >= 0.05: return "Medium", "Uncertain"
    return "Low", "Risky"

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "online", "message": "SmartDoc AI Backend v8 (Groq-powered) is active"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    logger.info(f"Upload: {file.filename}")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        pages = extract_text_from_pdf(pdf_bytes)
        if not pages:
            raise HTTPException(status_code=422,
                detail="Could not extract text. The PDF may be scanned/image-only.")
        chunks = chunk_pages(pages)
        logger.info(f"{len(chunks)} chunks from {len(pages)} pages.")
        doc_id = str(uuid.uuid4())
        document_store[doc_id] = {
            "name": file.filename,
            "chunks": chunks,
            "index": build_tfidf_index(chunks),
        }
        logger.info(f"Indexed doc {doc_id}.")
        return {"doc_id": doc_id, "chunks": len(chunks), "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask", response_model=AskResponse)
async def ask_question(request: QuestionRequest):
    logger.info(f"Q: {request.question!r} | doc: {request.doc_id}")
    if request.doc_id not in document_store:
        raise HTTPException(status_code=404, detail="Document not found. Please re-upload.")
    try:
        top_chunks, scores = tfidf_search(request.question, request.doc_id)
        top_score = float(scores[0]) if scores else 0.0
        conf_label, risk = score_label(top_score)
        logger.info(f"TF-IDF score: {top_score:.4f} -> {conf_label}, calling Groq...")

        answer = call_groq(request.question, top_chunks)
        logger.info(f"Groq answered ({len(answer)} chars)")

        seen, sources = set(), []
        for chunk in top_chunks:
            if chunk["page"] not in seen:
                seen.add(chunk["page"])
                preview = chunk["text"][:300] + ("..." if len(chunk["text"]) > 300 else "")
                sources.append(Source(text=preview, page=chunk["page"]))

        return AskResponse(
            answer=answer,
            confidence=min(round(top_score * 6, 2), 1.0),
            confidence_label=conf_label,
            hallucination_risk=risk,
            sources=sources,
        )
    except Exception as e:
        logger.error(f"Ask error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting SmartDoc AI Backend (Groq) on port 8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
