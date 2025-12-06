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
            responseArea.innerText = '';
            let fullResponse = '';

            // Read stream
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.chunk) {
                                fullResponse += data.chunk;
                                responseArea.innerText = fullResponse;
                                responseArea.scrollTop = responseArea.scrollHeight;
                            }

                            if (data.done) {
                                console.log('[STREAM] Complete');
                                // Update API cost display with color gradient
                                if (data.usage && data.usage.total_cost !== undefined) {
                                    const apiCostEl = document.getElementById('api-cost');
                                    if (apiCostEl) {
                                        const cost = data.usage.total_cost;
                                        apiCostEl.innerText = '$' + cost.toFixed(4);
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
                            }
                        } catch (jsonError) {
                            // Ignore malformed JSON
                        }
                    }
                }
            }

            // Format complete response
            let formattedResponse = fullResponse;
            const codeBlocks = [];
            const inlineCodeBlocks = [];

            formattedResponse = formattedResponse.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
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

            responseArea.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            transcriptSection.classList.add('compact');
            responseSection.classList.add('expanded');
            responseArea.scrollTop = 0;

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
