// Session Setup & Timer Logic

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
let sessionEndTime = null;
let timerInterval = null;
let sessionCreated = false;
let sessionTimerStarted = false;

// Session lock - prevents actions until Start is clicked
window.isSessionActive = false;

function showSessionError() {
  const popup = document.getElementById('session-error-popup');
  if (popup) {
    popup.style.display = 'block';
    popup.style.opacity = '1';
    setTimeout(() => {
      popup.style.opacity = '0';
      setTimeout(() => { popup.style.display = 'none'; }, 200);
    }, 2000);
  }
}

window.showSessionError = showSessionError;

// Initialize immediately since script is loaded at end of body
initSession();

function initSession() {
        const fileInput = document.getElementById('setup-resume');
        const apiKeyInput = document.getElementById('setup-apikey');
        const jdInput = document.getElementById('setup-jobdesc');
        const startBtn = document.getElementById('btn-start-session');
        
        function checkAllInputs() {
            const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
            const hasApiKey = apiKeyInput && apiKeyInput.value.trim().length > 0;
            const hasJD = jdInput && jdInput.value.trim().length > 0;
            
            if (hasFile && hasApiKey && hasJD && startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
            }
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', function() {
                if (fileInput.files && fileInput.files.length > 0) {
                    fileInput.classList.add('selected');
                }
                checkAllInputs();
            });
        }
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', checkAllInputs);
        }
        if (jdInput) {
            jdInput.addEventListener('input', checkAllInputs);
        }
    const endBtn = document.getElementById('btn-session-end');
    const startTimerBtn = document.getElementById('btn-session-start');
    const stopTimerBtn = document.getElementById('btn-session-stop');

    // Overlay is visible by default - waiting for session creation
    if (startBtn) {
        startBtn.onclick = handleCreateSession;
    }

    if (endBtn) {
        endBtn.onclick = endSession;
    }

    if (startTimerBtn) {
        startTimerBtn.onclick = startSessionTimer;
    }

    if (stopTimerBtn) {
        stopTimerBtn.onclick = stopSessionTimer;
    }
}

async function handleCreateSession() {
    const fileInput = document.getElementById('setup-resume');
    const apiKeyInput = document.getElementById('setup-apikey');
    const jdInput = document.getElementById('setup-jobdesc');
    const status = document.getElementById('setup-status');
    const startBtn = document.getElementById('btn-start-session');

    if (!fileInput.files || fileInput.files.length === 0) {
        status.innerText = "Please upload a resume (.docx)";
        status.style.color = "#ff4444";
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }

    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
    if (!apiKey) {
        status.innerText = "Please enter your OpenAI API key";
        status.style.color = "#ff4444";
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }

    if (!jdInput.value.trim()) {
        status.innerText = "Please enter a Job Description";
        status.style.color = "#ff4444";
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }

    try {
        startBtn.disabled = true;
        status.style.color = "#aaa";

        // 0. Validate API Key first
        status.innerText = "Validating API key...";
        const validateRes = await fetch('http://127.0.0.1:5050/validate-api-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });
        const validateJson = await validateRes.json();
        
        if (!validateJson.valid) {
            throw new Error(validateJson.error || "Invalid API key");
        }

        // 1. Upload Resume
        status.innerText = "Uploading resume...";
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);

        const upRes = await fetch('http://127.0.0.1:5050/profile/resume', { method: 'POST', body: fd });
        const upJson = await upRes.json();

        if (upJson.status !== 'ok') {
            throw new Error("Resume upload failed: " + (upJson.error || 'Unknown error'));
        }

        // 2. Refresh Profile to get extracted text
        status.innerText = "Processing profile...";
        const refreshRes = await fetch('http://127.0.0.1:5050/profile');
        if (!refreshRes.ok) throw new Error("Failed to fetch profile");
        const currentProfile = await refreshRes.json();

        // 3. Update with API key and Job Description
        const updatedProfile = {
            ...currentProfile,
            openai_api_key: apiKey,
            job_description: jdInput.value.trim()
        };

        // 4. Save complete profile
        status.innerText = "Saving session...";
        const saveRes = await fetch('http://127.0.0.1:5050/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile)
        });

        const saveJson = await saveRes.json();
        if (saveJson.status !== 'ok') {
            throw new Error("Profile save failed: " + (saveJson.error || 'Unknown error'));
        }

        // 5. Session created - hide overlay
        sessionCreated = true;
        status.innerText = "Session created!";
        status.style.color = "#28a745";

        setTimeout(() => {
            const overlay = document.getElementById('setup-overlay');
            overlay.style.display = 'none';
        }, 1200);

    } catch (e) {
        console.error('Session Creation Error:', e);
        status.innerText = `Error: ${e.message}`;
        status.style.color = "#ff4444";
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
    }
}

function startSessionTimer() {
    if (!sessionCreated) {
        alert('Create a session first!');
        return;
    }

    const timerText = document.getElementById('session-timer-text');
    const timerDot = document.getElementById('session-timer-dot');
    const startBtn = document.getElementById('btn-session-start');
    const stopBtn = document.getElementById('btn-session-stop');
    const statusText = document.getElementById('status-text');

    if (timerInterval) {
        // Already running
        return;
    }

    sessionEndTime = Date.now() + SESSION_DURATION_MS;
    window.isSessionActive = true;

    // Update button states
    startBtn.classList.add('active');
    stopBtn.classList.remove('stopped');
    statusText.innerText = 'Session Running';

    timerInterval = setInterval(() => {
        const remaining = sessionEndTime - Date.now();

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerText.innerText = `0:00:00`;
            timerDot.className = 'session-indicator';
            alert('Session time expired! (2 hours)');
            stopBtn.classList.add('stopped');
            startBtn.classList.remove('active');
            statusText.innerText = 'Session Expired';
            return;
        }

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        const timeStr = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timerText.innerText = timeStr;
        timerDot.className = 'session-indicator active';

    }, 1000);
}

function stopSessionTimer() {
    const timerDot = document.getElementById('session-timer-dot');
    const startBtn = document.getElementById('btn-session-start');
    const stopBtn = document.getElementById('btn-session-stop');
    const statusText = document.getElementById('status-text');

    window.isSessionActive = false;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Update button states
    startBtn.classList.remove('active');
    stopBtn.classList.add('stopped');
    timerDot.className = 'session-indicator paused';
    statusText.innerText = 'Session Paused';
}

function endSession() {
    if (!sessionCreated) return;

    if (confirm("End current session and create a new one?")) {
        stopSessionTimer();
        sessionCreated = false;
        window.isSessionActive = false;
        sessionEndTime = null;

        // Reset timer display
        const timerText = document.getElementById('session-timer-text');
        const timerDot = document.getElementById('session-timer-dot');
        const startBtn = document.getElementById('btn-session-start');
        const stopBtn = document.getElementById('btn-session-stop');
        const statusText = document.getElementById('status-text');

        timerText.innerText = '2:00:00';
        timerDot.className = 'session-indicator';
        startBtn.classList.remove('active');
        stopBtn.classList.remove('stopped');
        statusText.innerText = 'Ready';

        // Show setup overlay again
        const overlay = document.getElementById('setup-overlay');
        const fileInput = document.getElementById('setup-resume');
        const jdInput = document.getElementById('setup-jobdesc');
        const status = document.getElementById('setup-status');

        overlay.style.display = 'flex';
        fileInput.value = '';
        jdInput.value = '';
        status.innerText = '';
    }
}
