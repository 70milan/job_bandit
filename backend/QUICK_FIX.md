# Quick Fix Guide

## Issue
Buttons not working after code changes.

## Root Cause
Backend needs to be restarted after modifying `main.py`

## Solution

### Step 1: Stop the backend (if running)
Press `Ctrl+C` in the terminal where backend is running

### Step 2: Start the backend
```bash
cd "c:\Data Engineering\codeprep\interview_assistant\backend"
python main.py
```

### Step 3: Verify it's working
You should see:
```
[STARTUP] Resume text cleared - ready for new upload
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:5050
```

### Step 4: Test the frontend
Open the frontend app and try the buttons again.

## What Changed
- Added auto-resume-reset feature on startup
- Code is syntactically correct (verified)
- Just needs a restart to take effect

## If Still Not Working
Check:
1. Backend console for error messages
2. Frontend console (F12) for errors
3. Make sure backend is on port 5050
