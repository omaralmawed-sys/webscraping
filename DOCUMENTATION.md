# Technical Documentation

## Architecture Overview

The Recruiting Tools Chrome Extension is built using the Manifest V3 standard. It consists of the following key components:

1.  **Popup (UI):** The main interface (`popup.html`, `popup.js`, and `modules/*.js`) where users interact with the tool. It handles user input, displays data, and manages the application state.
2.  **Background Service Worker (`background.js`):** Handles background tasks, primarily facilitating robust scraping for LinkedIn by managing tab creation and communication to avoid context invalidation.
3.  **Content Scripts (`content-xing.js`, `content-linkedin.js`):** Scripts injected into web pages to extract data.
    *   `content-xing.js`: Direct scraping from the active XING tab.
    *   `content-linkedin.js`: Scrapes LinkedIn profiles, often injected into a background tab.
    *   `kandidaten-anlegen.js`: Specialized scraper for the "Create Candidate" workflow.
4.  **Modules:** A modularized codebase in the `modules/` directory handling API calls, state, storage, and UI logic.

## Project Structure

```
.
├── manifest.json            # Extension configuration
├── popup.html               # Main UI structure
├── popup.js                 # Entry point for UI logic
├── background.js            # Service worker
├── content-linkedin.js      # LinkedIn scraper
├── content-xing.js          # XING scraper
├── kandidaten-anlegen.js    # Specialized scraper
├── style.css                # Styling
├── modules/                 # Core logic modules
│   ├── api.js               # API communication
│   ├── config.js            # Configuration constants
│   ├── scraper.js           # Injection & messaging logic
│   ├── state.js             # Runtime state management
│   ├── storage.js           # Chrome storage wrappers
│   ├── ui.js                # DOM manipulation
│   └── utils.js             # Helper functions
└── README.md                # General overview
```

## Core Workflows

### 1. Profile Scraping

The extension employs different strategies for XING and LinkedIn due to platform differences:

*   **XING:**
    *   The popup sends a message to the active tab.
    *   `content-xing.js` parses the DOM and returns profile data.
*   **LinkedIn:**
    *   The extension often opens the profile in a background tab to ensure a clean context.
    *   The background script injects `content-linkedin.js`.
    *   Data is passed back to the popup.

### 2. Message Generation & Job Matching

*   **Input:** User provides a Job ID (optional) and prompt/settings.
*   **Process:** The extension sends this data along with the scraped profile to an external n8n webhook via a Google Cloud Run proxy (`xingproxy`).
*   **Output:** The API returns a generated message or matching analysis, which is displayed in the UI.

### 3. Vincere Integration (Candidate/Contact Creation)

*   **Duplicate Check:** Before saving, the extension sends a payload to n8n to check if the candidate/contact already exists in Vincere.
*   **Creation:**
    *   **Contact:** Creates a new contact record in Vincere.
    *   **Candidate:** Creates a candidate record. Supports uploading a CV file (PDF/DOCX), which is sent as a multipart request.

## External Dependencies

*   **n8n:** The core backend logic and integration with Vincere are handled by n8n workflows.
*   **Google Cloud Run Proxy:** Acts as a middleware for certain API requests (e.g., XING proxy).

## Development Guidelines

*   **Modules:** All core logic should be placed in `modules/`. Avoid adding complex logic directly to `popup.js`.
*   **Async/Await:** Use modern async/await patterns for asynchronous operations (chrome.storage, fetch, messaging).
*   **Error Handling:** Ensure API calls and scraping operations have try/catch blocks and provide feedback to the user via the UI.
