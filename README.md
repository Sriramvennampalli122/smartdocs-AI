
# SmartDoc AI

SmartDoc AI is a production-grade RAG (Retrieval-Augmented Generation) document Q&A assistant designed for high-precision information retrieval with integrated hallucination detection.

## 🛠 Prerequisites

You need **Python 3.8 or higher** installed on your system.

### 1. How to install Python & Pip:

#### **macOS**
- **Install Python**: Open Terminal and run `brew install python`.
- **Install Pip**: Pip is included with the Homebrew Python installation. Verify with `pip3 --version`.
- If you don't have Homebrew: Download the installer from [python.org](https://www.python.org/downloads/macos/).

#### **Windows**
- **Install Python**: Download the installer from [python.org](https://www.python.org/downloads/windows/).
- **Crucial**: During installation, check the box that says **"Add Python to PATH"**.
- **Install Pip**: Pip is included by default. Verify by opening Command Prompt and typing `pip --version`.

#### **Linux (Ubuntu/Debian)**
- Run: `sudo apt update && sudo apt install python3 python3-pip`

---

## 🚀 Getting Started

To run the complete system, follow these steps:

### 1. Install Backend Dependencies
Open a terminal in the project root and run:
```bash
pip install -r backend/requirements.txt
```
*(On some systems, you may need to use `pip3 install...`)*

### 2. Start the Backend (Python)
In your first terminal tab, run:
```bash
npm run backend
```
*This starts the FastAPI server at http://127.0.0.1:8000.*

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
