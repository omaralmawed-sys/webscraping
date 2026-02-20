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
// ==========================================
// X. RECRUITER NAME LOGIC (CHECK & SAVE)
// ==========================================

const recruiterNameContainer = document.getElementById("recruiter-name-container");
const recruiterNameInput = document.getElementById("user_name_input");
const btnSaveName = document.getElementById("saveUserNameBtn");

// Neue IDs aus den Einstellungen
const settingsNameInput = document.getElementById("settings_name_input");
const btnSaveSettingsName = document.getElementById("saveSettingsNameBtn");

const generatorBtn = document.getElementById("nav-to-generator");
const matchingBtn = document.getElementById("nav-to-job-matching");
const statusDiv = document.getElementById("statusMessage");

/**
 * Hilfsfunktion zum Speichern und UI-Update
 */
function saveNameProcess(newName) {
    if (!newName) {
        // Falls du keine showError Funktion hast, nutzen wir ein einfaches Feedback
        statusDiv.innerHTML = `<span style="color:red;">⚠️ Bitte Namen eingeben!</span>`;
        return;
    }

    chrome.storage.local.get(['cachedRecruiter'], (result) => {
        const currentData = result.cachedRecruiter || {};
        const updatedData = { ...currentData, name: newName };

        chrome.storage.local.set({ cachedRecruiter: updatedData }, () => {
            console.log("Name gespeichert:", newName);
            
            // 1. UI im Hauptmenü freischalten
            if (recruiterNameContainer) recruiterNameContainer.classList.add("hidden");
            generatorBtn.classList.remove("hidden");
            matchingBtn.classList.remove("hidden");
            
            // 2. Felder synchronisieren
            if (recruiterNameInput) recruiterNameInput.value = newName;
            if (settingsNameInput) settingsNameInput.value = newName;

            // 3. Erfolg melden
            statusDiv.innerHTML = `<span style="color:green;">✅ Name gespeichert!</span>`;
            
            // 4. Falls wir in der Einstellungs-Ansicht waren, zurück zum Menü
            // (Optional: switchView(viewMenu);)
            
            setTimeout(() => { statusDiv.innerText = ""; }, 3000);
        });
    });
}

// 1. INITIALER CHECK BEIM START
getRecruiterData().then(({ rName }) => {
    // Felder befüllen (damit man in den Settings sieht, was gespeichert ist)
    if (recruiterNameInput) recruiterNameInput.value = rName;
    if (settingsNameInput) settingsNameInput.value = rName;

    // Wenn Name fehlt: Menü-Buttons verstecken, Eingabe zeigen
    if (!rName || rName.trim() === "") {
        generatorBtn.classList.add("hidden");
        matchingBtn.classList.add("hidden");
        recruiterNameContainer.classList.remove("hidden");
    }
});

// 2. EVENT LISTENER
// Klick im Hauptmenü (Warnfeld)
if (btnSaveName) {
    btnSaveName.addEventListener("click", () => {
        saveNameProcess(recruiterNameInput.value.trim());
    });
}

// Klick in den Einstellungen
if (btnSaveSettingsName) {
    btnSaveSettingsName.addEventListener("click", () => {
        saveNameProcess(settingsNameInput.value.trim());
        // Nach dem Speichern in den Einstellungen zurück zum Hauptmenü
        if (typeof viewMenu !== 'undefined') switchView(viewMenu);
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

        // Plattform ermitteln
        if (url.includes('linkedin.com')) {
            currentPlatform = 'linkedin';
        } else if (url.includes('xing.com')) {
            currentPlatform = 'xing';
        }
        // Das leere 'else' habe ich entfernt, da currentPlatform oben schon 'unknown' ist.

        // Styles auf den Body anwenden
        const body = document.body;
        if (body) {
            body.classList.remove('platform-xing', 'platform-linkedin', 'platform-unknown');
            const config = platformConfig[currentPlatform];
            
            body.classList.add(config.class);
            body.style.setProperty('--platform-color', config.color);

            // KORREKTUR: Die Bedingung '&& currentPlatform !== "unknown"' wurde entfernt!
            // Jetzt wird auch bei unbekannten Seiten eine Benachrichtigung gezeigt.
            if (lastDetectedPlatform !== currentPlatform) {
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
    const COOLDOWN_SECONDS = 35;

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
    const viewSettings = document.getElementById("view-settings");

    const btnToGen = document.getElementById("nav-to-generator");
    const btnToMatch = document.getElementById("nav-to-job-matching");
    const btnBackMatch = document.getElementById("backFromJobMatching");
    const btnBackGen = document.getElementById("backFromNachrichtGenerator");
    const btnSettings = document.getElementById("settings-btn");
    const btnBackSettings = document.getElementById("backFromSettings");
    const btnBackKandidat = document.getElementById("backFromSection-kandidat");
    const btnBackKontakt = document.getElementById("backFromSection-kontakt");

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
        else if(tabUrl.includes("linkedin.com/in") || tabUrl.includes("linkedin.com/talent/hire") && tabUrl.includes("/profile/")) {  
            console.log("🔵 LinkedIn Seite erkannt.");
            return  await handleLinkedInScrape(tab.id); 
        }
        else {
            throw new Error("Bitte öffne ein XING oder LinkedIn Profil.");
        }
    }

     async function scrapeDataLinkedBase() {
        // 1. Aktiven Tab finden
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) throw new Error("Kein Tab gefunden.");
        
        const tab = tabs[0]; 
        tabUrl = tab.url || "";
       

        console.log("Aktive Tab URL:", tabUrl);

        if(tabUrl.includes("linkedin.com/in")) {  
            console.log("🔵 LinkedIn Seite erkannt.");
            return  await handleLinkedInBaseScrape(tab.id); 
        }
        else {
            throw new Error("Bitte öffne   LinkedIn Profil.");
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

    async function handleLinkedInScrape(tabId) {
        try {
            return await sendMessageToTab(tabId, { action: "SCRAPE_LINKEDIN" }); 
        } catch (error) {
            console.log("LinkedIn Script antwortet nicht. Injiziere...", error);
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content-linkedin.js']
                });
                await new Promise(r => setTimeout(r, 1000));
                return await sendMessageToTab(tabId, { action: "SCRAPE_LINKEDIN" });
            } catch (injectError) {
                throw new Error("Fehler beim Lesen. Bitte Seite (LinkedIn) neu laden (F5) oder prüfen Sie, ob Sie auf der richtigen Seite sind.");
            }
        }
    }


        async function handleLinkedInBaseScrape(tabId) {
        try {
            return await sendMessageToTab(tabId, { action: "SCRAPE_CANDIDATE" }); 
        } catch (error) {
            console.log("LinkedIn Script antwortet nicht. Injiziere...", error);
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['kandidaten-anlegen.js']
                });
                await new Promise(r => setTimeout(r, 1000));
                return await sendMessageToTab(tabId, { action: "SCRAPE_CANDIDATE" });
            } catch (injectError) {
                throw new Error("Fehler beim Lesen. Bitte Seite (LinkedIn) neu laden (F5) oder prüfen Sie, ob Sie auf der richtigen Seite sind.");
            }
        }
    }

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
                 

                if(currentUrl.includes("xing.com")) {
                    statusDiv.innerText = "🔍 Scrape XING..."
                     response = await scrapeData();
                }
                else{

                    statusDiv.innerText = "🔍 Scrape LinkedIn...";
                    response = await scrapeData();
                    

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
    if (scrapeBtn) {
        scrapeBtn.addEventListener("click", async () => {

            const jobId = jobIdInputMessage ? jobIdInputMessage.value.trim() : "";

            // Validierung Job-ID
            if (jobId && !/^\d+$/.test(jobId)) {
                showError("Bitte gültige Job-ID (nur Zahlen) eingeben.");
                markInputError(jobIdInputMessage);
                setTimeout(() => {
                    clearError();
                    clearInputError(jobIdInputMessage);
                }, 4000);
                return; 
            }

            startCooldown();

            // ---------------------------------------------------------
            // URL PRÜFEN FÜR KORREKTEN TEXT (Status Update)
            // ---------------------------------------------------------
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tabs[0]?.url?.toLowerCase() || "";
            
            // UI Vorbereitung
            if (currentUrl.includes("xing.com")) {
                statusDiv.innerText = "🔍 Scrape XING...";
            } else if (currentUrl.includes("linkedin.com")) {
                statusDiv.innerText = "🔍 Scrape LinkedIn...";
            } else {
                statusDiv.innerText = "🔍 Lese Profil..."; // Fallback
            }
            // ---------------------------------------------------------

            resultContainer.classList.add("hidden");
            if (recreateContainer) recreateContainer.classList.add("hidden");
            const spinnerScrape = scrapeBtn.querySelector(".spinner");
            if (spinnerScrape) spinnerScrape.classList.remove("hidden");

            try {
                let finalProfileData;

                // 1. Recruiter Daten laden (Funktion steht jetzt ganz oben)
                const { rName, rEmail } = await getRecruiterData();
                console.log("Geladener Recruiter:", rName, rEmail);

                // 2. Scrapen
                const response = await scrapeData();
                
                finalProfileData = response.data;
                //cachedProfileData = response.data; // Speichern
                

                console.log("Finale Profildaten für Erstellung:", finalProfileData);

                // 3. Payload erstellen
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

                // Source setzen
                if (currentUrl.includes("linkedin.com")) {
                    payload.source = "linkedin";
                } else {
                    payload.source = "xing";
                }

                sendPayloadToN8n(payload, "✍️ Erstelle Nachricht...");

            } catch (err) {
                showError(err.message);
                if (spinnerScrape) spinnerScrape.classList.add("hidden");
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

    
 






            
        // Elemente erst abrufen, wenn das DOM geladen ist
        const fileInput = document.getElementById('resume_upload');
        const fileNameDisplay = document.getElementById('file-name-display');
        const fileInfoContainer = document.getElementById('file-info-container');
        const removeFileBtn = document.getElementById('removeFileBtn');
        const saveCandidateBtn = document.getElementById('saveCandidateBtn');
        const dropArea = document.getElementById('drop-area');

        // Funktion zum Zurücksetzen der Upload-Ansicht
        function resetUpload() {
        if (fileInput) fileInput.value = ""; 
        if (fileInfoContainer) {
        fileInfoContainer.classList.add('hidden');
        fileInfoContainer.style.display = "none"; // Sicherstellen, dass es weg ist
        }
        if (saveCandidateBtn) saveCandidateBtn.classList.add('hidden');

        if (dropArea) {
        dropArea.style.borderColor = ""; 
        dropArea.style.backgroundColor = "";
        }
        }

        // 1. Datei-Auswahl
        if (fileInput) {
        fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
        fileNameDisplay.textContent = "📄 " + this.files[0].name;
        fileInfoContainer.classList.remove('hidden');
        fileInfoContainer.style.display = "flex"; // Anzeigen als Flexbox
        saveCandidateBtn.classList.remove('hidden');

        // UI Feedback
        dropArea.style.borderColor = "#28a745";
        dropArea.style.backgroundColor = "#f6fff8";
        }
        });
        }

        // 2. Datei entfernen
        if (removeFileBtn) {
        removeFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetUpload();
        });
        }

        // Hilfsfunktion: Base64
        function getBase64(file) {
        return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        });
        }

// Sektionen (Diese behandeln wir jetzt wie eigene Views)
const sectionKandidat = document.getElementById("section-kandidat");
const sectionKontakt = document.getElementById("section-kontakt");

// Buttons im Hauptmenü
const btnTabKandidat = document.getElementById("tab-kandidat");
const btnTabKontakt = document.getElementById("tab-kontakt");

// --- 3. EVENT LISTENER ---



// Wenn man auf "Kandidat anlegen" klickt
if (btnTabKandidat) {
    btnTabKandidat.addEventListener("click", () => {
        switchView(sectionKandidat);
    });
}

// Wenn man auf "Kontakt anlegen" klickt
if (btnTabKontakt) {
    btnTabKontakt.addEventListener("click", () => {
        switchView(sectionKontakt);
    });
}


// Variable zum Zwischenspeichern der Scraper-Daten für den Upload
let currentScrapedCandidateForUpload = null;
let contactStatusClearTimeoutId = null;
if (btnTabKandidat) {
    btnTabKandidat.addEventListener("click", async () => {
        // 1. UI Vorbereiten
        switchView(sectionKandidat);
        statusDiv.innerHTML = "🔍 Bereite Profil-Daten für Upload vor...";

        try {
            // 2. Den Scraper aufrufen (deine existierende Methode)
            const response = await scrapeDataLinkedBase();

            // 3. ERFOLGREICH GECRAPT:
            if (response && response.data) {
                // Felder im UI füllen
                fillContactFields(response.data);
                
                // Recruiter Daten abrufen
                const recruiter = await getRecruiterData();
                const nameParts = response.data.fullName.split(/\s+/);
                
                // Payload für n8n zusammenbauen
                currentContactPayload = {
                    mode: "check_kandidaten",
                    mode_create: "create_kontakt_candidate",
                    firstName: nameParts[0] || "",
                    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
                    jobTitle: response.data.position || "",
                    profileImage: response.data.profileImage || "",
                    recruiter_name: recruiter.rName || "Unbekannt",
                    recruiter_email: recruiter.rEmail || "Keine Email",
                    profileUrl: response.data.url || "" 
                };

                // 4. Duplikatsprüfung in n8n starten
                // (Nutzt die optimierte Funktion aus unserer vorherigen Nachricht)
                await checkDuplicateInN8n(currentContactPayload,"save_kandidaten");
                
            } else {
                showError("Keine Daten vom Profil erhalten.");
            }

        } catch (err) {
            console.error("Scrape Fehler:", err);
            // Zeigt die Fehlermeldung aus deiner catch-Logik in scrapeDataLinkedBase an
            showError(err.message || "Fehler beim Initialisieren des Scrapers.");
        }
    });
}



if (saveCandidateBtn) {
    saveCandidateBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            showError("Bitte erst eine Datei auswählen.");
            return;
        }

        saveCandidateBtn.disabled = true;
        saveCandidateBtn.textContent = "Sende Daten & Datei... ⏳";

        try {
            // 1. Datei in Base64 umwandeln
            const fileBase64 = await getBase64(file);
            
            // 2. Scraper aufrufen
            const scrape = await scrapeDataLinkedBase();

            if (scrape && scrape.data) {
                // Recruiter Daten abrufen
                const recruiter = await getRecruiterData();
                const nameParts = scrape.data.fullName.split(/\s+/);

                // 3. Payload zusammenbauen (Datei + Scraper Daten)
                // WICHTIG: Wir nutzen scrape.data (nicht response.data!)
                const payload = {
                    mode: "save_kandidaten",
                    mode_create: "create_kontakt_candidate",
                    source: "resume_upload",
                    fileName: file.name,
                    fileData: fileBase64,
                    firstName: nameParts[0] || "",
                    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
                    jobTitle: scrape.data.position || "",
                    profileImage: scrape.data.profileImage || "",
                    recruiter_name: recruiter.rName || "Unbekannt",
                    recruiter_email: recruiter.rEmail || "Keine Email",
                    profileUrl: scrape.data.url || "",
                };

                console.log("Sende Paket an n8n:", payload);

                // 4. Absenden an n8n (Nutzt deine zentrale sendToN8n Methode)
                const n8nResult = await sendToN8n(payload);

                if (n8nResult) { // Wenn sendToN8n Erfolg meldet (nicht null)
                    statusDiv.innerHTML = `<span style="color:green;">✅ Kandidat & Datei erfolgreich angelegt!</span>`;
                    setTimeout(() => {
                        statusDiv.innerText = "";
                        // resetUpload(); // Falls du diese Funktion hast
                        switchView(viewMenu);
                    }, 3000);
                } else {
                    showError("Fehler beim Senden an n8n.");
                }

            } else {
                showError("Keine Profildaten gefunden. Bitte LinkedIn Profil prüfen.");
            }
        } catch (error) {
            console.error("Upload Fehler:", error);
            showError("Kritischer Fehler beim Upload: " + error.message);
        } finally {
            saveCandidateBtn.disabled = false;
            saveCandidateBtn.textContent = "Kandidat anlegen ➕";
        }
    });
}



    // Felder aus der Kontakt-Sektion
    // const contactNameInput = document.getElementById("contact_fullname");
    // const contactJobInput = document.getElementById("contact_jobtitle");
    // const contactImageInput = document.getElementById("contact_image"); // Das Textfeld für die URL
    const btnSaveContact = document.getElementById("saveContactBtn");
    const btnBackContact = document.getElementById("backFromSection-kontakt");

    // Wenn man auf "Kontakt anlegen" klickt
    // Variable zum Zwischenspeichern der aktuellen Payload
    let currentContactPayload = null;


    if (btnTabKontakt) {
    btnTabKontakt.addEventListener("click", async () => {
        // 1. Ansicht wechseln & UI vorbereiten
        switchView(sectionKontakt);
        statusDiv.innerHTML = "🔍 Scrape Profil & prüfe Duplikate...";
        
        // Button deaktivieren während des Prozesses
        btnSaveContact.disabled = true;
        btnSaveContact.style.opacity = "0.5";

        try {
            // 2. Den Scraper aufrufen (deine existierende Methode)
            const response = await scrapeDataLinkedBase();

            // 3. ERFOLGREICH GECRAPT:
            if (response && response.data) {
                // Felder im UI füllen
                fillContactFields(response.data);
                
                // Recruiter Daten abrufen
                const recruiter = await getRecruiterData();
                const nameParts = response.data.fullName.split(/\s+/);
                
                // Payload für n8n zusammenbauen
                currentContactPayload = {
                    mode: "check_kontakten",
                    mode_create: "create_kontakt_candidate",
                    firstName: nameParts[0] || "",
                    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
                    jobTitle: response.data.position || "",
                    profileImage: response.data.profileImage || "",
                    recruiter_name: recruiter.rName || "Unbekannt",
                    recruiter_email: recruiter.rEmail || "Keine Email",
                    profileUrl: response.data.url || "" 
                };

                // 4. Duplikatsprüfung in n8n starten
                // (Nutzt die optimierte Funktion aus unserer vorherigen Nachricht)
                await checkDuplicateInN8n(currentContactPayload,"save_kontakten");
                
            } else {
                showError("Keine Daten vom Profil erhalten.");
            }

        } catch (err) {
            console.error("Scrape Fehler:", err);
            // Zeigt die Fehlermeldung aus deiner catch-Logik in scrapeDataLinkedBase an
            showError(err.message || "Fehler beim Initialisieren des Scrapers.");
        }
    });
}
// Hilfsfunktion: Befüllt die KONTAKT-Felder und zeigt das BILD an
function fillContactFields(data) {
    const nameInput = document.getElementById("contact_fullname");
    const jobInput = document.getElementById("contact_jobtitle");
    const imgDisplay = document.getElementById("contact_image_display");
    const imgUrlHidden = document.getElementById("contact_image_url");

    // Texte befüllen
    if(nameInput) nameInput.value = data.fullName || "";
    if(jobInput) jobInput.value = data.position || "";

    // Bild-Logik
    if (imgDisplay && data.profileImage) {
        imgDisplay.src = data.profileImage;
        imgDisplay.style.display = "block"; // Sichtbar machen
        
        if(imgUrlHidden) imgUrlHidden.value = data.profileImage; // URL für später speichern
    } else if (imgDisplay) {
        imgDisplay.style.display = "none"; // Verstecken, falls kein Bild da
    }

    const infoMessage = "✅ Profildaten übernommen.";
    statusDiv.innerText = infoMessage;

    if (contactStatusClearTimeoutId) {
        clearTimeout(contactStatusClearTimeoutId);
    }

    contactStatusClearTimeoutId = setTimeout(() => {
        // Nur leeren, wenn noch dieselbe Zwischenmeldung steht.
        if (statusDiv.innerText === infoMessage) {
            statusDiv.innerText = "";
        }
        contactStatusClearTimeoutId = null;
    }, 2000);
}
// 1. Zentrale Methode für den API-Aufruf
async function sendToN8n(payload) {
    try {
        const response = await fetch("https://n8n.stolzberger.cloud/webhook/36f1d14f-c7eb-427c-a738-da2dfb5b9649", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Netzwerk-Antwort war nicht ok");
        
        console.log("Antwort von n8n:", response.json());  
        return await response.json();

          
    } catch (error) {
        console.error("Fehler beim n8n-Aufruf:", error);
        showError("Verbindung zu n8n fehlgeschlagen.");
        return null;
    }
}   

// 2. Hilfsfunktion für die Erfolgsmeldung (auch mehrfach genutzt)
function handleSaveSuccess() {
    statusDiv.innerHTML = "<span style='color:green;'>✅ Erfolgreich in Vincere angelegt!</span>";
    setTimeout(() => {
        statusDiv.innerText = "";
        switchView(viewMenu);
    }, 3000);
}

async function checkDuplicateInN8n(payload, testMode) {
    if (contactStatusClearTimeoutId) {
        clearTimeout(contactStatusClearTimeoutId);
        contactStatusClearTimeoutId = null;
    }

    const result = await sendToN8n(payload);
    if (!result) return;

    const check = Array.isArray(result) ? result[0] : result;

    // Weiche: Blendet je nach Modus das richtige UI ein
    // Weiche: Blendet je nach Modus das richtige UI ein
    const showFormArea = () => {
        console.log("Versuche Formular einzublenden für Modus:", testMode); // <-- Hilft dir bei der Fehlersuche

        if (testMode === "save_kandidaten" || testMode === "save_kandidat") {
            const dropArea = document.getElementById("drop-area");
            const saveCandBtn = document.getElementById("saveCandidateBtn");
            if (dropArea) dropArea.classList.remove("hidden");
            if (saveCandBtn) saveCandBtn.classList.remove("hidden");
            
        } else if (testMode === "save_kontakten") {
            const contactForm = document.getElementById("contact-form-area");
            
            if (contactForm) {
                contactForm.classList.remove("hidden");
                console.log("Kontakt-Formular erfolgreich eingeblendet!");
            } else {
                console.error("Fehler: Das HTML-Element mit id='contact-form-area' wurde nicht gefunden.");
            }
        } else {
            console.error("Fehler: Unbekannter testMode übergeben ->", testMode);
        }
    };

    if (check.is_empty === true) {
        // KEIN DUPLIKAT
        const typeName = testMode === "save_kandidaten" ? "Kandidat" : "Kontakt";
        statusDiv.innerHTML = `<span style='color:green;'>✅ ${typeName} ist neu. Bereit zum Anlegen.</span>`;
        
        showFormArea(); // Formular einblenden
    } else {
        // DUPLIKAT GEFUNDEN
        const typeName = testMode === "save_kandidaten" ? "Kandidat" : "Kontakt";
        statusDiv.innerHTML = `
            <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:8px; border:1px solid #ffeeba; margin-top:10px;">
                <strong>⚠️ ${typeName} existiert bereits im System!</strong><br> Trotzdem neu anlegen?
                <div style="margin-top:8px; display:flex; gap:10px; justify-content:center;">
                    <button id="btn-force-save" class="secondary-btn" style="padding:4px 10px; background:#d9534f; color:white; border:none;">Ja, weiter</button>
                    <button id="btn-cancel-save" class="secondary-btn" style="padding:4px 10px; border:none;">Nein, abbrechen</button>
                </div>
            </div>`;

        document.getElementById("btn-force-save").onclick = () => {
            statusDiv.innerHTML = `<span style='color:orange;'>⚠️ Duplikat-Modus: Bitte Daten prüfen und anlegen.</span>`;
            
            showFormArea(); // Formular nach "Ja" Klick einblenden

            // WICHTIG: Hier den Button wieder entsperren!
            const btnSaveContact = document.getElementById("saveContactBtn");
            if (btnSaveContact) {
                btnSaveContact.disabled = false;
                btnSaveContact.style.opacity = "1";
            }
        };

        document.getElementById("btn-cancel-save").onclick = () => {
            switchView(viewMenu);
            statusDiv.innerText = "";
        };
    }
}

// 4. Der Speicher-Button Event Listener
if (btnSaveContact) {
    btnSaveContact.addEventListener("click", async () => {
        statusDiv.innerHTML = "⏳ Speichere in Vincere...";
        currentContactPayload.mode = "save_kontakten";


        const result = await sendToN8n(currentContactPayload);
        if (result) handleSaveSuccess();
    });
}

// Zurück-Button
if (btnBackContact) {
    btnBackContact.addEventListener("click", () => switchView(viewMenu));
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

// --- 2. DIE SWITCH-FUNKTION (Erweitert) ---
function switchView(targetView) {
    const allViews = [
        viewMenu, viewGenerator, viewJobMatching, 
        viewSettings, sectionKandidat, sectionKontakt
    ];

    allViews.forEach(v => {
        if (v) v.classList.add("hidden");
    });

    if (targetView) {
        targetView.classList.remove("hidden");

        // RESET Kandidaten-UI
        if (targetView === sectionKandidat) {
            const dropArea = document.getElementById("drop-area");
            const saveCandBtn = document.getElementById("saveCandidateBtn");
            const fileInfo = document.getElementById("file-info-container");
            
            if (dropArea) dropArea.classList.add("hidden");
            if (saveCandBtn) saveCandBtn.classList.add("hidden");
            if (fileInfo) fileInfo.classList.add("hidden");
            document.getElementById("resume_upload").value = "";
        }
        
        // RESET Kontakt-UI
        if (targetView === sectionKontakt) {
            const contactForm = document.getElementById("contact-form-area");
            if (contactForm) contactForm.classList.add("hidden");
        }
    }
}

    if (btnToGen) btnToGen.addEventListener("click", () => switchView(viewGenerator));
    if (btnToMatch) btnToMatch.addEventListener("click", () => switchView(viewJobMatching));
    if (btnBackMatch) btnBackMatch.addEventListener("click", () => switchView(viewMenu));
    if (btnBackGen) btnBackGen.addEventListener("click", () => switchView(viewMenu));
    if (btnSettings && viewSettings) btnSettings.addEventListener("click", () => switchView(viewSettings));
    if (btnBackSettings) btnBackSettings.addEventListener("click", () => switchView(viewMenu));
    if(btnBackKandidat) btnBackKandidat.addEventListener("click", () => switchView(viewMenu));
    if(btnBackKontakt) btnBackKontakt.addEventListener("click", () => switchView(viewMenu));

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

   // Variable für den Timer (hast du ja schon ähnlich angelegt)
let statusMessageTimeoutId = null;

// Zentrale Funktion für Fehlermeldungen, die nach 5 Sekunden verschwinden
function showError(message) {
    // 1. Alten Timer löschen, falls noch einer läuft
    if (statusMessageTimeoutId) {
        clearTimeout(statusMessageTimeoutId);
    }

    // 2. Fehler im UI anzeigen (in rot)
    statusDiv.innerHTML = `<span style="color:red;">❌ ${message}</span>`;

    // 3. Neuen Timer setzen (verschwindet nach 5000 Millisekunden = 5 Sekunden)
    statusMessageTimeoutId = setTimeout(() => {
        statusDiv.innerHTML = "";
    }, 5000);
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

    // Drag-and-Drop fuer den Lebenslauf-Upload aktivieren
    if (dropArea && fileInput) {
        const allowedExtensions = new Set(["pdf", "doc", "docx"]);

        const restoreDropAreaStyle = () => {
            const hasSelectedFile = fileInput.files && fileInput.files.length > 0;
            if (hasSelectedFile) {
                dropArea.style.borderColor = "#28a745";
                dropArea.style.backgroundColor = "#f6fff8";
            } else {
                dropArea.style.borderColor = "";
                dropArea.style.backgroundColor = "";
            }
        };

        const preventDefaults = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };

        ["dragenter", "dragover"].forEach((eventName) => {
            dropArea.addEventListener(eventName, (event) => {
                preventDefaults(event);
                dropArea.style.borderColor = "#026466";
                dropArea.style.backgroundColor = "#eef9f9";
            });
        });

        ["dragleave", "dragend"].forEach((eventName) => {
            dropArea.addEventListener(eventName, (event) => {
                preventDefaults(event);
                restoreDropAreaStyle();
            });
        });

        dropArea.addEventListener("drop", (event) => {
            preventDefaults(event);

            const droppedFile = event.dataTransfer?.files?.[0];
            if (!droppedFile) {
                restoreDropAreaStyle();
                return;
            }

            const ext = droppedFile.name.split(".").pop()?.toLowerCase();
            if (!allowedExtensions.has(ext || "")) {
                showError("Bitte nur PDF, DOC oder DOCX hochladen.");
                restoreDropAreaStyle();
                setTimeout(() => { clearError(); }, 3000);
                return;
            }

            try {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(droppedFile);
                fileInput.files = dataTransfer.files;
                fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (err) {
                console.error("Drop-Fehler:", err);
                showError("Drag-and-Drop wird hier nicht unterstuetzt.");
                restoreDropAreaStyle();
                setTimeout(() => { clearError(); }, 3000);
            }
        });
    }

});
