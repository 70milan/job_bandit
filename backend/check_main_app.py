
from main import app
import uvicorn
import threading
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

def run_server():
    # Disable access log to keep output clean
    uvicorn.run(app, port=5052, log_level="warning")

if __name__ == "__main__":
    print("Starting main app on 5052...")
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    
    time.sleep(5)
    
    print("Checking /docs...")
    try:
        r = requests.get("http://127.0.0.1:5052/docs", timeout=5)
        print(f"Main App Status: {r.status_code}")
    except Exception as e:
        print(f"Main App Failed: {e}")
