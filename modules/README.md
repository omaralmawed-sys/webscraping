# Modules Documentation

This directory contains the core logic of the Recruiting Tools extension, separated into specialized modules to improve maintainability and readability.

## Module Descriptions

### `api.js`
Handles all external API communication.
*   **Purpose:** Sends data to n8n workflows and Google Cloud Run proxies.
*   **Key Functions:**
    *   `sendJobMatchingRequest(payload)`: Sends scraped data for job matching analysis.
    *   `sendPayloadToN8n(payload)`: Generic payload sender for various workflows.
    *   `checkDuplicate(payload, type)`: Checks if a candidate/contact already exists in Vincere.
    *   `createRecord(payload, type, file)`: Creates a new record in Vincere, optionally with a file upload.

### `config.js`
Central configuration file.
*   **Purpose:** Stores constants used throughout the application.
*   **Contents:**
    *   `API_URL`: Main endpoint for message generation.
    *   `N8N_WEBHOOK_URL`: Endpoint for Vincere integration.
    *   `COOLDOWN_SECONDS`: Timer duration for preventing API abuse.
    *   `platformConfig`: Styling and naming configurations for LinkedIn and XING.

### `scraper.js`
Manages the scraping process.
*   **Purpose:** Handles the injection of content scripts and communication with tabs.
*   **Key Functions:**
    *   `injectContentScript(tabId, file)`: Injects a JavaScript file into a specific tab.
    *   `sendMessageToTab(tabId, message)`: Sends a message to a tab and awaits a response.
    *   `sendMessageOrInject(tabId, scriptFile, message)`: Attempts to send a message; if it fails (script not ready), injects the script and retries.

### `state.js`
Global state management.
*   **Purpose:** Holds the runtime state of the extension popup.
*   **Contents:**
    *   `state`: Object containing `cachedProfileData`, `isRequestRunning`, `currentContactPayload`, etc.
    *   `setCachedProfileData(data)`: Updates the cached profile.
    *   `setIsRequestRunning(isRunning)`: Toggles the loading state.

### `storage.js`
Persistence layer.
*   **Purpose:** Wrappers around `chrome.storage.local` for saving and retrieving user settings.
*   **Key Functions:**
    *   `getRecruiterData()`: Retrieves the stored recruiter name and email.
    *   `saveRecruiterData(name, email)`: Saves the recruiter's details.

### `ui.js`
User Interface logic.
*   **Purpose:** Handles DOM manipulation, view switching, and UI updates.
*   **Key Functions:**
    *   `switchView(viewName)`: Toggles between different views (Generator, Settings, Job Matching, etc.).
    *   `updateStatus(message, type)`: Displays success/error notifications.
    *   `showLoading(isLoading)`: Toggles loading spinners and button states.

### `utils.js`
General utility functions.
*   **Purpose:** Helper functions used across multiple modules.
*   **Key Functions:**
    *   `escapeHtml(string)`: Sanitizes strings to prevent XSS.
    *   `getNameParts(fullName)`: Splits a full name string into first and last names.
