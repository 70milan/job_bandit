// Session Setup & Timer Logic

const FULL_SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEMO_SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes
let SESSION_DURATION_MS = DEMO_SESSION_DURATION_MS; // Default to demo
let sessionEndTime = null;
let timerInterval = null;
let sessionCreated = false;
let sessionTimerStarted = false;
let currentSessionName = null;  // Track current session name
let isLicensed = false; // Track license status

// License validation (obfuscated)
const VALID_LICENSE_HASH = 'a3f2b8c1d4e5'; // Simple hash of valid key
function hashLicense(key) {
    // Simple hash for basic obfuscation
    if (!key) return '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 12);
}

async function validateLicense(key) {
    if (!key || key.trim() === '') return 'empty';
    
    try {
        console.log('[DEBUG] Calling validate-license endpoint...');
        const res = await fetch('http://127.0.0.1:5050/validate-license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: key.trim() })
        });
        console.log('[DEBUG] Response status:', res.status);
        const data = await res.json();
        console.log('[DEBUG] Response data:', data);
        return data.status; // 'valid', 'invalid', or 'empty'
    } catch (e) {
        console.error('[DEBUG] License validation error:', e);
        // If backend is down, allow demo mode
        return 'empty';
    }
}

// Session lock - prevents actions until Start is clicked
window.isSessionActive = false;

// Custom styled alert/confirm functions
function showCustomModal(message, isConfirm = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const msgEl = document.getElementById('custom-modal-message');
        const okBtn = document.getElementById('custom-modal-ok');
        const cancelBtn = document.getElementById('custom-modal-cancel');
        
        msgEl.innerHTML = message.replace(/\n/g, '<br>');
        cancelBtn.style.display = isConfirm ? 'block' : 'none';
        modal.style.display = 'flex';
        
        const handleOk = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

window.customAlert = (msg) => showCustomModal(msg, false);
window.customConfirm = (msg) => showCustomModal(msg, true);

// License prompt after demo expires
async function showLicensePrompt() {
    const result = await customConfirm('Demo session expired (5 min).\n\nEnter a license key for full 2-hour sessions.\n\nClick OK to enter license, or Cancel to return to setup.');
    
    if (result) {
        // Show setup overlay again so user can enter license
        const overlay = document.getElementById('setup-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            // Focus on license input
            setTimeout(() => {
                const licenseInput = document.getElementById('setup-license');
                if (licenseInput) {
                    licenseInput.focus();
                    licenseInput.style.borderColor = 'rgba(100, 255, 150, 0.5)';
                }
            }, 100);
        }
        // Reset session state
        sessionCreated = false;
        window.isSessionActive = false;
    } else {
        // Return to setup screen
        const overlay = document.getElementById('setup-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
        sessionCreated = false;
        window.isSessionActive = false;
    }
}

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

// Global validation function
function checkAllInputs() {
    const sessionNameInput = document.getElementById('setup-session-name');
    const fileInput = document.getElementById('setup-resume');
    const apiKeyInput = document.getElementById('setup-apikey');
    const jdInput = document.getElementById('setup-jobdesc');
    const startBtn = document.getElementById('btn-start-session');
    
    const hasSessionName = sessionNameInput && sessionNameInput.value.trim().length > 0;
    const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
    const hasApiKey = apiKeyInput && apiKeyInput.value.trim().length > 0;
    const hasJD = jdInput && jdInput.value.trim().length > 0;
    
    if (hasSessionName && hasFile && hasApiKey && hasJD && startBtn) {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
    } else if (startBtn) {
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
    }
}

// Initialize immediately since script is loaded at end of body
initSession();

function initSession() {
        const sessionNameInput = document.getElementById('setup-session-name');
        const fileInput = document.getElementById('setup-resume');
        const apiKeyInput = document.getElementById('setup-apikey');
        const jdInput = document.getElementById('setup-jobdesc');
        const startBtn = document.getElementById('btn-start-session');
        const resumeFilename = document.getElementById('resume-filename');
        
        console.log('[DEBUG] initSession: fileInput found?', !!fileInput);
        console.log('[DEBUG] initSession: resumeFilename found?', !!resumeFilename);
        
        // Update filename display when file is selected
        if (fileInput && resumeFilename) {
            fileInput.addEventListener('change', () => {
                console.log('[DEBUG] File input changed!');
                console.log('[DEBUG] Files:', fileInput.files);
                if (fileInput.files && fileInput.files.length > 0) {
                    console.log('[DEBUG] Selected file:', fileInput.files[0].name);
                    resumeFilename.textContent = fileInput.files[0].name;
                    resumeFilename.style.color = 'rgba(100, 255, 150, 0.9)';
                } else {
                    resumeFilename.textContent = 'No file chosen';
                    resumeFilename.style.color = 'rgba(255, 255, 255, 0.4)';
                }
                checkAllInputs();
            });
        }
        
        if (sessionNameInput) {
            sessionNameInput.addEventListener('input', checkAllInputs);
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
        
        // Check for saved valid license - grey out and disable if already validated
        const licenseInput = document.getElementById('setup-license');
        const savedLicense = localStorage.getItem('valid_license_key');
        const licenseBadge = document.getElementById('license-status-badge');
        
        if (savedLicense && licenseInput) {
            // License already validated - show as disabled/greyed out
            licenseInput.value = 'License Active';
            licenseInput.disabled = true;
            licenseInput.style.opacity = '0.5';
            licenseInput.style.cursor = 'not-allowed';
            console.log('[DEBUG] Valid license found in localStorage - field disabled');
            
            // Show Licensed badge
            if (licenseBadge) {
                licenseBadge.textContent = 'Licensed';
                licenseBadge.style.color = 'rgba(100, 255, 150, 0.7)';
            }
        } else {
            // Show Unlicensed badge
            if (licenseBadge) {
                licenseBadge.textContent = 'Demo';
                licenseBadge.style.color = 'rgba(255, 200, 100, 0.7)';
            }
        }
        
    const endBtn = document.getElementById('btn-session-end');
    const startTimerBtn = document.getElementById('btn-session-start');
    const stopTimerBtn = document.getElementById('btn-session-stop');

    // Overlay is visible by default - waiting for session creation
    console.log('[DEBUG] initSession: startBtn found?', !!startBtn);
    if (startBtn) {
        startBtn.onclick = handleCreateSession;
        console.log('[DEBUG] initSession: onclick handler attached to Start Session button');
    } else {
        console.error('[DEBUG] initSession: btn-start-session NOT FOUND!');
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
    
    // Past Sessions button and modal
    const pastSessionsBtn = document.getElementById('btn-past-sessions');
    const pastSessionsModal = document.getElementById('past-sessions-modal');
    const closePastSessions = document.getElementById('close-past-sessions');
    
    if (pastSessionsBtn) {
        pastSessionsBtn.onclick = async () => {
            pastSessionsModal.style.display = 'flex';
            const listContainer = document.getElementById('past-sessions-list');
            listContainer.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 20px;">Loading...</div>';
            
            try {
                const res = await fetch('http://127.0.0.1:5050/sessions');
                const data = await res.json();
                
                if (data.sessions && data.sessions.length > 0) {
                    listContainer.innerHTML = data.sessions.map(session => `
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 12px; cursor: pointer; transition: all 0.2s;" 
                             onmouseover="this.style.background='rgba(255,255,255,0.06)'" 
                             onmouseout="this.style.background='rgba(255,255,255,0.03)'"
                             onclick="window.openPastSession('${session.name.replace(/'/g, "\\'")}')">
                            <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 4px;">${session.name}</div>
                            <div style="color: rgba(255,255,255,0.4); font-size: 10px;">${session.created_at || 'No date'}</div>
                            <div style="color: rgba(255,255,255,0.3); font-size: 10px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${session.job_description_preview || ''}</div>
                        </div>
                    `).join('');
                } else {
                    listContainer.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 20px;">No past sessions found</div>';
                }
            } catch (e) {
                listContainer.innerHTML = '<div style="color: #ff6b6b; font-size: 12px; text-align: center; padding: 20px;">Error loading sessions. Is backend running?</div>';
            }
        };
    }
    
    if (closePastSessions) {
        closePastSessions.onclick = () => {
            pastSessionsModal.style.display = 'none';
        };
    }
    
    // Close modal when clicking outside
    if (pastSessionsModal) {
        pastSessionsModal.onclick = (e) => {
            if (e.target === pastSessionsModal) {
                pastSessionsModal.style.display = 'none';
            }
        };
    }
    
    // Guide button and modal
    const guideBtn = document.getElementById('btn-guide');
    const guideModal = document.getElementById('guide-modal');
    const closeGuide = document.getElementById('close-guide');
    
    if (guideBtn) {
        guideBtn.onclick = () => {
            guideModal.style.display = 'flex';
        };
    }
    
    if (closeGuide) {
        closeGuide.onclick = () => {
            guideModal.style.display = 'none';
        };
    }
    
    // Close guide modal when clicking outside
    if (guideModal) {
        guideModal.onclick = (e) => {
            if (e.target === guideModal) {
                guideModal.style.display = 'none';
            }
        };
    }
    
    // API Key info click handler
    const apikeyInfo = document.getElementById('apikey-info');
    if (apikeyInfo) {
        apikeyInfo.onclick = () => {
            customAlert('You need your own OpenAI API key to use this app.\n\n' +
                'HOW TO GET ONE:\n' +
                '1. Go to <a href="https://platform.openai.com" target="_blank" style="color: rgba(100, 255, 150, 0.9);">platform.openai.com</a>\n' +
                '2. Sign up or log in\n' +
                '3. Go to API Keys section\n' +
                '4. Create a new secret key (starts with sk-)\n\n' +
                'WHY THIS IS CHEAP:\n' +
                'Similar interview apps charge $30-100/month.\n' +
                'With your own API key, you pay only for what you use!\n\n' +
                'EXAMPLE COST:\n' +
                '- 50 AI responses = $0.15 - $0.30\n' +
                '- Full 2-hour interview = $0.50 - $1.00\n' +
                '- That is 10-100x cheaper than competitors!\n\n' +
                'Add $5-10 credit to start. It lasts for many interviews.');
        };
    }
    
    // License info click handler
    const licenseInfo = document.getElementById('license-info');
    if (licenseInfo) {
        licenseInfo.onclick = () => {
            customAlert('Get a license key for full 2-hour sessions.\n\nOne-time payment of $1 only.\n\nContact: mjulez70@gmail.com');
        };
    }
}

// Open a past session (placeholder - just shows session name for now)
window.openPastSession = function(sessionName) {
    customAlert(`Session: ${sessionName}\n\nNote: Loading past sessions is not yet implemented. This will show session details in a future update.`);
};

async function handleCreateSession() {
    console.log('[DEBUG] Start Session button clicked!');
    const sessionNameInput = document.getElementById('setup-session-name');
    const fileInput = document.getElementById('setup-resume');
    const apiKeyInput = document.getElementById('setup-apikey');
    const jdInput = document.getElementById('setup-jobdesc');
    const status = document.getElementById('setup-status');
    const startBtn = document.getElementById('btn-start-session');

    // Validate session name
    const sessionName = sessionNameInput ? sessionNameInput.value.trim() : '';
    console.log('[DEBUG] Session name:', sessionName);
    if (!sessionName) {
        status.innerText = "Please enter a session name";
        status.style.color = "#ff6b6b";
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        return;
    }
    
    // Sanitize session name (remove invalid folder characters)
    const sanitizedSessionName = sessionName.replace(/[<>:"/\\|?*]/g, '_');

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

    // Validate license
    const licenseInput = document.getElementById('setup-license');
    const savedLicense = localStorage.getItem('valid_license_key');
    
    // If license is already saved and validated, skip validation
    if (savedLicense) {
        isLicensed = true;
        SESSION_DURATION_MS = FULL_SESSION_DURATION_MS;
        console.log('[DEBUG] Using saved license - Full 2-hour session');
        status.innerText = "License validated - Full session";
        status.style.color = "rgba(100, 255, 150, 0.9)";
    } else {
        // No saved license - check what user entered
        const licenseKey = licenseInput ? licenseInput.value.trim() : '';
        console.log('[DEBUG] License key:', licenseKey ? '(provided)' : '(empty)');
        const licenseStatus = await validateLicense(licenseKey);
        console.log('[DEBUG] License status:', licenseStatus);
        
        // License validation logic:
        // 1. Empty = demo mode (5 min)
        // 2. Valid = full session (2hrs) + save to localStorage
        // 3. Invalid/partial = error, don't proceed
        
        if (licenseKey && licenseStatus === 'invalid') {
            // User entered something but it's wrong - show error and stop
            status.innerText = "Please enter a valid license key";
            status.style.color = "#ff4444";
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            return;
        }
        
        // Set session duration based on license
        if (licenseStatus === 'valid') {
            isLicensed = true;
            SESSION_DURATION_MS = FULL_SESSION_DURATION_MS;
            console.log('[DEBUG] Licensed: Full 2-hour session');
            // Save valid license to localStorage - never ask again
            localStorage.setItem('valid_license_key', licenseKey);
            status.innerText = "License validated - Full session";
            status.style.color = "rgba(100, 255, 150, 0.9)";
        } else {
            // Demo mode - no license provided
            isLicensed = false;
            SESSION_DURATION_MS = DEMO_SESSION_DURATION_MS;
            console.log('Demo mode: 5-minute session');
            status.innerText = "Demo mode: 5-minute session";
            status.style.color = "rgba(255, 200, 100, 0.9)";
        }
    }
    
    // Small delay so user sees the license status
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        startBtn.disabled = true;
        status.style.color = "#aaa";

        // 0. Create session folder first
        status.innerText = "Creating session...";
        const createSessionRes = await fetch('http://127.0.0.1:5050/session/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_name: sanitizedSessionName })
        });
        const createSessionJson = await createSessionRes.json();
        
        if (createSessionJson.status !== 'ok') {
            throw new Error(createSessionJson.error || "Failed to create session");
        }
        
        currentSessionName = sanitizedSessionName;

        // 1. Validate API Key
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

        // 2. Upload Resume (to session folder)
        status.innerText = "Uploading resume...";
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);
        fd.append('session_name', sanitizedSessionName);

        const upRes = await fetch('http://127.0.0.1:5050/session/resume', { method: 'POST', body: fd });
        const upJson = await upRes.json();

        if (upJson.status !== 'ok') {
            throw new Error("Resume upload failed: " + (upJson.error || 'Unknown error'));
        }

        // 3. Save session data (job description, api key, etc.)
        status.innerText = "Saving session data...";
        const sessionData = {
            session_name: sanitizedSessionName,
            openai_api_key: apiKey,
            job_description: jdInput.value.trim(),
            resume_text: upJson.resume_text || '',
            created_at: new Date().toISOString()
        };

        const saveRes = await fetch('http://127.0.0.1:5050/session/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });

        const saveJson = await saveRes.json();
        if (saveJson.status !== 'ok') {
            throw new Error("Session save failed: " + (saveJson.error || 'Unknown error'));
        }

        // 4. Session created - hide overlay
        sessionCreated = true;
        status.innerText = isLicensed ? "Session created!" : "Demo session created (5 min)";
        status.style.color = "rgba(100, 255, 150, 0.9)";
        
        // Update timer display to show correct duration
        const timerText = document.getElementById('session-timer-text');
        if (timerText) {
            if (isLicensed) {
                timerText.innerText = '2:00:00';
            } else {
                timerText.innerText = '0:05:00';
            }
        }

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
        customAlert('Create a session first!');
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
    statusText.innerText = isLicensed ? 'Session Running' : 'Demo Mode (5 min)';

    timerInterval = setInterval(() => {
        const remaining = sessionEndTime - Date.now();

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerText.innerText = `0:00:00`;
            timerDot.className = 'session-indicator';
            if (isLicensed) {
                customAlert('Session time expired! (2 hours)');
                statusText.innerText = 'Session Expired';
            } else {
                // Demo expired - show license prompt
                showLicensePrompt();
                statusText.innerText = 'Demo Expired';
            }
            stopBtn.classList.add('stopped');
            startBtn.classList.remove('active');
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

async function endSession() {
    if (!sessionCreated) return;

    if (await customConfirm("End current session and create a new one?")) {
        // Save session before ending
        if (currentSessionName) {
            fetch('http://127.0.0.1:5050/session/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_name: currentSessionName })
            }).catch(() => {});
        }
        
        stopSessionTimer();
        sessionCreated = false;
        window.isSessionActive = false;
        sessionEndTime = null;
        currentSessionName = null;

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

        // Show setup overlay again and reset to original state
        const overlay = document.getElementById('setup-overlay');
        const sessionNameInput = document.getElementById('setup-session-name');
        const fileInput = document.getElementById('setup-resume');
        const apiKeyInput = document.getElementById('setup-apikey');
        const jdInput = document.getElementById('setup-jobdesc');
        const status = document.getElementById('setup-status');
        const sessionStartBtn = document.getElementById('btn-start-session');

        overlay.style.display = 'flex';
        
        // Reset session name
        if (sessionNameInput) sessionNameInput.value = '';
        
        // Reset file input - clear value and remove 'selected' class (back to red)
        fileInput.value = '';
        fileInput.classList.remove('selected');
        
        // Reset filename display
        const resumeFilename = document.getElementById('resume-filename');
        if (resumeFilename) {
            resumeFilename.textContent = 'No file chosen';
            resumeFilename.style.color = 'rgba(255, 255, 255, 0.4)';
        }
        
        // Reset other inputs
        if (apiKeyInput) apiKeyInput.value = '';
        if (jdInput) jdInput.value = '';
        status.innerText = '';
        status.style.color = '#aaa';
        
        // Reset the start button to disabled state (original state)
        if (sessionStartBtn) {
            sessionStartBtn.disabled = true;
            sessionStartBtn.style.opacity = '0.5';
        }
        
        // Re-attach click handler to ensure it works
        sessionStartBtn.onclick = handleCreateSession;
        
        // Clear conversation history on backend
        fetch('http://127.0.0.1:5050/conversation/clear', { method: 'POST' }).catch(() => {});
        
        // Clear transcript and response areas
        const transcriptArea = document.getElementById('transcript-area');
        const responseArea = document.getElementById('response-area');
        if (transcriptArea) transcriptArea.innerHTML = '';
        if (responseArea) responseArea.innerHTML = '';
    }
}
