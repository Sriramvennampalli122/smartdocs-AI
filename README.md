
# SmartDoc AI - Execution Guide

SmartDoc AI uses a dual-stack architecture: **FastAPI (Python)** for heavy document processing and **Next.js (React)** for the AI-powered user interface.

## 🚀 How to run the application

Follow these steps exactly to get the system online:

### Step 1: Initialize the Backend Environment
1. Open a **new terminal** in this workspace.
2. Install the Python dependencies by running:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Step 2: Start the FastAPI Server
In the **same terminal** where you installed dependencies, start the backend:
```bash
npm run backend
```
*You should see a message saying "INFO: Starting FastAPI server on http://0.0.0.0:8000". Keep this terminal open!*

### Step 3: Start the Frontend UI
1. Open a **second terminal tab**.
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Click the link provided in the terminal (usually `http://localhost:9002`) to open the app.

---

## 🛠 Troubleshooting Connection Issues

If you see "Connection Failed" or "FastAPI server is not responding":
1. **Check the Backend Terminal**: Ensure there are no red error messages. If Python is missing, follow the installation guides in the next section.
2. **Verify 127.0.0.1**: The frontend is configured to talk to `http://127.0.0.1:8000`. Ensure no other service is occupying port 8000.
3. **API Key**: Ensure your Google AI API Key is correctly set in the `.env` file.

---

## 📦 Prerequisites & Installation

### Python & Pip Setup
- **macOS**: `brew install python`
- **Windows**: Download from [python.org](https://www.python.org/downloads/). **Check "Add Python to PATH" during install.**
- **Linux**: `sudo apt update && sudo apt install python3 python3-pip`

### System Capacities
- **Max File Size**: 10MB (PDF only).
- **Processing Time**: Large files may take 30-60 seconds to index.
