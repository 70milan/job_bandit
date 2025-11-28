
import asyncio
import websockets
import json

URL = "ws://127.0.0.1:5050/realtime"

async def test_backend_local():
    print(f"Testing connection to local backend: {URL}")
    try:
        async with websockets.connect(URL) as ws:
            print("Successfully connected to Backend!")
            
            # Send some dummy audio data (base64)
            # In a real scenario, we'd send base64 PCM16
            # But here we just want to see if the connection holds
            await ws.send("UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=") 
            print("Sent dummy audio data.")
            
            # Wait for a bit to see if we get anything or if it closes
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                print(f"Received from backend: {msg}")
            except asyncio.TimeoutError:
                print("No response received (expected if silence), but connection is open.")
            
    except Exception as e:
        print(f"FAILED to connect to Backend: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend_local())
