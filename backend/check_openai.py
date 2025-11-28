
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
try:
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if hasattr(client.beta, 'realtime'):
        print("client.beta.realtime contents:")
        print(dir(client.beta.realtime))
        # Check if there are sessions or similar
        if hasattr(client.beta.realtime, 'sessions'):
             print("client.beta.realtime.sessions exists")
except Exception as e:
    print(f"Error: {e}")
