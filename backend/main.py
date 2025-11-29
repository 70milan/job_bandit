# backend/main.py
from fastapi import FastAPI, WebSocket
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
import sys

import json
import asyncio
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import Optional, Dict, Any

app = FastAPI()

# Determine base directory (works with PyInstaller)
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    BASE_DIR = Path(sys.executable).parent
else:
    # Running as script
    BASE_DIR = Path(__file__).parent

# Allow the Electron frontend and local testing to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_api_key():
    """Get API key from user profile only"""
    global profile_cache
    if isinstance(profile_cache, dict) and profile_cache.get('openai_api_key'):
        return profile_cache['openai_api_key']
    return None

@app.websocket("/realtime")
async def realtime(ws: WebSocket):
    await ws.accept()
    
    api_key = get_api_key()
    url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "OpenAI-Beta": "realtime=v1",
    }
    
    print(f"Incoming WebSocket connection. API Key present: {bool(api_key)}")
    if not api_key:
        print("ERROR: API key not found in profile!")
        await ws.close(code=1008, reason="Missing API Key")
        return

    print(f"Connecting to OpenAI at {url}...")
    try:
        async with websockets.connect(url, additional_headers=headers) as openai_ws:
            print("Connected to OpenAI Realtime API!")
            # Initialize session
            session_update = {
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    }
                }
            }
            await openai_ws.send(json.dumps(session_update))

            async def receive_from_client():
                try:
                    while True:
                        data = await ws.receive_text()
                        # Expecting base64 audio from client
                        # Send to OpenAI
                        event = {
                            "type": "input_audio_buffer.append",
                            "audio": data
                        }
                        await openai_ws.send(json.dumps(event))
                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"Client receive error: {e}")

            async def receive_from_openai():
                try:
                    async for message in openai_ws:
                        event = json.loads(message)
                        
                        # Real-time transcription events
                        if event["type"] == "conversation.item.input_audio_transcription.delta":
                            print(f"TRANSCRIPT DELTA: {event['delta']}")
                            await ws.send_json({
                                "type": "transcript",
                                "text": event["delta"]
                            })
                        elif event["type"] == "conversation.item.input_audio_transcription.completed":
                            print(f"TRANSCRIPT DONE: {event['transcript']}")
                            await ws.send_json({
                                "type": "transcript",
                                "text": "\n"
                            })
                        elif event["type"] == "error":
                            print(f"OpenAI Error: {event}")
                except Exception as e:
                    print(f"OpenAI receive error: {e}")

            await asyncio.gather(receive_from_client(), receive_from_openai())

    except websockets.exceptions.ConnectionClosed as e:
        print(f"OpenAI Connection Closed: {e.code} {e.reason}")
        await ws.close(code=1011, reason=f"OpenAI Closed: {e.code}")
    except Exception as e:
        print(f"Connection error: {e}")
        # Try to send the error to the client before closing
        try:
            await ws.close(code=1011, reason=f"Upstream Error: {str(e)[:100]}")
        except:
            pass

from pydantic import BaseModel
from fastapi import File, UploadFile
try:
    from docx import Document
except ModuleNotFoundError:
    Document = None
    print("Warning: python-docx not installed — resume upload endpoint will be unavailable until installed.")


class AIRequest(BaseModel):
    transcript: str
    role: str
    screenshot: str = None
    job_description: Optional[str] = None


# Persistent profile support -------------------------------------------------
PROFILE_PATH = BASE_DIR / "user_profile.json"

def load_profile() -> Dict[str, Any]:
    if PROFILE_PATH.exists():
        try:
            return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error loading profile: {e}")
            return {}
    return {}

def save_profile(data: Dict[str, Any]):
    try:
        json_str = json.dumps(data, indent=2, ensure_ascii=False)
        PROFILE_PATH.write_text(json_str, encoding="utf-8")
        print(f"[SAVE_PROFILE] Successfully wrote {len(json_str)} bytes to {PROFILE_PATH}")
    except Exception as e:
        print(f"[SAVE_PROFILE ERROR] Failed to save: {e}")
        raise  # Re-raise so caller knows it failed
        print(f"Error saving profile: {e}")

profile_cache = load_profile()

# Auto-reset disabled - resume will persist between restarts
# Uncomment below to enable auto-clearing on startup:
# if profile_cache and isinstance(profile_cache, dict):
#     if 'resume_text' in profile_cache and profile_cache['resume_text']:
#         profile_cache['resume_text'] = ""
#         save_profile(profile_cache)
#         print("[STARTUP] Resume text cleared - ready for new upload")
#     else:
#         print("[STARTUP] No resume to clear - ready for upload")

@app.get('/profile')
async def get_profile():
    return profile_cache

@app.post('/validate-api-key')
async def validate_api_key(data: Dict[str, str]):
    """Validate OpenAI API key before allowing session creation"""
    api_key = data.get('api_key', '').strip()
    
    if not api_key:
        return {"valid": False, "error": "API key is required"}
    
    if not api_key.startswith('sk-'):
        return {"valid": False, "error": "Invalid API key format"}
    
    try:
        client = OpenAI(api_key=api_key)
        client.models.list()
        return {"valid": True}
    except Exception as e:
        error_msg = str(e)
        if "invalid_api_key" in error_msg or "Incorrect API key" in error_msg:
            return {"valid": False, "error": "Invalid API key"}
        elif "insufficient_quota" in error_msg:
            return {"valid": False, "error": "API key has no credits/quota"}
        else:
            return {"valid": False, "error": f"API key validation failed: {error_msg[:100]}"}

@app.post('/profile')
async def post_profile(data: Dict[str, Any]):
    global profile_cache
    try:
        save_profile(data)
        profile_cache = data
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post('/profile/resume')
async def upload_resume(file: UploadFile = File(...)):
    global profile_cache
    try:
        filename = file.filename
        if not filename.lower().endswith('.docx'):
            return {"status": "error", "error": "Only .docx files supported"}

        resumes_dir = BASE_DIR / 'resumes'
        print(f"Creating resumes directory at: {resumes_dir}")
        resumes_dir.mkdir(parents=True, exist_ok=True)
        print(f"Directory created: {resumes_dir.exists()}")
        out_path = resumes_dir / filename
        content = await file.read()
        out_path.write_bytes(content)

        # Extract text using python-docx (if available)
        if Document is None:
            return {"status": "error", "error": "python-docx is not installed on the server. Install with: pip install python-docx"}

        try:
            doc = Document(out_path)
            text = "\n\n".join([p.text for p in doc.paragraphs if p.text and p.text.strip()])
        except Exception as e:
            return {"status": "error", "error": f"docx parse failed: {e}"}

        # Save extracted resume text into profile
        if not isinstance(profile_cache, dict):
            profile_cache = {}
        profile_cache['resume_text'] = text
        
        try:
            save_profile(profile_cache)
            print(f"\n{'='*60}")
            print(f"[RESUME UPLOAD SUCCESS]")
            print(f"File: {filename}")
            print(f"Text extracted: {len(text)} characters")
            print(f"Saved to profile!")
            print(f"{'='*60}\n")
        except Exception as save_error:
            print(f"\n[RESUME SAVE FAILED]: {save_error}\n")
            return {"status": "error", "error": f"Failed to save resume: {save_error}"}

        return {"status": "ok", "resume_snippet": text[:800]}
    except Exception as e:
        print(f"\n[RESUME UPLOAD ERROR]: {e}\n")
        return {"status": "error", "error": str(e)}

# ----------------------------------------------------------------------------

@app.post("/ai/stream")
async def stream_ai_response(req: AIRequest):
    """Streaming endpoint for real-time AI responses using Server-Sent Events"""
    
    async def generate_stream():
        try:
            client = OpenAI(api_key=get_api_key())
            
            # CRITICAL: Reload profile from disk to get latest resume
            current_profile = load_profile()
            
            # Extract resume and job description
            resume_text = None
            job_description = None
            profile_metadata = None
            
            if current_profile and isinstance(current_profile, dict):
                resume_text = current_profile.get('resume_text')
                job_description = current_profile.get('job_description')
                # Build metadata without resume_text
                profile_metadata = {k: v for k, v in current_profile.items() if k not in ['resume_text', 'job_description']}
            
            has_resume = bool(resume_text and resume_text.strip())
            
            # DEBUG: Print what we're sending
            print(f"\n{'='*60}")
            print(f"[STREAMING AI REQUEST]")
            print(f"Has resume: {has_resume}")
            if has_resume:
                print(f"Resume length: {len(resume_text)} characters")
            if job_description:
                print(f"Job description length: {len(job_description)} characters")
            print(f"{'='*60}\n")

            if req.screenshot:
                # Use vision model for screenshot analysis
                messages = [
                    {
                        "role": "system",
                        "content": (
                            f"You are a {req.role}. When you see a coding problem in the screenshot, provide the SOLUTION CODE with a clear explanation. "
                            "Do not just describe what you see - solve it! Give detailed answers with 10-15 sentences explaining the concept, approach, and solution. "
                            "For technical concepts, explain what it is, why it matters, how it works, and provide examples. "
                            "You have been provided a Candidate resume. Answer ALL questions based on the resume content provided. Extract and use information from the resume to answer in first person as if you are the candidate."
                            "If you are asked to write code, write the code in the same language as the job description (mostly sql, pyspark, pandas, pyton, pyspark sql)."
                            "Answer in simple english as if english is not your first language and you are an immigrant in the US for past 10 years."
                        )
                    }
                ]

                # Inject resume
                if has_resume:
                    messages.append({"role": "user", "content": "Candidate resume:\n" + resume_text})
                elif profile_metadata:
                    messages.append({"role": "user", "content": "Candidate profile:\n" + json.dumps(profile_metadata, indent=2)})

                # Include job description
                if job_description:
                    messages.append({"role": "user", "content": f"Job description:\n{job_description}"})

                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": req.transcript},
                        {"type": "image_url", "image_url": {"url": req.screenshot}}
                    ]
                })
                model = "gpt-4o"
                print(f"[STREAM] Using model: {model} (vision)")
            else:
                # Use text-only model - GPT-3.5-turbo for speed!
                system_content = (
                    f"You are an experienced {req.role} answering an interview question. Respond in FIRST PERSON as if YOU are the candidate. "
                    "Be sharp, concise, and specific. Include specific tools/commands but keep it brief (4-6 sentences max). "
                    "Sound confident and experienced, not verbose. "
                    "You have been provided a Candidate resume. Answer ALL questions based on the resume content provided. Extract and use information from the resume to answer interview questions."
                )

                messages = [
                    {"role": "system", "content": system_content}
                ]

                # Inject resume
                if has_resume:
                    messages.append({"role": "user", "content": "Candidate resume:\n" + resume_text})
                elif profile_metadata:
                    messages.append({"role": "user", "content": "Candidate profile:\n" + json.dumps(profile_metadata, indent=2)})

                # Include job description
                if job_description:
                    messages.append({"role": "user", "content": f"Job description:\n{job_description}"})

                messages.append({"role": "user", "content": req.transcript})
                model = "gpt-3.5-turbo"  # Fast model for text-only
                print(f"[STREAM] Using model: {model} (text-only)")

            # Stream the response
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                max_tokens=600,
                temperature=0.7
            )
            
            # Yield chunks as they arrive
            for chunk in completion:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    # Send as Server-Sent Event format
                    yield f"data: {json.dumps({'chunk': content})}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            print(f"Streaming AI Error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(generate_stream(), media_type="text/event-stream")


@app.post("/ai")
async def generate_ai_response(req: AIRequest):
    try:
        client = OpenAI(api_key=get_api_key())
        
        # CRITICAL: Reload profile from disk to get latest resume (in case it was uploaded after backend started)
        current_profile = load_profile()
        
        # Extract resume and profile separately.
        # Priority: If resume_text exists, send ONLY the resume (ignore JSON profile completely).
        # Fallback: If no resume, send JSON profile metadata.
        resume_text = None
        profile_metadata = None
        
        if current_profile and isinstance(current_profile, dict):
            resume_text = current_profile.get('resume_text')
            # Build metadata without resume_text
            profile_metadata = {k: v for k, v in current_profile.items() if k != 'resume_text'}
        
        has_resume = bool(resume_text and resume_text.strip())
        
        # DEBUG: Print what we're actually sending
        print(f"\n{'='*60}")
        print(f"[AI REQUEST DEBUG]")
        print(f"Has resume: {has_resume}")
        if has_resume:
            print(f"Resume length: {len(resume_text)} characters")
            print(f"Resume preview: {resume_text[:200]}...")
        else:
            print(f"NO RESUME - Using profile metadata instead")
            print(f"Profile metadata: {profile_metadata}")
        print(f"{'='*60}\n")

        if req.screenshot:
            # Use vision model for screenshot analysis
            messages = [
                {
                    "role": "system",
                    "content": (
                        f"You are a {req.role}. When you see a coding problem in the screenshot, provide the SOLUTION CODE with a clear explanation. "
                        "Do not just describe what you see - solve it! Give detailed answers with 10-15 sentences explaining the concept, approach, and solution. "
                        "For technical concepts, explain what it is, why it matters, how it works, and provide examples. "
                        "You have been provided a Candidate resume. Answer ALL questions based on the resume content provided. Extract and use information from the resume to answer in first person as if you are the candidate."
                        "If you are asked to write code, write the code in the same language as the job description (mostly sql, pyspark, pandas, pyton, pyspark sql)."
                        "Answer in simple english as if english is not your first language and you are an immigrant in the US for past 10 years."
                    )
                }
            ]

            # Inject resume (if present) or profile metadata (fallback)
            if has_resume:
                messages.append({"role": "user", "content": "Candidate resume:\n" + resume_text})
            elif profile_metadata:
                messages.append({"role": "user", "content": "Candidate profile:\n" + json.dumps(profile_metadata, indent=2)})

            # include job description if provided in request
            if getattr(req, 'job_description', None):
                messages.append({"role": "user", "content": f"Job description:\n{req.job_description}"})

            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": req.transcript},
                    {"type": "image_url", "image_url": {"url": req.screenshot}}
                ]
            })
            model = "gpt-4o"
        else:
            # Use text-only model - GPT-3.5-turbo for speed!
            system_content = (
                f"You are an experienced {req.role} answering an interview question. Respond in FIRST PERSON as if YOU are the candidate. "
                "Be sharp, concise, and specific. Include specific tools/commands but keep it brief (4-6 sentences max). "
                "Sound confident and experienced, not verbose. "
                "You have been provided a Candidate resume. Answer ALL questions based on the resume content provided. Extract and use information from the resume to answer interview questions."
            )

            messages = [
                {"role": "system", "content": system_content}
            ]

            # Inject resume (if present) or profile metadata (fallback)
            if has_resume:
                messages.append({"role": "user", "content": "Candidate resume:\n" + resume_text})
            elif profile_metadata:
                messages.append({"role": "user", "content": "Candidate profile:\n" + json.dumps(profile_metadata, indent=2)})

            # include job description if provided in request
            if getattr(req, 'job_description', None):
                messages.append({"role": "user", "content": f"Job description:\n{req.job_description}"})

            messages.append({"role": "user", "content": req.transcript})
            model = "gpt-3.5-turbo"  # Fast model for text-only
        
        # DEBUG: print messages being sent to OpenAI to help diagnose which context is used
        try:
            print("=== AI messages START ===")
            for m in messages:
                # content can be string or list/dict (for images). Truncate for safety.
                c = m.get('content')
                if isinstance(c, str):
                    preview = c[:1000].replace('\n', ' ') if c else ''
                else:
                    preview = str(c)[:1000]
                print(f"ROLE={m.get('role')} | CONTENT_PREVIEW={preview}")
            print("=== AI messages END ===")
        except Exception as _:
            pass

        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
            max_tokens=600,
            temperature=0.7
        )
        
        full_response = ""
        for chunk in completion:
            if chunk.choices[0].delta.content:
                full_response += chunk.choices[0].delta.content
        
        return {"answer": full_response}
    except Exception as e:
        print(f"AI Generation Error: {e}")
        return {"answer": f"Error: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("Starting JobAndit Backend")
    print("API running on: http://localhost:5050")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=5050, log_level="info")
