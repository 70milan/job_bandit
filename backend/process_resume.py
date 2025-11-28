#!/usr/bin/env python3
"""
Utility script to manually process a .docx resume file and update user_profile.json
Usage: python process_resume.py <path_to_resume.docx>
"""
import sys
import json
from pathlib import Path
from docx import Document

def extract_resume_text(docx_path):
    """Extract text from a .docx file"""
    try:
        doc = Document(docx_path)
        text = "\n\n".join([p.text for p in doc.paragraphs if p.text and p.text.strip()])
        return text
    except Exception as e:
        print(f"Error extracting text from {docx_path}: {e}")
        return None

def update_profile(resume_text):
    """Update user_profile.json with the resume text"""
    profile_path = Path(__file__).parent / "user_profile.json"
    
    # Load existing profile
    if profile_path.exists():
        try:
            profile = json.loads(profile_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error loading profile: {e}")
            profile = {}
    else:
        profile = {}
    
    # Update resume_text
    profile['resume_text'] = resume_text
    
    # Save profile
    try:
        profile_path.write_text(json.dumps(profile, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[OK] Profile updated successfully!")
        print(f"[OK] Resume text length: {len(resume_text)} characters")
        print(f"\nFirst 500 characters of resume:\n{'-'*50}")
        print(resume_text[:500])
        print(f"{'-'*50}")
    except Exception as e:
        print(f"Error saving profile: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python process_resume.py <path_to_resume.docx>")
        print("\nExample:")
        print('  python process_resume.py "C:\\path\\to\\your\\resume.docx"')
        sys.exit(1)
    
    resume_path = Path(sys.argv[1])
    
    if not resume_path.exists():
        print(f"Error: File not found: {resume_path}")
        sys.exit(1)
    
    if not resume_path.suffix.lower() == '.docx':
        print(f"Error: File must be a .docx file, got: {resume_path.suffix}")
        sys.exit(1)
    
    print(f"Processing resume: {resume_path}")
    
    # Extract text
    resume_text = extract_resume_text(resume_path)
    
    if resume_text is None:
        print("Failed to extract resume text")
        sys.exit(1)
    
    if not resume_text.strip():
        print("Warning: Resume appears to be empty")
    
    # Update profile
    update_profile(resume_text)
    
    print("\n[OK] Done! The AI will now use your resume for context.")

if __name__ == "__main__":
    main()
