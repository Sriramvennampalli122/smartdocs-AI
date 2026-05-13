# SmartDoc AI

SmartDoc AI is a production-grade RAG (Retrieval-Augmented Generation) document Q&A assistant designed for high-precision information retrieval with integrated hallucination detection.

## 🏗 Architecture

```
PDF Document
     │
     ▼
[ Parsing & Chunking ] (RecursiveCharacterTextSplitter)
     │
     ▼
[ Vector Embeddings ] (HuggingFace/OpenAI)
     │
     ▼
[ ChromaDB Storage ] (Persistent Vector Store)
     │
     ▼
[ Retrieval Logic ] ◄──── [ User Query ]
     │                         │
     ▼                         │
[ LLM Generation ] ◄───────────┘
     │
     ▼
[ Hallucination Detector ] ◄─── [ Source Chunks ]
     │
     ▼
[ Answer + Confidence Score ]
```

## 🚀 Key Features

- **Recursive RAG Pipeline**: Precise context-aware document processing using industry-standard splitting strategies.
- **Hallucination Detection**: Real-time confidence scoring using semantic similarity, keyword overlap, and linguistic refusal detection.
- **Context Citations**: Visual panels mapping AI claims directly back to source document pages and snippets.
- **Obsidian Dark Theme**: High-contrast, high-tech interface built with Tailwind CSS and Framer-inspired animations.
- **Dual-Model Support**: Works out-of-the-box with OpenAI GPT-3.5 or local HuggingFace models.

## 🛠 Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Lucide Icons, ShadCN UI.
- **AI/LLM**: Genkit, LangChain, RAGAS Evaluation Framework.
- **Database**: ChromaDB (Vector Search).
- **Backend (External)**: FastAPI (Requested Integration).

## ⚙️ Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd smartdoc-ai
   ```

2. **Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   BACKEND_API_URL=http://localhost:8000
   OPENAI_API_KEY=your_key_here
   ```

3. **Run the App**:
   ```bash
   npm install
   npm run dev
   ```

## 🔍 Hallucination Detection Engine

Our custom `ConfidenceScorer` utilizes a multi-signal approach:
1. **Semantic Similarity**: Cosine distance between generated answers and retrieved context.
2. **Keyword Overlap**: Entity verification between source and output.
3. **Refusal Recognition**: High-confidence scoring for accurate negative responses ("Information not found").
4. **Length Anomaly Detection**: Penalties for generating content significantly longer than the provided context.

## 📸 Screenshots

- **Main Dashboard**: [Image Placeholder: Document analysis view]
- **Hallucination Badge**: [Image Placeholder: Pill badges showing Safe/Uncertain status]

---
Built with Precision by **SmartDoc AI Team**.