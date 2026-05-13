
import os
import uuid
import logging
from typing import List
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo purposes
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
        doc_id = str(uuid.uuid4())
        content = await file.read()
        file_size = len(content)
        
        # Simulate RAG processing logic
        chunk_count = max(1, file_size // 1024)
        
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
        logger.error(f"Document ID {request.doc_id} not found")
        raise HTTPException(
            status_code=404, 
            detail="Document not found. Please re-upload your document."
        )
    
    doc_info = document_store[request.doc_id]
    
    return AskResponse(
        answer=f"Based on the analyzed text in '{doc_info['name']}', the answer to your question '{request.question}' is that this is a simulated RAG response. In a production system, this would be extracted from the indexed chunks.",
        confidence=0.92,
        confidence_label="High",
        hallucination_risk="Safe",
        sources=[
            Source(text=f"Supporting information found in '{doc_info['name']}' regarding {request.question}.", page=1),
            Source(text="Additional contextual data extracted from the document chunks.", page=2)
        ]
    )

if __name__ == "__main__":
    import uvicorn
    # Use 127.0.0.1 for local communication from the Next.js server
    logger.info("Starting SmartDoc AI Backend...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
