
import os
import asyncio
import websockets
import json
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"

async def test_openai_direct():
    print(f"Testing direct connection to: {URL}")
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1",
    }
    
    try:
        async with websockets.connect(URL, additional_headers=headers) as ws:
            print("Successfully connected to OpenAI!")
            
            # Send a simple session update to verify protocol
            msg = {
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "instructions": "Test"
                }
            }
            await ws.send(json.dumps(msg))
            print("Sent session update.")
            
            async for message in ws:
                data = json.loads(message)
                print(f"Received event: {data['type']}")
                if data['type'] == 'session.updated':
                    print("Session updated confirmed. Closing.")
                    break
                if data['type'] == 'error':
                    print(f"Error from OpenAI: {data}")
                    break
                    
    except Exception as e:
        print(f"FAILED to connect to OpenAI: {e}")

if __name__ == "__main__":
    asyncio.run(test_openai_direct())
