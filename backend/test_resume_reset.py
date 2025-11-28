#!/usr/bin/env python3
"""
Test script to verify resume reset functionality
"""
import json
from pathlib import Path

profile_path = Path(__file__).parent / "user_profile.json"

print("Testing Resume Reset Functionality")
print("=" * 50)

# Load current profile
profile = json.loads(profile_path.read_text(encoding="utf-8"))

print(f"\n1. Current resume_text length: {len(profile.get('resume_text', ''))} characters")
print(f"2. Other profile fields:")
print(f"   - name: {profile.get('name', 'N/A')}")
print(f"   - target_positions: {profile.get('target_positions', [])}")
print(f"   - summary: {profile.get('summary', 'N/A')}")
print(f"   - skills: {profile.get('skills', [])}")
print(f"   - job_description: {profile.get('job_description', 'N/A')[:50]}...")

print("\n" + "=" * 50)
print("\nTo test:")
print("1. Restart the backend: python main.py")
print("2. Check console for: '[STARTUP] Resume text cleared'")
print("3. Verify resume_text is empty in user_profile.json")
print("4. Other fields should remain unchanged")
