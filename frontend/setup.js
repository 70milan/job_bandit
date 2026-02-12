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
let sessionStartTimestamp = null; // Track when session started for duration calculation

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
        fileInput.addEventListener('change', function () {
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
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 12px; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;" 
                             onmouseover="this.style.background='rgba(255,255,255,0.06)'" 
                             onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                            <div style="flex: 1; cursor: pointer;" onclick="window.openPastSession('${session.name.replace(/'/g, "\\'")}')">
                                <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 4px;">${session.name}</div>
                                <div style="color: rgba(255,255,255,0.4); font-size: 10px;">${session.created_at || 'No date'}</div>
                                <div style="color: rgba(255,255,255,0.3); font-size: 10px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${session.job_description_preview || ''}</div>
                            </div>
                            <button onclick="event.stopPropagation(); window.deletePastSession('${session.name.replace(/'/g, "\\'")}')" 
                                    style="background: none; border: none; cursor: pointer; padding: 6px; margin-left: 8px; transition: all 0.2s; font-size: 16px; color: rgba(255,255,255,0.3);"
                                    onmouseover="this.style.color='rgba(255,100,100,0.8)'" 
                                    onmouseout="this.style.color='rgba(255,255,255,0.3)'"
                                    title="Delete session">🗑️</button>
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

// Load and start a past session
window.openPastSession = async function (sessionName) {
    const pastSessionsModal = document.getElementById('past-sessions-modal');
    const apiKeyInput = document.getElementById('setup-apikey');
    const status = document.getElementById('setup-status');

    if (pastSessionsModal) pastSessionsModal.style.display = 'none';

    try {
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        if (!apiKey) {
            status.innerText = 'Enter your OpenAI API Key first, then select a past session.';
            status.style.color = '#ff6b6b';
            if (apiKeyInput) apiKeyInput.focus();
            return;
        }

        status.innerText = 'Validating API key...';
        status.style.color = '#aaa';

        const validateRes = await fetch('http://127.0.0.1:5050/validate-api-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });
        const validateData = await validateRes.json();

        if (!validateData.valid) {
            status.innerText = validateData.error || 'Invalid API key';
            status.style.color = '#ff6b6b';
            return;
        }

        // Check license - use saved license if available
        const savedLicense = localStorage.getItem('valid_license_key');
        if (savedLicense) {
            isLicensed = true;
            console.log('[DEBUG] Using saved license for past session');
        } else {
            const licenseInput = document.getElementById('setup-license');
            const licenseKey = licenseInput ? licenseInput.value.trim() : '';
            const licenseStatus = await validateLicense(licenseKey);
            isLicensed = (licenseStatus === 'valid');
        }

        SESSION_DURATION_MS = isLicensed ? FULL_SESSION_DURATION_MS : DEMO_SESSION_DURATION_MS;

        // Load session data
        status.innerText = 'Loading session...';
        const loadRes = await fetch(`http://127.0.0.1:5050/session/load/${encodeURIComponent(sessionName)}`);
        const sessionData = await loadRes.json();

        if (sessionData.status !== 'ok') {
            status.innerText = sessionData.error || 'Failed to load session';
            status.style.color = '#ff6b6b';
            return;
        }

        // Generate new session name with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
        const newSessionName = `${sessionName}_${timestamp}`;

        status.innerText = 'Creating session...';
        const createRes = await fetch('http://127.0.0.1:5050/session/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_name: newSessionName })
        });

        // Smart Job Description handling - user input takes precedence
        const jdInput = document.getElementById('setup-jobdesc');
        const userJD = jdInput ? jdInput.value.trim() : '';
        const finalJD = userJD || sessionData.job_description;

        // Save session data
        await fetch('http://127.0.0.1:5050/session/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_name: newSessionName,
                openai_api_key: apiKey,
                job_description: finalJD,
                resume_text: sessionData.resume_text,
                created_at: now.toISOString(),
                text_model: window.selectedModel || 'gpt-3.5-turbo'
            })
        });

        await fetch('http://127.0.0.1:5050/conversation/clear', { method: 'POST' });

        currentSessionName = newSessionName;
        sessionCreated = true;

        // Restore model preference from past session
        if (sessionData.text_model) {
            window.selectedModel = sessionData.text_model;
            const modelBtn = document.getElementById('model-selector-btn');
            if (modelBtn) {
                // Find model name from dropdown options
                const modelOpt = document.querySelector(`[data-model="${sessionData.text_model}"]`);
                if (modelOpt) {
                    modelBtn.textContent = modelOpt.querySelector('div').textContent;
                } else {
                    modelBtn.textContent = sessionData.text_model.replace('gpt-', 'GPT-').replace('-turbo', '');
                }
            }
            console.log('[SESSION] Restored model preference:', sessionData.text_model);
        }

        // Update license badge
        const badge = document.getElementById('license-status-badge');
        if (badge) {
            if (isLicensed) {
                badge.textContent = 'LICENSED';
                badge.style.color = 'rgba(100, 255, 150, 0.8)';
            } else {
                badge.textContent = 'DEMO (5 MIN)';
                badge.style.color = 'rgba(255, 200, 100, 0.8)';
            }
        }

        // Update timer display WITHOUT starting
        const timerText = document.getElementById('session-timer-text');
        if (timerText) {
            timerText.innerText = isLicensed ? '2:00:00' : '0:05:00';
        }

        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.innerText = 'Session Ready - Click Start';
        }

        const overlay = document.getElementById('setup-overlay');
        if (overlay) overlay.style.display = 'none';

        status.innerText = '';
        console.log(`[SESSION] Loaded past session: ${sessionName} -> New session: ${newSessionName}`);

    } catch (e) {
        console.error('Error loading past session:', e);
        status.innerText = 'Error loading session. Is backend running?';
        status.style.color = '#ff6b6b';
    }
};

// Delete past session function  
window.deletePastSession = async function (sessionName) {
    const confirmed = await customConfirm(`Delete session "${sessionName}"?\n\nThis cannot be undone.`);

    if (!confirmed) return;

    try {
        const res = await fetch(`http://127.0.0.1:5050/session/delete/${encodeURIComponent(sessionName)}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (data.status === 'ok') {
            const pastSessionsBtn = document.getElementById('btn-past-sessions');
            if (pastSessionsBtn) {
                pastSessionsBtn.click(); // Refresh list
            }
        } else {
            await customAlert(`Failed to delete session:\n${data.error || 'Unknown error'}`);
        }
    } catch (e) {
        console.error('Error deleting session:', e);
        await customAlert(`Error deleting session:\n${e.message}`);
    }
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
    sessionStartTimestamp = Date.now(); // Track start time for duration calculation
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
        // Calculate session duration
        let sessionDuration = 'N/A';
        if (sessionStartTimestamp) {
            const durationMs = Date.now() - sessionStartTimestamp;
            const hours = Math.floor(durationMs / 3600000);
            const minutes = Math.floor((durationMs % 3600000) / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            if (hours > 0) {
                sessionDuration = `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
                sessionDuration = `${minutes}m ${seconds}s`;
            } else {
                sessionDuration = `${seconds}s`;
            }
        }

        // Get API usage cost
        let apiCost = '$0.00';
        try {
            const usageRes = await fetch('http://127.0.0.1:5050/usage');
            if (usageRes.ok) {
                const usage = await usageRes.json();
                apiCost = '$' + (usage.total_cost || 0).toFixed(4);
            }
        } catch (e) { }

        // Show session summary popup
        await customAlert(`Session Summary\n\nDuration: ${sessionDuration}\nAPI Usage: ${apiCost}`);

        // Stop the timer if running
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // Reset usage for next session
        fetch('http://127.0.0.1:5050/usage/reset', { method: 'POST' }).catch(() => { });

        // Clear conversation history on backend
        fetch('http://127.0.0.1:5050/conversation/clear', { method: 'POST' }).catch(() => { });

        // Get DOM elements (they're not in scope, need to get them here)
        const fileInput = document.getElementById('setup-resume');
        const apiKeyInput = document.getElementById('setup-apikey');
        const jdInput = document.getElementById('setup-jobdesc');
        const sessionNameInput = document.getElementById('setup-session-name');
        const status = document.getElementById('setup-status');
        const sessionStartBtn = document.getElementById('btn-start-session');
        const overlay = document.getElementById('setup-overlay');

        // Reset file input
        if (fileInput) {
            fileInput.value = '';
            fileInput.classList.remove('selected');
        }

        // Reset filename display
        const resumeFilename = document.getElementById('resume-filename');
        if (resumeFilename) {
            resumeFilename.textContent = 'No file chosen';
            resumeFilename.style.color = 'rgba(255, 255, 255, 0.4)';
        }

        // Reset other inputs
        if (sessionNameInput) sessionNameInput.value = '';
        if (apiKeyInput) apiKeyInput.value = '';
        if (jdInput) jdInput.value = '';
        if (status) {
            status.innerText = '';
            status.style.color = '#aaa';
        }

        // Reset the start button to disabled state (original state)
        if (sessionStartBtn) {
            sessionStartBtn.disabled = true;
            sessionStartBtn.style.opacity = '0.5';
            sessionStartBtn.onclick = handleCreateSession;
        }

        // Clear transcript and response areas
        const transcriptArea = document.getElementById('transcript-area');
        const responseArea = document.getElementById('response-area');
        if (transcriptArea) transcriptArea.innerHTML = '';
        if (responseArea) responseArea.innerHTML = '';

        // Reset timer display
        const timerText = document.getElementById('session-timer-text');
        const timerDot = document.getElementById('session-timer-dot');
        if (timerText) timerText.innerText = '2:00:00';
        if (timerDot) timerDot.className = 'session-indicator';

        // Reset button states
        const startBtn = document.getElementById('btn-session-start');
        const stopBtn = document.getElementById('btn-session-stop');
        if (startBtn) startBtn.classList.remove('active');
        if (stopBtn) stopBtn.classList.remove('stopped');

        // Reset status text
        const statusText = document.getElementById('status-text');
        if (statusText) statusText.innerText = 'Ready';

        // Reset session state variables
        sessionCreated = false;
        sessionTimerStarted = false;
        window.isSessionActive = false;
        currentSessionName = null;
        sessionEndTime = null;
        sessionStartTimestamp = null;

        // SHOW THE SETUP OVERLAY - this is what was missing!
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }
}

// Inject API cost and Model Selector elements into status bar dynamically
(function () {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        const rightSide = statusBar.querySelector('div:last-child');
        if (rightSide) {
            // Model Selector
            const modelDiv = document.createElement('div');
            modelDiv.style.cssText = 'display: flex; align-items: center; gap: 6px; position: relative;';
            modelDiv.innerHTML = `
                <span style="color: #555;">Model:</span>
                <button id="model-selector-btn" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: rgba(120, 200, 180, 0.85); padding: 2px 8px; font-size: 10px; cursor: pointer; font-weight: 500;">
                    GPT-3.5
                </button>
                <div id="model-dropdown" style="display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 5px; background: rgba(30,30,30,0.98); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; min-width: 220px; z-index: 10003; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                </div>
            `;
            rightSide.insertBefore(modelDiv, rightSide.firstChild);

            // API Cost
            const apiCostDiv = document.createElement('div');
            apiCostDiv.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-left: 10px;';
            apiCostDiv.innerHTML = '<span style="color: #555;">API Approx.:</span><span id="api-cost" style="color: rgba(120, 200, 180, 0.85); font-weight: 500;">$0.00</span>';
            rightSide.insertBefore(apiCostDiv, rightSide.lastChild);
        }
    }

    // Initialize model selector
    window.selectedModel = 'gpt-3.5-turbo';

    const modelBtn = document.getElementById('model-selector-btn');
    const modelDropdown = document.getElementById('model-dropdown');

    if (modelBtn && modelDropdown) {
        // Fetch models from backend
        fetch('http://127.0.0.1:5050/models')
            .then(res => res.json())
            .then(data => {
                if (data.models) {
                    modelDropdown.innerHTML = data.models.map(m => {
                        const isGPT5 = m.id.startsWith('gpt-5');
                        const comingSoonTag = isGPT5 ? ' <span style="color: rgba(255, 150, 100, 0.9); font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 6px;">(Coming Soon)</span>' : '';
                        const opacity = isGPT5 ? 'opacity: 0.5;' : '';
                        const cursor = isGPT5 ? 'cursor: not-allowed;' : 'cursor: pointer;';

                        return `
                        <div class="model-option ${isGPT5 ? 'disabled' : ''}" data-model="${m.id}" data-disabled="${isGPT5}" style="padding: 8px 12px; ${cursor} border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; ${opacity}">
                            <div style="color: rgba(255,255,255,0.9); font-size: 11px; font-weight: 500;">${m.name}${comingSoonTag}</div>
                            <div style="color: rgba(255,255,255,0.4); font-size: 9px; margin-top: 2px;">
                                ${m.speed} · ${m.cost} · ${m.accuracy} — ${m.description}
                            </div>
                        </div>
                    `}).join('');

                    // Add hover effect and click handling
                    modelDropdown.querySelectorAll('.model-option').forEach(opt => {
                        const isDisabled = opt.dataset.disabled === 'true';

                        if (!isDisabled) {
                            opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(255,255,255,0.08)');
                            opt.addEventListener('mouseleave', () => opt.style.background = 'transparent');
                            opt.addEventListener('click', () => {
                                const modelId = opt.dataset.model;
                                window.selectedModel = modelId;
                                modelBtn.textContent = opt.querySelector('div').textContent.replace('(Coming Soon)', '').trim();
                                modelDropdown.style.display = 'none';
                                console.log('[MODEL] Selected:', modelId);
                            });
                        } else {
                            // Show error popup for GPT-5 models
                            opt.addEventListener('click', () => {
                                const errorPopup = document.getElementById('session-error-popup');
                                if (errorPopup) {
                                    errorPopup.textContent = 'GPT-5 models coming soon!';
                                    errorPopup.style.display = 'block';
                                    errorPopup.style.opacity = '1';
                                    setTimeout(() => {
                                        errorPopup.style.opacity = '0';
                                        setTimeout(() => errorPopup.style.display = 'none', 200);
                                    }, 2000);
                                }
                                modelDropdown.style.display = 'none';
                            });
                        }
                    });

                    // Set default
                    if (data.default) {
                        window.selectedModel = data.default;
                    }
                }
            })
            .catch(e => console.error('Failed to load models:', e));

        // Toggle dropdown
        modelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modelDropdown.style.display = modelDropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Close on outside click
        document.addEventListener('click', () => {
            modelDropdown.style.display = 'none';
        });
    }
})();
