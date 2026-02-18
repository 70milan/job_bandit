-- front
npm run start:dev


npm run electron 

-- back
uvicorn main:app --reload --host 127.0.0.1 --port 5050 


taskkill /F /IM JobAndit.exe /IM interview-backend.exe 2>$null


cd c:\Data Engineering\release_package\backend
pyinstaller --onefile --name interview-backend main.py