# Recruiting Tools Chrome Extension

## Overview

Recruiting Tools is a Chrome extension designed to streamline the recruitment process by scraping and processing candidate data from LinkedIn and XING. It integrates with an external API (n8n workflow) to generate personalized outreach messages and perform job matching analysis.

## Features

* **Multi-Platform Support:** Works on both LinkedIn and XING.
* **Profile Scraping:** Extracts detailed candidate information including experience, education, skills, and languages.
* **AI-Powered Message Generation:** Generates personalized recruitment messages based on candidate profiles and job descriptions.
* **Job Matching Analysis:** Analyzes candidate fit for specific job IDs, providing pros, cons, and a recommendation score.
* **Background Processing:** Scrapes LinkedIn profiles in a background tab to ensure stability and data completeness.
* **Platform Detection:** Automatically detects the current platform (LinkedIn or XING) and adjusts styling and scraping logic.
* **Cooldown System:** Prevents API abuse with a built-in cooldown timer for actions.

## Installation

1.  Clone this repository or download the source code.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the directory containing the extension files (`webscraping` folder).

## File Structure

* `manifest.json`: Configuration file for the Chrome extension.
* `popup.html`: The user interface for the extension popup.
* `popup.js`: Logic for the popup UI, handling user interactions and API communication.
* `background.js`: Service worker handling background tasks, specifically for reliable LinkedIn scraping.
* `content-linkedin.js`: Content script for scraping data from LinkedIn profiles.
* `content-xing.js`: Content script for scraping data from XING profiles.
* `style.css`: Styles for the popup interface.
* `icon1.png`: Extension icon.

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

## Technical Details

### Scraping Logic
* **XING:** Scrapes data directly from the active tab using `content-xing.js`.
* **LinkedIn:** Uses a robust background scraping method. The extension opens the profile in a background tab, injects `content-linkedin.js`, and retrieves the data to avoid context invalidation issues.

### API Integration
The extension communicates with an n8n webhook (`https://xingproxy-842321698577.europe-west1.run.app/xing`) to process the scraped data and generate responses using AI.

## Permissions

The extension requires the following permissions:
* `activeTab`: To access the current tab's URL and content.
* `scripting`: To inject content scripts dynamically.
* `storage`: To save recruiter settings and cached profile data.
* `tabs`: To manage tabs for background scraping.
* `sidePanel`: To open the extension in the side panel (configured in manifest).

## Troubleshooting

* **"Ordner wird verwendet" Error:** Ensure no other processes (VS Code, terminals) are locking the project folder.
* **Scraping Fails:** Refresh the page and try again. Ensure you are on a valid candidate profile page.
* **API Errors:** Check your internet connection and the status of the n8n webhook.

## License

[Your License Here]
