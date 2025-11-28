
import requests

try:
    r = requests.get("http://127.0.0.1:5050/docs", timeout=2)
    print(f"Status Code: {r.status_code}")
except Exception as e:
    print(f"HTTP Check Failed: {e}")
