# Project Roadmap & User Stories

## Completed

- **User Story 4.1:** As a developer, I want all personal info (resumes/profiles) completely scrubbed and ignored from the Git history for security. *(Scrubbed personal info and build artifacts from all branches. Updated README with developer setup instructions.)*
- **User Story 4.3:** As a developer, I want to completely expunge all legacy hardcoded license keys from `backend/main.py` locally AND from all git history/branches to prevent forensic retrieval.
- **User Story 4.2:** As a business owner, I want an offline, hardware-locked licensing system where users send me a Request Code and I generate a License Key, eliminating the need for a central server.
- **User Story 3.1:** As a user, I want a modern UI with premium aesthetics, smooth transitions, and tactile "clickable" feedback on all controls.
- **User Story 2.1:** As a user, I want to create new sessions without errors and open past sessions to continue exactly where I left off.
- **User Story 2.3:** As a user, when I open a "Past Session", I want to load the *existing* conversation history to review or continue it, rather than creating a new cloned session.
- **User Story 1.1:** As a user, I want my default model choice (GPT-4o) to be reliably remembered by the application.
- **User Story 5.1:** As a user, I want code blocks (fenced and inline) in AI responses to be properly formatted and syntax-highlighted in both the main response area and the conversation history modals.
- **User Story 5.2:** As a user, I want date/time separator headers in the conversation tab and session history, so I can tell when each exchange happened—especially when reviewing sessions that span multiple days/times.
- **User Story 5.3:** As a user, I want a [Copy] button on each input/output pair in the conversation tab and session history modal, so I can copy individual exchanges to my clipboard.
- **User Story 5.4:** As a user, I want timestamps in the Past Sessions list to be formatted in a readable MM/DD/YYYY HH:MM format.
- **User Story 5.5:** As a user, I want the session history modal (past sessions preview) to have the same UI improvements as the live convo tab—code formatting, copy buttons, and date/time markers.
- **User Story 5.6:** As a user, I want GPT-5 and higher reasoning models' code blocks to format correctly, not just GPT-4 models. *(Fixed regex to handle GPT-5 formatting variations.)*
- **User Story 5.7:** As a user, I want date separators in convo/history to show date-only (MM/DD/YYYY) in the same white color as session names, with the time (HH:MM) shown inline next to each Input/Output label instead.
- **User Story 5.8:** As a user, I want the "Model Used" badge in the AI response area to be right-aligned in the footer for a cleaner layout.
- **User Story 5.9:** As a user, I want markdown formatting like bold text to be correctly parsed in the UI so code block language labels are clean.
- **User Story 1.4:** As a user, I want unsupported models like ChatGPT-5 to be removed from the options to avoid connection errors.
- **User Story 2.4:** As a user, I want the session status indicator to proactively test the connection, turning green immediately when connected and red if the backend is unreachable.
- **User Story 5.10:** As a user, I want the "Model Used" indicator to look like a clean footprint signature fixed to the bottom-right of the AI response to track the model used inconspicuously. *(Fixed absolute positioning bug where the footer would overlap with long AI responses by moving it to an inline block with frosted styling)*
- **User Story 5.11:** As a user, I want the "Cumulative API Cost" label in the past sessions modal to retain the word "Cumulative" while matching the minimalist aesthetic of the main app, using muted soft colors instead of bright yellow.
- **User Story 5.12:** As a user, I want a minimalist export button in the conversation history modal to download the entire chat log to a user-specified, elegantly formatted markdown (`.md`) file without emojis.
- **User Story 5.13:** As a user, I want a dedicated "Copy" button specifically fixed to the top right of every code block within the AI response area to easily extract generated code.
- **User Story 1.2:** As a user, I want the response times for GPT-5 and higher reasoning models to be optimized for interview flow. *(Updated stream pipeline to calculate and display both Time-to-First-Token (TTFT) and Total Response Time in the UI footprint and conversation history, formatted securely as `(1.8s START / 1.9s TOTAL)`)*
- **User Story 1.3:** As a user, I want the session state to fully reset when my 2-hour or 5-minute timer expires so that I securely land on a fresh Start Menu instead of mistakenly continuing an expired session state.
- **User Story 5.14:** As a user, I want the TTFT and Total Time metrics to persist between responses instead of flashing to `--s` immediately, and the live transcript field to auto-clear once an AI response is fully generated.
- **User Story 5.15:** As a user, I want all utility buttons (`[copy]` and `[clear]`) to share a unified, sleek monospace aesthetic that turns green or white upon clicking before fading back.
- **User Story 1.5:** As a user, I want ChatGPT Nano to consistently wrap all generated code inside standard Markdown codeblocks instead of returning unformatted plaintext blocks.
- **User Story 1.6:** As a user, I want the resume detach 'x' button to be properly hidden when a session ends so that the UI resets cleanly.

## Pending

- **User Story 1.3:** As a user, I want to verify that when using screenshot capabilities, the system accurately logs the model and response time.
- **User Story 2.2:** As a user, I want the ability to customize my "Target Role" so the AI doesn't assume I am always a "Data Engineer".
- **User Story 1.7:** As a user, I want an input field during session creation to specify a default language (e.g., Python, SQL, Java) so that AI-generated code consistently uses my preferred language if the input doesnt specify the language to write code in.
