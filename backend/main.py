
import os
import uuid
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SmartDoc AI Backend")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo purposes
# In a real app, this would use ChromaDB and LangChain
document_store = {}

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

@app.get("/")
async def root():
    return {"status": "online", "message": "SmartDoc AI FastAPI is running"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        # Simulate document processing
        doc_id = str(uuid.uuid4())
        content = await file.read()
        
        # Simulate chunking: assume 1 chunk per 1KB of content
        chunk_count = max(1, len(content) // 1024)
        
        # Store metadata
        document_store[doc_id] = {
            "name": file.filename,
            "chunks": chunk_count
        }
        
        print(f"[Backend] Processed document {file.filename} into {chunk_count} chunks.")
        
        return {
            "doc_id": doc_id,
            "chunks": chunk_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask", response_model=AskResponse)
async def ask_question(request: QuestionRequest):
    if request.doc_id not in document_store:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    # Simulate RAG retrieval and confidence scoring
    # In production, this would use a VectorDB lookup and LLM generation
    return AskResponse(
        answer=f"Based on the document '{document_store[request.doc_id]['name']}', the answer to '{request.question}' is found in the analyzed chunks. This is a simulated response from the FastAPI backend.",
        confidence=0.92,
        confidence_label="High",
        hallucination_risk="Safe",
        sources=[
            Source(text="This is a simulated source passage extracted from the document content.", page=1),
            Source(text="Another relevant passage from a different section of the PDF.", page(3))
        ]
    )

if __name__ == "__main__":
    import uvicorn
    # Bind to 127.0.0.1:8000
    uvicorn.run(app, host="127.0.0.1", port=8000)
