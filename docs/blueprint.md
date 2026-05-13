# **App Name**: SmartDoc AI

## Core Features:

- Recursive RAG Pipeline: Leverages RecursiveCharacterTextSplitter and vector embeddings for precise context-aware document processing.
- Hallucination Detection Tool: A confidence scoring tool utilizing semantic similarity, keyword overlap, and length checks to validate AI claims.
- Persistent Vector Storage: Integrated ChromaDB database to persist document indices and ensure efficient retrieval.
- Visual Confidence Badges: Interactive pill-style badges (Safe, Uncertain, Risky) indicating real-time trustworthiness of AI responses.
- Context Citation System: Collapsible panels revealing specific document source chunks used for every AI response.
- PDF Intelligence Layer: Advanced text extraction supporting both OpenAI and local HuggingFace embedding models.
- Multi-Modal Sidebar UI: Dual-pane dashboard with file upload management on the left and a live Q&A chat on the right.

## Style Guidelines:

- A dark obsidian theme using #0F0F0F for the background, #1A1A1A for surface cards, and #2A2A2A for borders.
- Vibrant Emerald Green (#10B981) used for buttons, user messages, and 'Safe' confidence indicators.
- Contrast signals: Amber for uncertain responses and Deep Red for low-confidence warnings.
- Font pairing: 'Space Grotesk' (sans-serif) for high-tech headings and 'Inter' (sans-serif) for professional body readability.
- Fixed dual-column split: a 30% width sidebar for document metadata and 70% for the main chat workspace.
- Smooth pulsing progress bars during file indexing and triple-dot typing indicators for AI reasoning phases.
- Icon-rich feedback including shields for high-trust sources and warning symbols for data discrepancies.