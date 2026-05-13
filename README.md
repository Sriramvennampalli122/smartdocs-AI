
# SmartDoc AI

SmartDoc AI is a production-grade RAG (Retrieval-Augmented Generation) document Q&A assistant designed for high-precision information retrieval with integrated hallucination detection.

## 🛠 Prerequisites

You need **Python 3.8 or higher** installed on your system.

### How to install Python:
- **macOS**: `brew install python` (or download from python.org)
- **Windows**: Download the installer from [python.org](https://www.python.org/downloads/) (Make sure to check "Add Python to PATH").
- **Linux (Ubuntu/Debian)**: `sudo apt update && sudo apt install python3 python3-pip`

## 🚀 Getting Started

To run the complete system, follow these steps:

### 1. Install Backend Dependencies
Open a terminal and run:
```bash
pip install -r backend/requirements.txt
```

### 2. Start the Backend (Python)
In your first terminal tab, run:
```bash
npm run backend
```
*Note: This script tries `python3` first, then `python`. If both fail, ensure Python is installed and in your PATH.*

### 3. Start the Frontend (Next.js)
In a second terminal tab, run:
```bash
npm run dev
```
The frontend will be available on `http://localhost:9002`.

## ⚙️ Configuration
Ensure your `.env` file contains:
- `GEMINI_API_KEY`: Your Google AI API Key.
- `BACKEND_API_URL`: `http://127.0.0.1:8000`

---
Built with Precision by **SmartDoc AI Team**.
