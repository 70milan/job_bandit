
import websockets
import inspect
import os
from dotenv import load_dotenv

load_dotenv()

print(f"Websockets version: {websockets.version}")
print(f"API Key present: {bool(os.getenv('OPENAI_API_KEY'))}")

try:
    sig = inspect.signature(websockets.connect)
    print(f"websockets.connect signature: {sig}")
except Exception as e:
    print(f"Could not get signature: {e}")
