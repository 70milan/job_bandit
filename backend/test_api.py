import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

data = {
    "transcript": "Hello, this is a test.",
    "role": "Software Engineer",
    "target_language": "Python",
    "save_to_context": False,
    "text_model": "gpt-5-nano"
}

req = urllib.request.Request(
    'http://127.0.0.1:5050/ai/stream', 
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        print("Status code:", response.getcode())
        for line in response:
            print(line.decode('utf-8').strip())
except Exception as e:
    print(f"Error: {e}")
