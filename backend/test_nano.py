"""Quick test: call gpt-5-nano with proper token limits"""
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

from openai import OpenAI
client = OpenAI()

print(f"OpenAI library version: {__import__('openai').__version__}")
print()

# Test with 4096 tokens (reasoning models need more room)
print("=== gpt-5-nano with max_completion_tokens=4096 ===")
try:
    response = client.chat.completions.create(
        model="gpt-5-nano",
        messages=[{"role": "user", "content": "Say hello in one word."}],
        max_completion_tokens=4096
    )
    content = response.choices[0].message.content
    usage = response.usage
    print(f"Response: {content}")
    print(f"Reasoning tokens: {usage.completion_tokens_details.reasoning_tokens}")
    print(f"Total completion tokens: {usage.completion_tokens}")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")
