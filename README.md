# JobAndit: AI Interview Assistant

JobAndit is a real-time AI interview assistant that captures audio/screen context and provides intelligent, streaming responses to help users navigate technical interviews.

## Features
- **Real-time Transcription**: Listens to interview questions via microphone.
- **Screen Context**: Analyzes shared screen content (coding problems, diagrams) using GPT-4o.
- **Streaming AI**: Low-latency responses using GPT-3.5/4/5 models.
- **Session Management**: Save and resume interview sessions.
- **Stealth Mode**: Mini-overlay for discreet usage.

## Prerequisites

Before running the application, ensure you have:

*   **Node.js** (v18+): [Download here](https://nodejs.org/)
*   **Python** (v3.10+): [Download here](https://www.python.org/)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/70milan/job_bandit.git
cd job_bandit
```

### 2. Frontend Setup
Install the dependencies for the Electron/React frontend:
```bash
cd frontend
npm install
```

### 3. Backend Setup
Install the Python dependencies:
```bash
cd ../backend
pip install -r requirements.txt
```

*(Optional) Create a `.env` file in `backend/` with your OpenAI API key:*
```env
OPENAI_API_KEY=sk-proj-...
```

## Running the Application

You need to run both the backend (AI server) and the frontend (UI) simultaneously.

### Option A: Developer Mode (Two Terminals)

**Terminal 1 (Backend):**
```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 5050
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run start:dev
```

### Option B: Build & Run
To create the executable:
```bash
# Windows
build-all.bat
```
Then run the generated `JobAndit.exe`.

## Project Structure
- `frontend/`: Electron + Vanilla JS/HTML UI.
- `backend/`: FastAPI server handling AI logic and state.
- `backend/resumes/`: Local storage for user resumes (git-ignored).
- `backend/sessions/`: Local storage for chat history (git-ignored).