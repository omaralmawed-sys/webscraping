// background.js - ROBUST VERSION

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === "SCRAPE_IN_BACKGROUND") {
        console.log("🔥 Background Job gestartet für:", request.url);
        
        const targetUrl = request.url;

        // 1. Tab im Hintergrund öffnen (active: false ist wichtig)
        chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
            const tabId = tab.id;

            // 2. Warten, bis der Tab "complete" geladen ist
            chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    
                    // Listener entfernen (wichtig!)
                    chrome.tabs.onUpdated.removeListener(listener);
                    console.log("✅ Tab geladen (ID: " + tabId + "). Warte auf DOM...");

                    // 3. Sicherheits-Wartezeit (4 Sekunden), damit LinkedIn das HTML rendert
                    setTimeout(() => {
                        
                        // 4. Skript AKTIV injizieren (Das ist der Fix!)
                        // Wir verlassen uns nicht darauf, dass es schon da ist.
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['content-linkedin.js']
                        }, () => {
                            
                            if (chrome.runtime.lastError) {
                                console.error("❌ Injection Fehler:", chrome.runtime.lastError.message);
                                sendResponse({ status: "error", message: "Injection failed" });
                                return;
                            }

                            console.log("💉 Skript injiziert. Sende Scrape-Befehl...");

                            // 5. Nachricht senden
                            chrome.tabs.sendMessage(tabId, { action: "SCRAPE_LINKEDIN" }, (response) => {
                                if (chrome.runtime.lastError) {
                                    console.error("❌ Kommunikations-Fehler:", chrome.runtime.lastError.message);
                                    // Tab schließen bei Fehler
                                    chrome.tabs.remove(tabId);
                                    return;
                                }

                                if (response && response.status === "success") {
                                    console.log("🎉 Daten erhalten!", response.data);
                                    
                                    // Tab schließen
                                    chrome.tabs.remove(tabId);

                                    // Daten an Popup zurücksenden (dafür ist das return true unten wichtig)
                                    sendResponse({ status: "success", data: response.data });
                                }
                            });
                        });

                    }, 4000); // 4 Sekunden warten
                }
            });
        });

        // WICHTIG: return true signalisiert Chrome, dass sendResponse asynchron (später) aufgerufen wird
        return true; 
    }
});