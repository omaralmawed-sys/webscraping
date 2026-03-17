# Recruiting Tools Chrome Extension

## Overview

Recruiting Tools is a Chrome extension designed to streamline the recruitment process by scraping and processing candidate data from LinkedIn and XING. It integrates with an external API (n8n workflow) to generate personalized outreach messages and perform job matching analysis.

## Features

* **Multi-Platform Support:** Works on both LinkedIn and XING.
* **Profile Scraping:** Extracts detailed candidate information including experience, education, skills, and languages.
* **AI-Powered Message Generation:** Generates personalized recruitment messages based on candidate profiles and job descriptions.
* **Job Matching Analysis:** Analyzes candidate fit for specific job IDs, providing pros, cons, and a recommendation score.
* **Kontakt/Kandidat Creation Flow:** Create contacts and candidates directly in Vincere from the popup.
* **Duplicate Check Before Save:** Checks existing records in n8n/Vincere before saving, with a user-confirmed override.
* **Resume Upload for Kandidat:** Upload `.pdf`, `.docx`, or `.doc` files and send them together with scraped profile data.
* **Live Progress + Better Request Handling:** Shows progress while saving candidates and supports long-running n8n requests with improved timeout/error handling.
* **Background Processing:** Scrapes LinkedIn profiles in a background tab to ensure stability and data completeness.
* **Platform Detection:** Automatically detects the current platform (LinkedIn or XING) and adjusts styling and scraping logic.
* **Platform Mode Notification:** Shows a short in-popup notification when platform mode changes (LinkedIn/XING/Unknown).
* **Cooldown System:** Prevents API abuse with a built-in cooldown timer for actions.
* **Recruiter Name Guard:** Requires and stores recruiter name before enabling core actions.

## What's New (Recent Updates)

* Added dedicated menu sections for **Kandidat anlegen** and **Kontakt anlegen**.
* Added LinkedIn candidate/contact prefill (name, job title, profile image, profile URL).
* Added duplicate-check workflow (`check_kandidaten` / `check_kontakten`) before save.
* Added create workflow (`save_kandidaten` / `save_kontakten`) including optional force-save on duplicates.
* Added upload UI with file remove/reset and loading states for candidate creation.
* Added platform switch notification and UI polish updates in popup styling.
* Added robust n8n response handling for empty responses and non-JSON payloads.

## Documentation

For detailed technical documentation, please refer to:

*   [**Project Documentation**](DOCUMENTATION.md): Comprehensive guide to the architecture, data flow, and key workflows.
*   [**Modules Documentation**](modules/README.md): Detailed description of the core logic modules in the `modules/` directory.

## Installation

1.  Clone this repository or download the source code.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the directory containing the extension files (`webscraping` folder).

## Usage

1.  **Navigate to a Profile:** Go to a candidate's profile page on LinkedIn or XING.
2.  **Open Extension:** Click the Recruiting Tools icon in the Chrome toolbar.
3.  **Generate Message:**
    * Enter a Job ID (optional) and a prompt.
    * Select tonality and length.
    * Click **"Nachricht erstellen"**.
4.  **Job Matching:**
    * Navigate to the "Job Matching" view.
    * Enter a Job ID.
    * Click **"Job Matching abrufen"**.
5.  **Recreate Message:** Use the "Nachricht anpassen" feature to refine the generated message.
6.  **Kontakt anlegen:**
    * Open "Kontakt anlegen".
    * Let the extension scrape and prefill profile data.
    * Confirm duplicate check result and click **"Kontakt in Vincere anlegen"**.
7.  **Kandidat anlegen:**
    * Open "Kandidat anlegen".
    * Wait for duplicate check.
    * Upload CV (`.pdf`, `.docx`, `.doc`) and click **"Kandidat anlegen"**.

## File Structure

* `manifest.json`: Configuration file for the Chrome extension.
* `popup.html`: The user interface for the extension popup.
* `popup.js`: Logic for the popup UI, handling user interactions and API communication.
* `background.js`: Service worker handling background tasks.
* `modules/`: Directory containing core logic modules (see [Modules Documentation](modules/README.md)).

## Permissions

The extension requires the following permissions:
* `activeTab`: To access the current tab's URL and content.
* `scripting`: To inject content scripts dynamically.
* `storage`: To save recruiter settings and cached profile data.
* `tabs`: To manage tabs for background scraping.
* `sidePanel`: To open the extension in the side panel.

## Troubleshooting

* **"Ordner wird verwendet" Error:** Ensure no other processes (VS Code, terminals) are locking the project folder.
* **Scraping Fails:** Refresh the page and try again. Ensure you are on a valid candidate profile page.
* **API Errors:** Check your internet connection and the status of the n8n webhook.

## Development & Tools

### Testing
A simple unit testing suite is available to verify core logic:
1.  Run `node test.mjs` in the root directory.
2.  This verifies utility functions like `getNameParts` and `escapeHtml`.

### Dev Booster Command
The project now supports the `/dev-booster` command via Gemini CLI. This command coordinates a comprehensive audit:
* **Code Quality Audit:** Scans for anti-patterns and missing documentation.
* **Code Simplification:** Suggests refactors for complex logic.
* **UI/UX Audit:** Checks for accessibility (ARIA labels) and responsiveness.
* **Testing:** Runs unit tests for core modules.
* **Documentation:** Ensures JSDoc coverage for all exported functions.

To use it, run `/dev-booster` in your Gemini CLI session.

## License

[ MIT ]
