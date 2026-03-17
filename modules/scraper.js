// ============================================================================
// SCRAPER LOGIC
// ============================================================================

async function sendMessageOrInject(tabId, scriptFile, message) {
    try {
        return await sendMessageToTab(tabId, message);
    } catch (error) {
        console.log(`Script ${scriptFile} antwortet nicht. Injiziere...`, error);
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: [scriptFile]
            });
            // Kurze Wartezeit für Initialisierung
            await new Promise(r => setTimeout(r, 200));
            return await sendMessageToTab(tabId, message);
        } catch (injectError) {
            console.error("Injektion fehlgeschlagen:", injectError);
            throw new Error("Fehler beim Lesen der Seite. Bitte Seite neu laden (F5).");
        }
    }
}

function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                // Das ist der Fall, wenn kein Listener existiert
                reject(chrome.runtime.lastError);
                return;
            }
            if (!response) {
                reject(new Error("Keine Antwort erhalten (Response leer)."));
                return;
            }
            if (response.status === "error") {
                reject(new Error(response.message || "Unbekannter Fehler im Content-Script"));
                return;
            }
            resolve(response);
        });
    });
}

export async function scrapeXing(tabId) {
    return sendMessageOrInject(tabId, 'content-xing.js', { action: "scrape" });
}

export async function scrapeLinkedInMessage(tabId) {
    return sendMessageOrInject(tabId, 'content-linkedin.js', { action: "SCRAPE_LINKEDIN" });
}

export async function scrapeLinkedInProfile(tabId) {
    return sendMessageOrInject(tabId, 'kandidaten-anlegen.js', { action: "SCRAPE_CANDIDATE" });
}

/**
 * Allgemeine Scrape-Funktion, die basierend auf URL und Zweck entscheidet.
 * @param {string} purpose 'message' (Generator/Matching) oder 'profile' (Kandidat/Kontakt)
 */
export async function scrapeCurrentTab(purpose = 'message') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) throw new Error("Kein Tab gefunden.");
    
    const tab = tabs[0];
    const url = (tab.url || "").toLowerCase();
    
    let data = null;
    let source = "";

    if (url.includes("xing.com")) {
        // Xing nutzt immer dasselbe Script
        data = await scrapeXing(tab.id);
        source = "xing";
    } else if (url.includes("linkedin.com")) {
        if (purpose === 'message') {
            data = await scrapeLinkedInMessage(tab.id);
        } else {
            data = await scrapeLinkedInProfile(tab.id);
        }
        source = "linkedin";
    } else {
        throw new Error("Bitte öffne ein Xing oder LinkedIn Profil.");
    }

    return { data: data.data, source, url: tab.url };
}
