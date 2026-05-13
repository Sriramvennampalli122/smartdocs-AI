
import os
import uuid
import logging
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Configure logging to provide clear diagnostics in the console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("smartdoc-ai")

app = FastAPI(title="SmartDoc AI Backend")

# Enable CORS for Next.js frontend
# This is critical to allow the frontend to communicate with this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo purposes
# Note: This will reset if the server restarts
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
    logger.info("Health check endpoint called")
    return {"status": "online", "message": "SmartDoc AI FastAPI is running"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    logger.info(f"Received upload request for: {file.filename}")
    
    if not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        # Generate a unique ID for the document
        doc_id = str(uuid.uuid4())
        
        # Read the file content
        content = await file.read()
        file_size = len(content)
        
        # Simulate RAG processing logic (e.g., 1 chunk per 1KB of content)
        chunk_count = max(1, file_size // 1024)
        
        # Store metadata in our temporary document store
        document_store[doc_id] = {
            "name": file.filename,
            "chunks": chunk_count,
            "size": file_size
        }
        
        logger.info(f"Successfully processed {file.filename}. Assigned ID: {doc_id}, Chunks: {chunk_count}")
        
        return {
            "doc_id": doc_id,
            "chunks": chunk_count
        }
    except Exception as e:
        logger.error(f"Failed to process upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.post("/ask", response_model=AskResponse)
async def ask_question(request: QuestionRequest):
    logger.info(f"Received question for document {request.doc_id}: {request.question}")
    
    if request.doc_id not in document_store:
        logger.error(f"Document ID {request.doc_id} not found in memory store")
        raise HTTPException(
            status_code=404, 
            detail="Document not found. The server may have restarted. Please re-upload your document."
        )
    
    doc_info = document_store[request.doc_id]
    
    # Simulation of a RAG retrieval and confidence scoring engine
    # In production, this would involve embedding retrieval from ChromaDB
    return AskResponse(
        answer=f"Based on the analyzed text in '{doc_info['name']}', the answer to your question '{request.question}' is found across several sections. This response was generated using the RAG pipeline chunks.",
        confidence=0.92,
        confidence_label="High",
        hallucination_risk="Safe",
        sources=[
            Source(text=f"Found a relevant section in '{doc_info['name']}' discussing the topic of the query.", page=1),
            Source(text="Supporting data points extracted from the document's primary tables and figures.", page=3)
        ]
    )

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 to ensure accessibility within the workstation environment
    # Port 8000 is the expected port for the Next.js frontend
    logger.info("SmartDoc AI Backend starting on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
