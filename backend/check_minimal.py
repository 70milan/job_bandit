
from fastapi import FastAPI
import uvicorn
import threading
import requests
import time

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

def run_server():
    uvicorn.run(app, port=5051)

if __name__ == "__main__":
    # Start server in a thread
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    
    time.sleep(2)
    
    try:
        r = requests.get("http://127.0.0.1:5051/", timeout=2)
        print(f"Minimal App Status: {r.status_code}")
        print(f"Response: {r.json()}")
    except Exception as e:
        print(f"Minimal App Failed: {e}")
