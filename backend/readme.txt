npm run electron -- front

uvicorn main:app --reload --host 127.0.0.1 --port 5050 -- back


taskkill /F /IM JobAndit.exe /IM interview-backend.exe 2>$null