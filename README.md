# JobAndit - AI Interview Assistant

> Ace your technical interviews with real-time AI assistance. Invisible to screen sharing.

![License](https://img.shields.io/badge/license-proprietary-blue)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)
![Electron](https://img.shields.io/badge/electron-29.4.0-blue)

---

## What is JobAndit?

JobAndit is a stealth interview assistant that helps you during technical interviews by:
- **Transcribing audio** in real-time (system audio + microphone)
- **Capturing screenshots** of coding problems
- **Generating AI responses** using your resume and job description as context
- **Staying invisible** to screen sharing software

---

## Pricing - Extremely Affordable

### License: **$1 one-time payment**
Contact: **mjulez70@gmail.com**

### API Costs (You use your own OpenAI key)

| Usage | Approximate Cost |
|-------|------------------|
| 50 AI responses | $0.15 - $0.30 |
| Full 2-hour interview | $0.50 - $1.00 |
| Compared to competitors | **10-100x cheaper!** |

> **Why so cheap?** Similar interview apps charge $30-100/month. With JobAndit, you pay a $1 license fee + only what you use on OpenAI. Add $5-10 credit to your OpenAI account to get started.

### How to Get an OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key (starts with `sk-`)
5. Add $5-10 credit to your account

---

## Keyboard Shortcuts

### Recording & AI
| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Start/Stop System Audio Recording |
| `Ctrl+M` | Start/Stop Microphone Recording |
| `Ctrl+K` | Screenshot + Immediate AI Solution |
| `Ctrl+S` | Screenshot + Save to Context |
| `Ctrl+Enter` | Process Transcript with AI |
| `Ctrl+L` | Clear Transcript |

### Window Controls
| Shortcut | Action |
|----------|--------|
| `Ctrl+Q` | Minimize to Stealth Mode |
| `Ctrl+Shift+Q` | Close App |
| `Ctrl+H` | Toggle Window Visibility |
| `Ctrl+Shift++` | Increase App Size |
| `Ctrl+Shift+-` | Decrease App Size |
| `Ctrl+Shift+O` | Return to Original Size |
| `Ctrl+Alt+Arrows` | Move App Around |

---

## How It Works

1. **Create a session** with your resume, API key, and job description
2. **Click Start** to begin the session timer (2 hours with license)
3. **Capture interviewer questions** using System Audio (`Ctrl+R`)
4. **Capture your own speech** using Microphone (`Ctrl+M`)
5. **Screenshot coding problems** (`Ctrl+K` for instant answer, `Ctrl+S` to save context)
6. **AI generates responses** as if YOU are answering, using your resume

---

## Tips

- Use `Ctrl+Q` to minimize to stealth mode - **invisible to screen sharing**
- Use `Ctrl+Shift++` and `Ctrl+Shift+-` to resize the app
- Use `Ctrl+Alt+Arrow` keys to move the app around
- `Ctrl+S` saves screenshots for context, `Ctrl+K` gives immediate answers
- All conversations are saved to your session folder

---

## Architecture

```
frontend/          - Electron app (v29.4.0)
  index.html       - Main UI
  main.js          - Electron main process
  setup.js         - Session & timer logic
  streaming-ai.js

backend/           - FastAPI server (Python)
  main.py          - API endpoints
  process_resume.py

README.md
```

---

## Development

### Prerequisites
- Node.js 18+
- Python 3.10+
- OpenAI API key

### Run in Development Mode

**Terminal 1 (Backend):**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 5050
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run electron
```

### Build for Production

**Backend:**
```bash
cd backend
pyinstaller interview-backend.spec
```

**Frontend:**
```bash
cd frontend
npm run dist
```

---

## Contact

- **License & Support:** mjulez70@gmail.com
- **Price:** $1 one-time payment

---

## Disclaimer

This tool is intended for educational and practice purposes. Use responsibly and ethically during interviews.
