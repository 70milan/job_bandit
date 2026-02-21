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
- **User Story 5.10:** As a user, I want the "Model Used" indicator to look like a clean footprint signature fixed to the bottom-right of the AI response to track the model used inconspicuously.
- **User Story 5.11:** As a user, I want the "Cumulative API Cost" label in the past sessions modal to retain the word "Cumulative" while matching the minimalist aesthetic of the main app, using muted soft colors instead of bright yellow.
- **User Story 1.2:** As a user, I want the response times for GPT-5 and higher reasoning models to be optimized for interview flow. *(Updated stream pipeline to calculate and display both Time-to-First-Token (TTFT) and Total Response Time in the UI footprint and conversation history)*

## Pending

- **User Story 1.3:** As a user, I want to verify that when using screenshot capabilities, the system accurately logs the model and response time.
- **User Story 2.2:** As a user, I want the ability to customize my "Target Role" so the AI doesn't assume I am always a "Data Engineer".
