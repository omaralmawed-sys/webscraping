# Recruiting Tools Chrome Extension - Gemini CLI Guidelines

This project is a Chrome extension for scraping recruitment data from LinkedIn and XING and integrating it with external APIs (n8n/Vincere).

## Documentation & Context
For more detailed information, refer to these existing documents:
- **[README.md](README.md):** General project overview, features, and installation instructions.
- **[DOCUMENTATION.md](DOCUMENTATION.md):** Comprehensive technical guide to architecture, data flow, and core workflows.
- **[modules/README.md](modules/README.md):** Detailed descriptions of the core logic modules in the `modules/` directory.

## Core Mandates
- **Manifest V3:** Adhere strictly to Chrome Extension Manifest V3 standards.
- **Modularization:** Maintain the modular structure in `modules/`. Logic should be encapsulated in the appropriate module (api, state, storage, ui, utils, etc.).
- **Security:** Do not log or expose API keys. Use `chrome.storage.local` for persistent user data (like recruiter name).
- **Messaging:** Follow the established messaging pattern between popup, background scripts, and content scripts.
- **Platform Handling:** Always check for the active platform (LinkedIn vs. XING) before executing platform-specific logic.

## Project Structure & Architecture
- `popup.js`: Main entry point for UI logic.
- `background.js`: Service worker for background tasks and cross-tab communication.
- `content-linkedin.js` & `content-xing.js`: Platform-specific scrapers.
- `modules/`: Modular core logic.
    - `api.js`: Handles all external API requests (n8n/Vincere).
    - `config.js`: Configuration constants.
    - `scraper.js`: Orchestrates script injection and messaging.
    - `state.js`: Manages runtime application state.
    - `storage.js`: Wraps Chrome storage APIs.
    - `ui.js`: DOM manipulation and UI updates.
    - `utils.js`: Shared utility functions.

## Coding Conventions
- **Naming:** Use camelCase for variables and functions.
- **Asynchronous Code:** Prefer `async/await` over raw Promises.
- **Error Handling:** Always wrap API calls and DOM scraping in `try/catch` blocks. Provide user feedback via the UI for common errors.
- **Styling:** Maintain consistency with `style.css`. Use CSS classes for state transitions (e.g., `hidden`, `loading`).

## Common Workflows for Gemini
- **Adding a Scraper:** Update `content-linkedin.js` or `content-xing.js` and ensure data is correctly mapped in `scraper.js`.
- **New API Integration:** Add a new method to `modules/api.js`.
- **UI Update:** Modify `popup.html` and update `modules/ui.js` for dynamic interactions.
