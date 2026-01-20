// ============================================================================
// TEIL 1: NEUE FUNKTIONEN (Plattform-Erkennung & Styles)
// ============================================================================

const platformConfig = {
    linkedin: { class: 'platform-linkedin', color: '#0A66C2', name: 'LinkedIn' },
    xing: { class: 'platform-xing', color: '#026466', name: 'XING' },
    unknown: { class: 'platform-unknown', color: '#6c757d', name: 'Unbekannt' } // Grau für unbekannte Seiten
};

/**
 * Holt die Recruiter-Daten aus dem Storage und gibt ein Promise zurück.
 */
function getRecruiterData() {
    return new Promise((resolve, reject) => {
        // Zugriff auf chrome.storage.local
        chrome.storage.local.get(['cachedRecruiter'], (result) => {
            
            // Falls ein technischer Fehler auftritt
            if (chrome.runtime.lastError) {
                console.error("Storage Error:", chrome.runtime.lastError);
                resolve({ rName: "", rEmail: "" });
                return;
            }

            // Deine Logik zur Datenaufbereitung
            const recruiterData = result.cachedRecruiter || {};
            const rName = recruiterData?.name || "";
            const rEmail = recruiterData?.email || "";

            // Promise erfolgreich auflösen und Daten zurückgeben
            resolve({ rName, rEmail });
        });
    });
}

let lastDetectedPlatform = null;

async function applyPlatformStyles() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) return;

        const tab = tabs[0];
        const url = (tab.url || "").toLowerCase();

        let currentPlatform = 'unknown'; // Standardmäßig auf Unbekannt setzen

        if (url.includes('linkedin.com')) {
            currentPlatform = 'linkedin';
        } else if (url.includes('xing.com')) {
            currentPlatform = 'xing';
        }

        // Styles auf den Body anwenden
        const body = document.body;
        if (body) {
            body.classList.remove('platform-xing', 'platform-linkedin', 'platform-unknown');
            const config = platformConfig[currentPlatform];
            
            body.classList.add(config.class);
            body.style.setProperty('--platform-color', config.color);

            // Benachrichtigung nur anzeigen, wenn sich die Plattform geändert hat
            if (lastDetectedPlatform !== currentPlatform && currentPlatform !== 'unknown') {
                animatePlatformSwitch(config.name, config.color);
                lastDetectedPlatform = currentPlatform;
            }
        }

    } catch (e) {
        console.error("Style-Fehler:", e);
    }
}

function animatePlatformSwitch(platformName, color) {
    // Alte Notification entfernen, falls vorhanden
    const oldNote = document.querySelector('.platform-notification');
    if (oldNote) oldNote.remove();

    const notification = document.createElement('div');
    notification.className = 'platform-notification';
    notification.innerHTML = `
        <div class="platform-badge" style="background: ${color}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            ${platformName} Modus aktiv
        </div>
    `;
    
    // Sicherstellen, dass body existiert
    if(document.body) {
        document.body.appendChild(notification);
        
        // Animation starten
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Nach 3 Sekunden entfernen
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
}

// Initialisierung der Styles (sofort und bei Tab-Wechsel)
applyPlatformStyles();

if (chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(applyPlatformStyles);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === 'complete') applyPlatformStyles();
    });
}


// ============================================================================
// TEIL 2: HAUPTLOGIK (Dein bestehender Code)
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {

    // Styles beim Laden des DOMs sicherheitshalber nochmal anwenden
    applyPlatformStyles();

    // --- KONFIGURATION ---
    const API_URL = "https://xingproxy-842321698577.europe-west1.run.app/xing"; 
    const COOLDOWN_SECONDS = 30;

    // --- GLOBALE VARIABLEN ---
    let cachedProfileData = null; 
    let isRequestRunning = false;
    let tabUrl;

    // ==========================================
    // 1. DOM ELEMENTE
    // ==========================================

    // Navigation
    const viewMenu = document.getElementById("view-menu");
    const viewGenerator = document.getElementById("view-generator");
    const viewJobMatching = document.getElementById("job-matching-container");

    const btnToGen = document.getElementById("nav-to-generator");
    const btnToMatch = document.getElementById("nav-to-job-matching");
    const btnBackMatch = document.getElementById("backFromJobMatching");
    const btnBackGen = document.getElementById("backFromNachrichtGenerator");

    // Generator Tool
    const scrapeBtn = document.getElementById("scrapeBtn");
    const recreateBtn = document.getElementById("recreateBtn");
    const recreateContainer = document.getElementById("recreateContainer");
    const userPromptInput = document.getElementById("userPrompt");
    const statusDiv = document.getElementById("statusMessage");
    const resultContainer = document.getElementById("resultContainer");
    const outputSubject = document.getElementById("outputSubject");
    const outputMessage = document.getElementById("outputMessage");
    const tonalitySelect = document.getElementById("tonalität");
    const lengthSelect = document.getElementById("msgLength");
    const jobIdInputMessage = document.getElementById("job_id_input_message");

    // Job Matching Tool
    const job_id_input = document.getElementById("job_id_input");
    const btnFetchJobMatchBtn = document.getElementById("fetchJobMatchBtn");
    const jobMatchResultContainer = document.getElementById("matchResult");
    const matchOutputText = document.getElementById("matchOutputText");

    // Copy Buttons
    const copySubjectBtn = document.getElementById("copySubject");
    const copyMessageBtn = document.getElementById("copyMessage");

    // NEU: Manual / Auto Toggle Elemente (falls im HTML vorhanden)
    const radioAuto = document.getElementById("source-auto");
    const radioManual = document.getElementById("source-manual");
    const manualInputContainer = document.getElementById("manual-input-container");
    const manualProfileData = document.getElementById("manualProfileData");

    // Initialisierung Cooldown checken
    checkCooldown();

    // ==========================================
    // 2. SCRAPING & INJECTION LOGIK
    // ==========================================

    async function scrapeData() {
        // 1. Aktiven Tab finden
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) throw new Error("Kein Tab gefunden.");
        
        const tab = tabs[0]; 
        tabUrl = tab.url || "";

        console.log("Aktive Tab URL:", tabUrl);

        if(tabUrl.includes("xing.com/xtm/profiles") || tabUrl.includes("xing.com/xtm/search/profiles")) {
            console.log("🟢 XING Seite erkannt.");
            return await handleXingScrape(tab.id); 
        }
        else if(tabUrl.includes("linkedin.com/in") || tabUrl.includes("https://www.linkedin.com/talent/hire")) {  
            console.log("🔵 LinkedIn Seite erkannt.");
            return  null; // await handleLinkedInScrape(tab.id); 
        }
        else {
            throw new Error("Bitte öffne ein XING oder LinkedIn Profil.");
        }
    }

    async function handleXingScrape(tabId) {
         try {
            return await sendMessageToTab(tabId, { action: "scrape" }); 
        } catch (error) {
            console.log("XING Script antwortet nicht. Injiziere...", error);
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content-xing.js']
                });
                await new Promise(r => setTimeout(r, 100));
                return await sendMessageToTab(tabId, { action: "scrape" });
            } catch (injectError) {
                throw new Error("Fehler beim Lesen. Bitte Seite (Xing) neu laden (F5) oder prüfen Sie, ob Sie auf der richtigen Seite sind.");
            }
        }
    }

    // async function handleLinkedInScrape(tabId) {
    //     try {
    //         return await sendMessageToTab(tabId, { action: "SCRAPE_LINKEDIN" }); 
    //     } catch (error) {
    //         console.log("LinkedIn Script antwortet nicht. Injiziere...", error);
    //         try {
    //             await chrome.scripting.executeScript({
    //                 target: { tabId: tabId },
    //                 files: ['content-linkedin.js']
    //             });
    //             await new Promise(r => setTimeout(r, 1000));
    //             return await sendMessageToTab(tabId, { action: "SCRAPE_LINKEDIN" });
    //         } catch (injectError) {
    //             throw new Error("Fehler beim Lesen. Bitte Seite (LinkedIn) neu laden (F5) oder prüfen Sie, ob Sie auf der richtigen Seite sind.");
    //         }
    //     }
    // }

    // Hilfsfunktion für sauberes Promise
    function sendMessageToTab(tabId, message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                if (!response) {
                    reject(new Error("Keine Antwort erhalten"));
                    return;
                }
                if (response.status === "error") {
                    reject(new Error(response.message || "Unbekannter Fehler"));
                    return;
                }
                // Erfolg
                resolve(response);
            });
        });
    }


    // ==========================================
    // 3. EVENT LISTENER (Die Buttons)
    // ==========================================
// --- A. Job Matching Button (HINTERGRUND VERSION) ---
    if (btnFetchJobMatchBtn) {
        btnFetchJobMatchBtn.addEventListener("click", async () => {
            const jobId = job_id_input ? job_id_input.value.trim() : "";

            // 1. Validierung
            if (!jobId) {
                showError("Bitte eine Job-ID eingeben.");
                markInputError(job_id_input);
                setTimeout(() => { clearError(); clearInputError(job_id_input); }, 4000);
                return;
            }
            if (!/^\d+$/.test(jobId)) {
                showError("Bitte eine gültige Job-ID (nur Zahlen) eingeben.");
                markInputError(job_id_input);
                setTimeout(() => { clearError(); clearInputError(job_id_input); }, 4000);
                return;
            }

             // URL holen
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tabs[0]?.url?.toLowerCase() || "";

            if(currentUrl.includes("xing.com/xtm/profiles") || currentUrl.includes("xing.com/xtm/search/profiles") ||
             currentUrl.includes("linkedin.com/in") || currentUrl.includes("https://www.linkedin.com/talent/hire")) 
             {


                startCooldown();


          
            // UI Reset
            statusDiv.innerText = "⏳ Starte Hintergrund-Scraping...";
            if(jobMatchResultContainer) jobMatchResultContainer.classList.add("hidden");
            if(matchOutputText) matchOutputText.innerHTML = "";
            const spinnerMatch = btnFetchJobMatchBtn.querySelector(".spinner");
            if(spinnerMatch) spinnerMatch.classList.remove("hidden");

            // 3. TRY BLOCK STARTET HIER (Wichtig!)
            try {
                 let response = null;

                if(currentUrl.includes("xing.com")) {
                    statusDiv.innerText = "🔍 Scrape XING..."
                     response = await scrapeData();
                }
                else{

                    statusDiv.innerText = "🔍 Scrape LinkedIn...";

                    // 2. SCRAPEN ÜBER BACKGROUND WORKER (NEU)
                // Wir senden eine Nachricht an background.js
                 response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ 
                        action: "SCRAPE_IN_BACKGROUND", 
                        url: currentUrl // Wir nutzen die URL des aktuellen Tabs
                    }, (res) => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else if (res && res.status === "error") reject(new Error(res.message));
                        else resolve(res);
                    });
                });

                }
                console.log("Gescapte Daten für Job Matching:", response.data);
                
                // 3b. Payload bauen
                const payload = {
                    mode: "job_matching",
                    job_id: jobId,
                    text: response.data,
                    timestamp: new Date().toISOString()
                };

                // Source bestimmen (wir nutzen currentUrl)
                if(currentUrl.includes("linkedin.com")) {
                    payload.source = "linkedin";
                } else {
                    payload.source = "xing";
                }
                
                // 3c. Senden
                sendJobMatchingRequest(payload, "🔍 Analysiere Matching...");

            } catch (err) {
                // Fehlerbehandlung
                showError(err.message);
                if(spinnerMatch) spinnerMatch.classList.add("hidden");
            }

             }
             else {
                showError("Bitte öffne ein XING oder LinkedIn Profil.");
                setTimeout(() => { clearError(); }, 4000);
             }



            
            
        });
    }

    function clearError() {
        if(statusDiv) statusDiv.innerHTML = "";
    }


    // // --- B. Nachricht Erstellen Button ---
    // if (scrapeBtn) {
    //     scrapeBtn.addEventListener("click", async () => {

    //         const jobId = jobIdInputMessage ? jobIdInputMessage.value.trim() : "";

    //         // Validierung Job-ID
    //         if (jobId && !/^\d+$/.test(jobId)) {
    //             showError("Bitte gültige Job-ID (nur Zahlen) eingeben.");
    //             markInputError(jobIdInputMessage);
    //             setTimeout(() => {
    //                 clearError();
    //                 clearInputError(jobIdInputMessage);
    //             }, 4000);
    //             return; 
    //         }

    //         startCooldown();

    //         // ---------------------------------------------------------
    //         // URL PRÜFEN FÜR KORREKTEN TEXT (Status Update)
    //         // ---------------------------------------------------------
    //         const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    //         const currentUrl = tabs[0]?.url?.toLowerCase() || "";
            
    //         // UI Vorbereitung
    //         if (currentUrl.includes("xing.com")) {
    //             statusDiv.innerText = "🔍 Scrape XING...";
    //         } else if (currentUrl.includes("linkedin.com")) {
    //             statusDiv.innerText = "🔍 Scrape LinkedIn...";
    //         } else {
    //             statusDiv.innerText = "🔍 Lese Profil..."; // Fallback
    //         }
    //         // ---------------------------------------------------------

    //         resultContainer.classList.add("hidden");
    //         if (recreateContainer) recreateContainer.classList.add("hidden");
    //         const spinnerScrape = scrapeBtn.querySelector(".spinner");
    //         if (spinnerScrape) spinnerScrape.classList.remove("hidden");

    //         try {
    //             let finalProfileData;

    //             // 1. Recruiter Daten laden (Funktion steht jetzt ganz oben)
    //             const { rName, rEmail } = await getRecruiterData();
    //             console.log("Geladener Recruiter:", rName, rEmail);

    //             // 2. Scrapen
    //             const response = await scrapeData();
                
    //             finalProfileData = response.data;
    //             cachedProfileData = response.data; // Speichern

    //             console.log("Finale Profildaten für Erstellung:", finalProfileData);

    //             // 3. Payload erstellen
    //             const payload = {
    //                 mode: jobId ? "create_with_jobid" : "create",
    //                 text: finalProfileData,
    //                 prompt: userPromptInput.value.trim(),
    //                 tonality: tonalitySelect.value,
    //                 length: lengthSelect.value,
    //                 timestamp: new Date().toISOString(),
    //                 name: rName,
    //                 email: rEmail
    //             };
                
    //             if (jobId) payload.job_id = jobId;

    //             // Source setzen
    //             if (currentUrl.includes("linkedin.com")) {
    //                 payload.source = "linkedin";
    //             } else {
    //                 payload.source = "xing";
    //             }

    //             sendPayloadToN8n(payload, "✍️ Erstelle Nachricht...");

    //         } catch (err) {
    //             showError(err.message);
    //             if (spinnerScrape) spinnerScrape.classList.add("hidden");
    //         }
    //     });
    // }

    // --- B. Nachricht Erstellen Button (HINTERGRUND VERSION) ---
    if (scrapeBtn) {
        scrapeBtn.addEventListener("click", async () => {

            // URL holen
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tabs[0]?.url?.toLowerCase() || "";

            if(currentUrl.includes("xing.com/xtm/profiles") || currentUrl.includes("xing.com/xtm/search/profiles") ||
             currentUrl.includes("linkedin.com/in") || currentUrl.includes("https://www.linkedin.com/talent/hire")) 
             {
                
            const jobId = jobIdInputMessage ? jobIdInputMessage.value.trim() : "";

            // Validierung Job-ID
            if (jobId && !/^\d+$/.test(jobId)) {
                showError("Bitte gültige Job-ID (nur Zahlen) eingeben.");
                return; 
            }

            startCooldown();

           
            
            // statusDiv.innerText = "⏳ Starte Hintergrund-Scraping...";
            
            resultContainer.classList.add("hidden");
            if (recreateContainer) recreateContainer.classList.add("hidden");
            const spinnerScrape = scrapeBtn.querySelector(".spinner");
            if (spinnerScrape) spinnerScrape.classList.remove("hidden");

            

            try {
                // 1. Recruiter Daten laden
                const { rName, rEmail } = await getRecruiterData();

                let response = null;

                if(currentUrl.includes("xing.com")) {
                    statusDiv.innerText = "🔍 Scrape XING..."
                     response = await scrapeData();
                }
                else{

                    statusDiv.innerText = "🔍 Scrape LinkedIn...";

                    // 2. SCRAPEN ÜBER BACKGROUND WORKER (NEU)
                // Wir senden eine Nachricht an background.js
                 response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ 
                        action: "SCRAPE_IN_BACKGROUND", 
                        url: currentUrl // Wir nutzen die URL des aktuellen Tabs
                    }, (res) => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else if (res && res.status === "error") reject(new Error(res.message));
                        else resolve(res);
                    });
                });

                }


            
                const finalProfileData = response.data;
                cachedProfileData = response.data;

                console.log("Finale Profildaten (Hintergrund):", finalProfileData);
                statusDiv.innerText = "✅ Daten erhalten! Generiere...";

                // 3. Payload für KI erstellen (Wie gehabt)
                const payload = {
                    mode: jobId ? "create_with_jobid" : "create",
                    text: finalProfileData,
                    prompt: userPromptInput.value.trim(),
                    tonality: tonalitySelect.value,
                    length: lengthSelect.value,
                    timestamp: new Date().toISOString(),
                    name: rName,
                    email: rEmail
                };
                
                if (jobId) payload.job_id = jobId;

                if (currentUrl.includes("linkedin.com")) {
                    payload.source = "linkedin";
                } else {
                    payload.source = "xing";
                }

                // An KI senden
                sendPayloadToN8n(payload, "✍️ Erstelle Nachricht...");

            } catch (err) {
                showError(err.message);
                if (spinnerScrape) spinnerScrape.classList.add("hidden");
            }
             }
             else {
                showError("Bitte öffne ein XING oder LinkedIn Profil.");
                setTimeout(() => { clearError(); }, 4000);
                return;

             }


        });
    }



    // --- C. Nachricht Anpassen (Rewrite) ---
    if (recreateBtn) {
        recreateBtn.addEventListener("click", async () => {

            // --- Validierung & Cooldown ---
            const jobId = jobIdInputMessage ? jobIdInputMessage.value.trim() : "";
            if (jobId && !/^\d+$/.test(jobId)) {
                showError("Bitte gültige Job-ID (nur Zahlen) eingeben.");
                return;
            }
            startCooldown();

            // UI Updates
            statusDiv.innerText = "✨ Verfeinere Nachricht...";
            const spinnerRecreate = recreateBtn.querySelector(".spinner");
            if (spinnerRecreate) spinnerRecreate.classList.remove("hidden");

            try {
                // 1. URL FRISCH HOLEN
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const currentUrl = tabs[0]?.url?.toLowerCase() || "";

                // 2. RECRUITER DATEN
                const { rName, rEmail } = await getRecruiterData();
                console.log("Geladener Recruiter für Rewrite:", rName, rEmail);

                // 3. PROFIL DATEN HOLEN
                let finalProfileData;
                
                if (!cachedProfileData) {
                    // Falls noch keine Daten da sind, kurz scrapen
                    statusDiv.innerText = "🔍 Hole Daten erneut...";
                    const response = await scrapeData();
                    finalProfileData = response.data;
                    cachedProfileData = response.data;
                } else {
                    finalProfileData = cachedProfileData;
                }

                console.log("Finale Profildaten für Rewrite:", finalProfileData);

                // 4. PAYLOAD ERSTELLEN
                const payload = {
                    mode: jobId ? "rewrite_with_jobid" : "rewrite",
                    text: finalProfileData,
                    oldSubject: outputSubject.value,
                    oldMessage: outputMessage.value,
                    prompt: userPromptInput.value.trim(),
                    tonality: tonalitySelect.value,
                    length: lengthSelect.value,
                    timestamp: new Date().toISOString(),
                    name: rName,
                    email: rEmail 
                };

                if (jobId) {
                    payload.job_id = jobId;
                }

                // Source setzen
                if (currentUrl.includes("linkedin.com")) {
                    payload.source = "linkedin";
                } else {
                    payload.source = "xing";
                }

                sendPayloadToN8n(payload, "🎨 Verfeinere Nachricht...", true);

            } catch (err) {
                console.error(err);
                showError(err.message);
                if (spinnerRecreate) spinnerRecreate.classList.add("hidden");
            }
        });
    }


    // ==========================================
    // 4. FETCH FUNKTIONEN
    // ==========================================

    // Funktion 1: Für Job Matching
    function sendJobMatchingRequest(payload, loadingText) {
        if (isRequestRunning) return;
        isRequestRunning = true;
        statusDiv.innerText = loadingText;

        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            const output = Array.isArray(data) ? data[0] : data;
            if(output.error) throw new Error(output.error);
            // HTML Bauen
            let colorHex = "#666";
            let bgColor = "#f9f9f9";
            if (output.status_color === 'red') { colorHex = "#d93025"; bgColor = "#fff5f5"; }
            else if (output.status_color === 'green') { colorHex = "#188038"; bgColor = "#e6f4ea"; }
            else if (output.status_color === 'yellow') { colorHex = "#f29900"; bgColor = "#fff8e1"; }

            const makeList = (arr) => arr && arr.length ? arr.map(i => `<li style="margin-bottom:4px;">${i}</li>`).join('') : '<li>-</li>';

            const htmlContent = `
                <div style="border-left: 5px solid ${colorHex}; background: #fff; padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h3 style="color: ${colorHex}; margin: 0 0 5px 0; font-size: 16px;">${output.status_headline || "Analyse"}</h3>
                    <div style="font-weight:bold; margin-bottom: 10px; color:#333;">
                        Empfehlung: <span style="background:${bgColor}; padding:2px 6px; border-radius:4px; color:${colorHex}">${output.recommendation || "-"}</span>
                    </div>
                    <p style="font-size: 13px; line-height: 1.5; color: #555; margin-bottom: 15px; padding-bottom:10px; border-bottom:1px solid #eee;">
                        ${output.summary || ""}
                    </p>
                    <div style="font-size: 13px;">
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #188038;">✅ Pro:</strong>
                            <ul style="padding-left: 20px; margin-top: 5px; color: #333;">${makeList(output.pro_arguments)}</ul>
                        </div>
                        <div>
                            <strong style="color: #d93025;">❌ Contra:</strong>
                            <ul style="padding-left: 20px; margin-top: 5px; color: #333;">${makeList(output.contra_arguments)}</ul>
                        </div>
                    </div>
                </div>`;

            if(matchOutputText) matchOutputText.innerHTML = htmlContent;
            if(jobMatchResultContainer) jobMatchResultContainer.classList.remove("hidden");
            statusDiv.innerText = "";
        })
        .catch(err => showError(err.message))
        .finally(() => {
            isRequestRunning = false;
            // Spinner Matching ausschalten
            const sp = btnFetchJobMatchBtn.querySelector(".spinner");
            if(sp) sp.classList.add("hidden");
        });
    }

    // Funktion 2: Für Nachricht Generierung
    function sendPayloadToN8n(payload, loadingText, isRecreate = false) {
        if (isRequestRunning) return;
        
        const spinnerScrape = scrapeBtn ? scrapeBtn.querySelector(".spinner") : null;
        const spinnerRecreate = recreateBtn ? recreateBtn.querySelector(".spinner") : null;

        isRequestRunning = true;
        statusDiv.innerHTML = `
            <div class="status-container">
                <div class="pulsing-text">${loadingText}</div>
                <small style="color:#999; font-size:11px;">(Dauer ca. 10-30s)</small>
            </div>`;

        if(isRecreate && spinnerRecreate) spinnerRecreate.classList.remove("hidden");
        if(!isRecreate && spinnerScrape) spinnerScrape.classList.remove("hidden");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        console.log("Sende Payload an N8N:", payload);

        fetch(API_URL, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log("requested data:", data);
            clearTimeout(timeoutId);
            const output = Array.isArray(data) ? data[0] : data;
            if(output.error) throw new Error(output.error);
            outputSubject.value = output.betreff || output.subject || "";
            outputMessage.value = output.message || output.nachricht || "";
            
            statusDiv.innerText = "";
            resultContainer.classList.remove("hidden");
            if(recreateContainer) recreateContainer.classList.remove("hidden");
        })
        .catch(err => {
            console.error(err);
            showError(err.message);
        })
        .finally(() => {
            isRequestRunning = false;
            if(spinnerScrape) spinnerScrape.classList.add("hidden");
            if(spinnerRecreate) spinnerRecreate.classList.add("hidden");
        });
    }


    // ==========================================
    // 5. NAVIGATION & HELPER
    // ==========================================

    function switchView(targetView) {
        viewMenu.classList.add("hidden");
        viewGenerator.classList.add("hidden");
        viewJobMatching.classList.add("hidden");
        targetView.classList.remove("hidden");
    }

    if (btnToGen) btnToGen.addEventListener("click", () => switchView(viewGenerator));
    if (btnToMatch) btnToMatch.addEventListener("click", () => switchView(viewJobMatching));
    if (btnBackMatch) btnBackMatch.addEventListener("click", () => switchView(viewMenu));
    if (btnBackGen) btnBackGen.addEventListener("click", () => switchView(viewMenu));

    function startCooldown() {
        const now = Date.now();
        chrome.storage.local.set({ lastRequestTime: now });
        activateCooldownMode(now + (COOLDOWN_SECONDS * 1000));
    }

    function checkCooldown() {
        chrome.storage.local.get(['lastRequestTime'], (result) => {
            if (result.lastRequestTime) {
                const now = Date.now();
                const end = result.lastRequestTime + (COOLDOWN_SECONDS * 1000);
                if (now < end) activateCooldownMode(end);
            }
        });
    }

    function activateCooldownMode(endTime) {
        [scrapeBtn, recreateBtn, btnFetchJobMatchBtn].forEach(b => { if(b) b.disabled = true; });
        
        const texts = [
            scrapeBtn?.querySelector(".btn-text"),
            btnFetchJobMatchBtn?.querySelector(".btn-text"),
            recreateBtn?.querySelector(".btn-text")
        ];

        const interval = setInterval(() => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);

            if (remaining <= 0) {
                clearInterval(interval);
                [scrapeBtn, recreateBtn, btnFetchJobMatchBtn].forEach(b => { if(b) b.disabled = false; });
                
                if (texts[0]) texts[0].innerText = "Nachricht erstellen 🚀";
                if (texts[1]) texts[1].innerText = "Job Matching abrufen 🚀";
                if (texts[2]) texts[2].innerText = "Nachricht anpassen 🔄";
                
                // Not-Aus für Spinner
                document.querySelectorAll(".spinner").forEach(s => s.classList.add("hidden"));
            } else {
                texts.forEach(t => { if(t) t.innerText = `Warten: ${remaining}s ⏳`; });
            }
        }, 1000);
    }

    function showError(msg) {
        if(statusDiv) statusDiv.innerHTML = `<span style="color:#d93025; font-weight:bold;">⚠️ ${msg}</span>`;
    }

    if(copySubjectBtn) copySubjectBtn.addEventListener("click", () => copyToClipboard(outputSubject.value, copySubjectBtn));
    if(copyMessageBtn) copyMessageBtn.addEventListener("click", () => copyToClipboard(outputMessage.value, copyMessageBtn));

    function copyToClipboard(text, btn) {
        if (!text) return;
        navigator.clipboard.writeText(text);
        const original = btn.innerText;
        btn.innerText = "✅";
        setTimeout(() => btn.innerText = original, 1500);
    }

    function markInputError(inputEl) {
        if (!inputEl) return;
        inputEl.classList.add("input-error");
    }

    function clearInputError(inputEl) {
        if (!inputEl) return;
        inputEl.classList.remove("input-error");
    }

});