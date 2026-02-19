// streaming-ai.js - Stream AI response handler
// Override btnGenerate to use streaming endpoint

function initializeStreamingAI() {
    console.log('[STREAM] Initializing streaming AI...');

    // Store original implementation
    const originalOnClick = btnGenerate.onclick;

    btnGenerate.onclick = async function () {
        if (!window.isSessionActive) {
            window.showSessionError();
            return;
        }

        const transcript = transcriptArea.innerText.trim();
        if (!transcript && !capturedScreenshot) {
            responseArea.innerText = 'No transcript or screenshot to process.';
            return;
        }

        btnGenerate.classList.add('active');
        responseArea.innerText = 'Generating...';
        const startTime = Date.now();
        const responseTimeEl = document.getElementById('response-time');
        if (responseTimeEl) responseTimeEl.innerText = '';

        try {
            const requestBody = {
                transcript: transcript || 'Analyze this screenshot',
                role: 'data engineer',
                save_to_context: true,
                text_model: window.selectedModel || 'gpt-3.5-turbo'
            };

            if (capturedScreenshot) {
                requestBody.screenshot = capturedScreenshot;
            }

            // Use STREAMING endpoint
            const res = await fetch('http://127.0.0.1:5050/ai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            // Clear and start streaming
            // responseArea.innerText = ''; // Removed to keep "Generating..." visible
            let fullResponse = '';
            let usedModel = '';
            let responseCost = 0;
            let ttft = 0; // time to first token
            let firstChunkReceived = false;

            // Read stream with proper SSE line buffering
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n');
                // Keep the last part in buffer (may be incomplete)
                buffer = parts.pop();

                for (const line of parts) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.chunk) {
                                if (!firstChunkReceived) {
                                    firstChunkReceived = true;
                                    ttft = (Date.now() - startTime) / 1000;
                                    if (responseTimeEl) {
                                        responseTimeEl.innerText = ttft.toFixed(1) + 's';
                                    }
                                }
                                fullResponse += data.chunk;
                                responseArea.innerText = fullResponse;
                                responseArea.scrollTop = responseArea.scrollHeight;
                            }

                            if (data.done) {
                                console.log('[STREAM] Complete');
                                // Use backend TTFT if available (more accurate)
                                if (data.ttft && data.ttft > 0) {
                                    ttft = data.ttft;
                                    if (responseTimeEl) {
                                        responseTimeEl.innerText = ttft.toFixed(1) + 's';
                                    }
                                }
                                // Capture per-response cost
                                if (data.response_cost !== undefined) {
                                    responseCost = data.response_cost;
                                }
                                // Update API cost display with color gradient
                                if (data.usage && data.usage.total_cost !== undefined) {
                                    const apiCostEl = document.getElementById('api-cost');
                                    if (apiCostEl) {
                                        const cost = data.usage.total_cost;
                                        // Show cents when under $1, dollars when $1+
                                        if (cost < 1.00) {
                                            apiCostEl.innerText = (cost * 100).toFixed(2) + '¢';
                                        } else {
                                            apiCostEl.innerText = '$' + cost.toFixed(2);
                                        }
                                        // Color gradient: green < $0.10, orange $0.10-$0.50, red > $0.50
                                        if (cost < 0.10) {
                                            apiCostEl.style.color = 'rgba(120, 200, 180, 0.85)'; // soft teal
                                        } else if (cost < 0.50) {
                                            apiCostEl.style.color = 'rgba(200, 170, 120, 0.85)'; // muted amber
                                        } else {
                                            apiCostEl.style.color = 'rgba(200, 130, 130, 0.85)'; // soft rose
                                        }
                                    }
                                }
                                // Show which model was used in status bar
                                if (data.model) {
                                    const statusTextEl = document.getElementById('status-text');
                                    if (statusTextEl) {
                                        // Reset status text
                                        statusTextEl.innerText = window.isSessionActive ? 'Session Running' : 'Ready';

                                        // Store model name for convo capture (badge added after formatting)
                                        const displayName = data.model;
                                        usedModel = displayName;
                                    }
                                }
                            }
                        } catch (jsonError) {
                            // Re-throw API errors, only ignore actual JSON parse failures
                            if (jsonError instanceof SyntaxError) {
                                console.warn('[STREAM] Malformed JSON:', line);
                            } else {
                                throw jsonError;
                            }
                        }
                    }
                }
            }

            // If stream ended with no content, show error
            if (!fullResponse.trim()) {
                const modelName = window.selectedModel || 'unknown';
                responseArea.innerText = `Error: No response from model "${modelName}".\n\nThe model may have rejected the request. Try a different model or check the backend console for details.`;
                btnGenerate.classList.remove('active');
                return;
            }

            // Format complete response
            let formattedResponse = fullResponse;
            const codeBlocks = [];
            const inlineCodeBlocks = [];

            // Normalize ALL line endings to \n (GPT-5/reasoning models may use \r\n or \r)
            formattedResponse = formattedResponse.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            // Match fenced code blocks: 3+ backticks, optional language, content, closing backticks
            // Handles: ```python\n...\n```, ``` python \n...\n  ```, ````python\n...\n````
            formattedResponse = formattedResponse.replace(/`{3,}\s*(\w+)?\s*\n([\s\S]*?)\n\s*`{3,}/g, (match, lang, code) => {
                const language = lang || 'plaintext';
                const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
                codeBlocks.push(`<pre><code class="language-${language}">${escapedCode}</code></pre>`);
                return placeholder;
            });

            formattedResponse = formattedResponse.replace(/`([^`]+)`/g, (match, code) => {
                const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const placeholder = `___INLINE_CODE_${inlineCodeBlocks.length}___`;
                inlineCodeBlocks.push(`<code>${escapedCode}</code>`);
                return placeholder;
            });

            formattedResponse = formattedResponse.replace(/\n/g, '<br>');

            codeBlocks.forEach((block, i) => {
                formattedResponse = formattedResponse.replace(`___CODE_BLOCK_${i}___`, block);
            });

            inlineCodeBlocks.forEach((code, i) => {
                formattedResponse = formattedResponse.replace(`___INLINE_CODE_${i}___`, code);
            });

            responseArea.innerHTML = formattedResponse;

            // Add styled model badge after formatted HTML
            if (usedModel) {
                const modelBadge = document.createElement('div');
                modelBadge.style.cssText = 'margin-top: 20px; padding: 6px 10px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; letter-spacing: 0.5px;';
                modelBadge.innerHTML = '<span style="color: #EEFF00; font-weight: 600;">Model Used: </span><span style="color: #FF6D00; font-weight: 600;">' + usedModel + '</span>';
                responseArea.appendChild(modelBadge);
            }

            responseArea.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            transcriptSection.classList.add('compact');
            responseSection.classList.add('expanded');
            responseArea.scrollTop = 0;

            // === Capture to Conversation So Far ===
            const convoArea = document.getElementById('conversation-area');
            if (convoArea) {
                const pairDiv = document.createElement('div');
                pairDiv.style.cssText = 'border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; padding: 8px; background: rgba(255,255,255,0.02);';
                pairDiv.dataset.cost = responseCost || 0;
                pairDiv.dataset.responseTime = ttft || 0;

                // Input (transcript/question)
                const inputText = transcript || '(screenshot analysis)';
                const qDiv = document.createElement('div');
                qDiv.style.cssText = 'color: #bbb; font-size: 11px; line-height: 1.4; margin-bottom: 6px; padding: 4px 8px; border-left: 2px solid #666; border-radius: 2px;';
                qDiv.innerHTML = '<strong style="color: rgba(255,255,255,0.4); font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Input</strong><br>' + inputText.substring(0, 200) + (inputText.length > 200 ? '...' : '');
                pairDiv.appendChild(qDiv);

                // AI response (truncated for readability)
                const cleanResponse = fullResponse.replace(/\n{3,}/g, '\n').replace(/\[Model Used:.*\]/, '').trim();
                const rDiv = document.createElement('div');
                rDiv.style.cssText = 'color: #ddd; font-size: 11px; line-height: 1.4; padding: 4px 8px; border-left: 2px solid rgba(100,255,150,0.4); border-radius: 2px; max-height: 80px; overflow-y: auto;';
                // Build AI label with model and response time
                let aiLabel = 'AI';
                if (usedModel) aiLabel += ' (' + usedModel + ')';
                if (ttft) aiLabel += ' (' + ttft.toFixed(1) + 's)';
                rDiv.innerHTML = '<strong style="color: rgba(100,255,150,0.4); font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">' + aiLabel + '</strong><br>' + cleanResponse.substring(0, 300) + (cleanResponse.length > 300 ? '...' : '');
                pairDiv.appendChild(rDiv);

                convoArea.appendChild(pairDiv);
                convoArea.scrollTop = convoArea.scrollHeight;
            }

            if (capturedScreenshot) {
                capturedScreenshot = null;
                btnScreen.style.backgroundColor = '#444';
            }

            btnGenerate.classList.remove('active');
        } catch (e) {
            console.error('AI Generation Error:', e);
            responseArea.innerText = `Error: ${e.message}\n\nCheck if backend is running on port 5050.`;
            btnGenerate.classList.remove('active');
        }
    };



    // Scroll helper for global shortcuts
    window.scrollAIOutput = (direction) => {
        const el = document.getElementById('response-area');
        if (el) {
            el.scrollTop += (direction * 50); // increased scroll speed
        }
    };

    console.log('[STREAM] Streaming AI initialized successfully!');
}

// Initialize after DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeStreamingAI, 100);
    });
} else {
    setTimeout(initializeStreamingAI, 100);
}
