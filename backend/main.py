
import os
import uuid
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Configure logging for better diagnostics
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("smartdoc-ai-backend")

app = FastAPI(title="SmartDoc AI Backend", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for document metadata
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
    logger.info("Health check requested")
    return {"status": "online", "message": "SmartDoc AI FastAPI Backend is active"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    logger.info(f"Received upload request: {file.filename}")
    
    if not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Rejected unsupported file type: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        doc_id = str(uuid.uuid4())
        # We read the file to simulate processing
        content = await file.read()
        file_size = len(content)
        
        # Simple heuristic for "chunks" based on size (1KB per chunk)
        chunk_count = max(1, file_size // 1024)
        
        document_store[doc_id] = {
            "name": file.filename,
            "chunks": chunk_count,
            "size": file_size
        }
        
        logger.info(f"Successfully indexed document {doc_id} with {chunk_count} chunks.")
        
        return {
            "doc_id": doc_id,
            "chunks": chunk_count,
            "filename": file.filename
        }
    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.post("/ask", response_model=AskResponse)
async def ask_question(request: QuestionRequest):
    logger.info(f"Received question for doc {request.doc_id}: {request.question}")
    
    if request.doc_id not in document_store:
        logger.error(f"Document ID {request.doc_id} not found in store")
        raise HTTPException(
            status_code=404, 
            detail="Document not found. Please upload the file again."
        )
    
    doc_info = document_store[request.doc_id]
    
    # Simulate a sophisticated RAG response
    # In a real system, this is where your Vector Search and LLM logic would live
    return AskResponse(
        answer=f"Based on the content of '{doc_info['name']}', the answer to your question about '{request.question}' is found in the analyzed chunks. This is a simulated RAG response providing context extracted from the {doc_info['chunks']} chunks available in the knowledge base.",
        confidence=0.89,
        confidence_label="High",
        hallucination_risk="Safe",
        sources=[
            Source(text=f"Primary context regarding '{request.question}' found in section 1.2.", page=1),
            Source(text=f"Supporting data regarding the document metrics and metadata.", page=2)
        ]
    )

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 to ensure connectivity in various environments
    logger.info("Starting FastAPI server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
