// ========================================
// AUTOMATISCHE PLATTFORM-ERKENNUNG (MIT GRAU-MODUS)
// ========================================

const platformConfig = {
    linkedin: { class: 'platform-linkedin', color: '#0A66C2', name: 'LinkedIn' },
    xing: { class: 'platform-xing', color: '#026466', name: 'XING' },
    unknown: { class: 'platform-unknown', color: '#6c757d', name: 'Unbekannt' } // Grau für unbekannte Seiten
};

let lastDetectedPlatform = null;

async function applyPlatformStyles() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) return;

        const tab = tabs[0];
        const body = document.body;
        const url = (tab.url || "").toLowerCase();

        let currentPlatform = 'unknown'; // Standardmäßig auf Unbekannt setzen

        if (url.includes('linkedin.com')) {
            currentPlatform = 'linkedin';
        } else if (url.includes('xing.com')) {
            currentPlatform = 'xing';
        }

        // Styles anwenden
        body.classList.remove('platform-xing', 'platform-linkedin', 'platform-unknown');
        const config = platformConfig[currentPlatform];
        
        body.classList.add(config.class);
        body.style.setProperty('--platform-color', config.color);

        // BENACHRICHTIGUNG ANZEIGEN
        if (lastDetectedPlatform !== currentPlatform) {
            animatePlatformSwitch(config.name, config.color);
            lastDetectedPlatform = currentPlatform;
        }

    } catch (e) {
        console.error("Style-Fehler:", e);
    }
}

function animatePlatformSwitch(platformName, color) {
    const oldNote = document.querySelector('.platform-notification');
    if (oldNote) oldNote.remove();

    const notification = document.createElement('div');
    notification.className = 'platform-notification';
    notification.innerHTML = `
        <div class="platform-badge" style="background: ${color}">
            ${platformName} Modus aktiv
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Initialisierung
applyPlatformStyles();
document.addEventListener('DOMContentLoaded', applyPlatformStyles);

if (chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(applyPlatformStyles);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === 'complete') applyPlatformStyles();
    });
}


// ========================================
// DEIN BESTEHENDER CODE KOMMT JETZT HIER:
// =======
document.addEventListener('DOMContentLoaded', () => {

    
    // --- KONFIGURATION ---
    const API_URL = "https://xingproxy-842321698577.europe-west1.run.app/xing"; 
    const COOLDOWN_SECONDS = 25;

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

    // LinkedIn elemente
  // NEU: Manual / Auto Toggle Elemente
    const radioAuto = document.getElementById("source-auto");
    const radioManual = document.getElementById("source-manual");
    const manualInputContainer = document.getElementById("manual-input-container");
    const manualProfileData = document.getElementById("manualProfileData");

    // Initialisierung
    checkCooldown();


    // ==========================================
    // 1.5 TOGGLE LOGIK (NEU)
    // ==========================================

//     function updateManualInputVisibility() {

//     if(radioManual && radioManual.checked ){
//         manualInputContainer.classList.remove("hidden");

//     }
//     else
//     {
//         manualInputContainer.classList.add("hidden");
//     }
// }

//     if(radioAuto){
//     radioAuto.addEventListener("change", updateManualInputVisibility);
//     }

//     if(radioManual){
//     radioManual.addEventListener("change", updateManualInputVisibility);
//     }

    // ==========================================
    // 2. SCRAPING & INJECTION LOGIK (WICHTIG!)
    // ==========================================

    // Diese Funktion versucht zu scrapen und repariert sich selbst (Injection), falls nötig
   // ==========================================
    // 2. SCRAPING & INJECTION LOGIK (KORRIGIERT)
    // ==========================================

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

        if(tabUrl.includes("xing.com/profiles")) {
            console.log("🟢 XING Seite erkannt.");
            return await handleXingScrape(tab.id); 
        }
        else if(tabUrl.includes("linkedin.com/in")) {  
            console.log("🔵 LinkedIn Seite erkannt.");
            return await handleLinkedInScrape(tab.id); 
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
                throw new Error("Fehler beim Lesen. Bitte Seite (Xing) neu laden (F5) oder Sind Sie bei der falschen Seite.");
            }
        }
    }

    async function handleLinkedInScrape(tabId){
        try {
            console.log("1. Versuch: Sende Ping an LinkedIn Tab...");
            return await sendMessageToTab(tabId, { action: "SCRAPE_LINKEDIN" });
        } catch (error) {
            console.log("⚠️ Script antwortet nicht (Normal beim Start). Starte Injection...");
            
            try {
                // 1. Script injizieren
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content-linkedin.js']
                });
                
                // 2. WICHTIG: 1 Sekunde warten!
                console.log("⏳ Warte 2 Sekunde auf Script-Start...");
                await new Promise(r => setTimeout(r, 2000)); 
                
                // 3. Nochmal fragen
                console.log("2. Versuch: Sende Ping erneut...");
                return await sendMessageToTab(tabId, { action: "SCRAPE_LINKEDIN" });

            } catch (injectError) {
                console.error("Injection Fehler:", injectError);
                throw new Error("Verbindung fehlgeschlagen. Bitte lade den LinkedIn-Tab mit F5 neu.");
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

    // --- A. Job Matching Button ---
    if (btnFetchJobMatchBtn) {
        
       btnFetchJobMatchBtn.addEventListener("click", async () => {
        const jobId = job_id_input ? job_id_input.value.trim() : "";

        // 1. FALL: Feld ist leer
        if (!jobId) {
            showError("Bitte eine Job-ID eingeben.");
            markInputError(job_id_input);

            setTimeout(() => {
                clearError();
                clearInputError(job_id_input);
            }, 4000);
            return; // Abbruch
        }

        // 2. FALL: Eingabe ist nicht rein numerisch
        if (!/^\d+$/.test(jobId)) {
            showError("Bitte eine gültige Job-ID (nur Zahlen) eingeben.");
            markInputError(job_id_input);

            setTimeout(() => {
                clearError();
                clearInputError(job_id_input);
            }, 4000);
            return; // Abbruch
        }



            startCooldown();
            
            // UI Reset
            statusDiv.innerText = "🔍 Lese Profil...";
            if(jobMatchResultContainer) jobMatchResultContainer.classList.add("hidden");
            if(matchOutputText) matchOutputText.innerHTML = "";
            const spinnerMatch = btnFetchJobMatchBtn.querySelector(".spinner");
            if(spinnerMatch) spinnerMatch.classList.remove("hidden");

            try {
                // Scrapen mit der neuen Injection-Logik
                const response = await scrapeData();

                console.log("Gescapte Daten für Job Matching:", response.data);
                
                // Erfolg! Senden an n8n
                const payload = {
                    mode: "job_matching",
                    job_id: jobId,
                    text: response.data,
                    timestamp: new Date().toISOString()
                };



                if(tabUrl.includes("linkedin.com")) {
                    payload.source ="linkedin";
                }
                else{
                    payload.source ="xing";
                }
                sendJobMatchingRequest(payload, "🔍 Analysiere Matching...");

            } catch (err) {
                showError(err.message);
                if(spinnerMatch) spinnerMatch.classList.add("hidden");
            }
        });
    }

    function clearError() {
    statusDiv.innerHTML = "";
}


    // --- B. Nachricht Erstellen Button ---
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
            // NEU: URL VORHER PRÜFEN FÜR KORREKTEN TEXT
            // ---------------------------------------------------------
            // Wir holen kurz die URL, um den richtigen Text anzuzeigen
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

                // 1. Recruiter Daten laden (Bleibt gleich)
                const storageResult = await chrome.storage.local.get(['cachedRecruiter']);
                const recruiterData = storageResult.cachedRecruiter || {};
                const rName = recruiterData?.name || "";   
                const rEmail = recruiterData?.email || ""; 

                console.log("Geladener Recruiter:", rName, rEmail);

                // 2. Scrapen (Deine scrapeData Funktion übernimmt jetzt)
                // Die Funktion scrapeData() holt sich die URL intern nochmal, 
                // das ist okay und stört nicht.
                const response = await scrapeData();
                
                finalProfileData = response.data;
                cachedProfileData = response.data; // Speichern

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

                // Source setzen (XING oder LinkedIn)
                // Wir können hier direkt die Variable von oben (currentUrl) nutzen
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
  // --- C. Nachricht Anpassen (Rewrite) ---
if (recreateBtn) {
    // 1. FEHLER BEHOBEN: "async" hinzugefügt
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
        // (Optional: Spinner anzeigen, falls vorhanden)

        try {
            let finalProfileData;

            // --- 1. Recruiter Daten holen ---
            const storageResult = await chrome.storage.local.get(['cachedRecruiter']);
            
            // 2. FEHLER BEHOBEN: Fallback {} hinzugefügt, falls leer
            const recruiterData = storageResult.cachedRecruiter || {}; 
            
            // Daten sicher auslesen
            const rName = recruiterData.name || "";
            const rEmail = recruiterData.email || "";

            console.log("Geladener Recruiter für Rewrite:", rName, rEmail);


            // // --- 2. Profiltext holen (Manuell vs Auto) ---
            // if (radioManual && radioManual.checked) {
            //     // MANUELL
            //     const LinkedInData = manualProfileData.value.trim();
            //     if (!LinkedInData) {
            //         throw new Error("Bitte Profilinformationen im manuellen Modus eingeben.");
            //     }
            //     finalProfileData = LinkedInData;
            //     cachedProfileData = finalProfileData; // Global cachen
            // } else {
                // AUTO (XING)
                if (!cachedProfileData) {
                    // Falls noch keine Daten da sind, kurz scrapen (Sicherheitsnetz)
                    statusDiv.innerText = "🔍 Scrape XING (Daten fehlten)...";
                    const response = await scrapeData();
                    finalProfileData = response.data;
                    cachedProfileData = response.data;
                } else {
                    finalProfileData = cachedProfileData;
                }
            // }


            // --- 3. Payload erstellen & Senden ---
            // 3. FEHLER BEHOBEN: Payload ist jetzt HIER DRINNEN (im try-Block)
            // damit 'rName' und 'rEmail' sichtbar sind.
            
            console.log("Finale Profildaten für Rewrite:", finalProfileData);

            const payload = {
                mode: jobId ? "rewrite_with_jobid" : "rewrite",
                text: finalProfileData, // Besser die lokale Variable nutzen
                oldSubject: outputSubject.value,
                oldMessage: outputMessage.value,
                prompt: userPromptInput.value.trim(),
                tonality: tonalitySelect.value,
                length: lengthSelect.value,
                timestamp: new Date().toISOString(),
                // Hier übergeben wir die Daten, die wir oben geholt haben:
                name: rName, 
                email: rEmail
            };

            if (jobId) {
                payload.job_id = jobId;
            }
              if(tabUrl.includes("linkedin.com")) {
                    payload.source ="linkedin";
                }
                else{
                    payload.source ="xing";
                }
                

            sendPayloadToN8n(payload, "🎨 Verfeinere Nachricht...", true);

        } catch (err) {
            console.error(err);
            showError(err.message);
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
                <div style="border-left: 5px solid ${colorHex}; background: #fff; padding: 8    px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
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
        statusDiv.innerHTML = `<span style="color:#d93025; font-weight:bold;">⚠️ ${msg}</span>`;
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

