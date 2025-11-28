# Resume Upload - Quick Fix Guide

## The Issue
Your AI is reading from `user_profile.json` (basic profile) instead of your resume because:
- ✗ No resume has been uploaded yet
- ✗ `resume_text` field is empty in user_profile.json
- ✗ `backend/resumes` folder is empty

## Quick Fix (Choose One)

### Option A: Upload via App UI ⭐ Recommended
1. Open your app
2. Click **👤 Profile** button
3. Click **"Upload resume (.docx)"**
4. Select your `.docx` file
5. Click **Save**

### Option B: Use Script
```bash
cd "c:\Data Engineering\codeprep\interview_assistant\backend"
python process_resume.py "path\to\your\resume.docx"
```

## Verify It Worked
```bash
cd "c:\Data Engineering\codeprep\interview_assistant\backend"
python -c "import json; data=json.load(open('user_profile.json')); print('Resume loaded!' if data.get('resume_text') else 'Resume still empty')"
```

## What This Does
- Extracts text from your .docx resume
- Saves it to `user_profile.json` under `resume_text`
- AI will now use your actual resume for context!
