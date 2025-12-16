// popup.js

document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURATION ---
    const API_URL = "https://xingproxy-842321698577.europe-west1.run.app/xing"; 
    const COOLDOWN_SECONDS = 20;

    // --- GLOBALE VARIABLEN ---
    let cachedProfileData = null; 
    let isRequestRunning = false;

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

    // Initialisierung
    checkCooldown();


    // ==========================================
    // 2. SCRAPING & INJECTION LOGIK (WICHTIG!)
    // ==========================================

    // Diese Funktion versucht zu scrapen und repariert sich selbst (Injection), falls nötig
    async function scrapeData() {
        // 1. Aktiven Tab finden
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) throw new Error("Kein Tab gefunden.");
        const tabId = tabs[0].id;

        try {
            // Versuch 1: Einfach nachfragen
            return await sendMessageToTab(tabId, { action: "scrape" });
        } catch (error) {
            console.log("Script antwortet nicht. Injiziere...", error);
            
            // Versuch 2: Script injizieren ("Dolmetscher reinwerfen")
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['contentScript.js']
                });
                
                // Kurze Pause zum Laden des Scripts
                await new Promise(r => setTimeout(r, 100));
                
                // Nochmal fragen
                return await sendMessageToTab(tabId, { action: "scrape" });
            } catch (injectError) {
                throw new Error("Fehler beim Lesen. Bitte Seite neu laden (F5).");
            }
        }
    }

    // Hilfsfunktion für sauberes Promise
    function sendMessageToTab(tabId, message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (!response || !response.data) {
                    reject(new Error("Keine Daten erhalten"));
                } else {
                    resolve(response);
                }
            });
        });
    }


    // ==========================================
    // 3. EVENT LISTENER (Die Buttons)
    // ==========================================

    // --- A. Job Matching Button ---
    if (btnFetchJobMatchBtn) {
        btnFetchJobMatchBtn.addEventListener("click", async () => {
            const jobId = job_id_input.value.trim();
            const isNumeric = Number(jobId);
            if (!jobId || !isNumeric || !Number.isInteger(isNumeric)) { showError("Bitte Job-ID eingeben."); return; }

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
                
                // Erfolg! Senden an n8n
                const payload = {
                    mode: "job_matching",
                    job_id: jobId,
                    text: response.data,
                    timestamp: new Date().toISOString()
                };
                
                sendJobMatchingRequest(payload, "🔍 Analysiere Matching...");

            } catch (err) {
                showError(err.message);
                if(spinnerMatch) spinnerMatch.classList.add("hidden");
            }
        });
    }

    // --- B. Nachricht Erstellen Button ---
    if (scrapeBtn) {
        scrapeBtn.addEventListener("click", async () => {

         // 1. Erst Daten holen & Validieren (BEVOR Cooldown startet)
            const jobId = jobIdInputMessage ? jobIdInputMessage.value.trim() : "";

            // Wenn eine ID da ist, muss sie aus Zahlen bestehen
            if (jobId && !/^\d+$/.test(jobId)) {
                showError("Bitte gültige Job-ID (nur Zahlen) eingeben.");
                return; // Abbruch, kein Cooldown gestartet!
            }
            startCooldown();
            
            statusDiv.innerText = "🔍 Lese Profil...";
            resultContainer.classList.add("hidden");
            if(recreateContainer) recreateContainer.classList.add("hidden");
            const spinnerScrape = scrapeBtn.querySelector(".spinner");
            if(spinnerScrape) spinnerScrape.classList.remove("hidden");

            try {
                // Scrapen mit der neuen Injection-Logik
                const response = await scrapeData();
                cachedProfileData = response.data; // Speichern

               
                const payload = {
                    mode: jobId ? "create_with_jobid" : "create",
                    text: response.data,
                    prompt: userPromptInput.value.trim(),
                    tonality: tonalitySelect.value,
                    length: lengthSelect.value,
                    timestamp: new Date().toISOString(),
                    
                };
                if(jobId) payload.job_id = jobId;

                sendPayloadToN8n(payload, "✍️ Erstelle Nachricht...");

            

            } catch (err) {
                showError(err.message);
                if(spinnerScrape) spinnerScrape.classList.add("hidden");
            }
        });
    }

    // --- C. Nachricht Anpassen (Rewrite) ---
    if (recreateBtn) {
        recreateBtn.addEventListener("click", () => {
            startCooldown();
            const payload = {
                mode: "rewrite",
                text: cachedProfileData,
                oldSubject: outputSubject.value,
                oldMessage: outputMessage.value,
                prompt: userPromptInput.value.trim(),
                tonality: tonalitySelect.value,
                length: lengthSelect.value,
                timestamp: new Date().toISOString()
            };
            sendPayloadToN8n(payload, "🎨 Verfeinere Nachricht...", true);
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
            
            // HTML Bauen
            let colorHex = "#666";
            let bgColor = "#f9f9f9";
            if (output.status_color === 'red') { colorHex = "#d93025"; bgColor = "#fff5f5"; }
            else if (output.status_color === 'green') { colorHex = "#188038"; bgColor = "#e6f4ea"; }
            else if (output.status_color === 'yellow') { colorHex = "#f29900"; bgColor = "#fff8e1"; }

            const makeList = (arr) => arr && arr.length ? arr.map(i => `<li style="margin-bottom:4px;">${i}</li>`).join('') : '<li>-</li>';

            const htmlContent = `
                <div style="border-left: 5px solid ${colorHex}; background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
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

        fetch(API_URL, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            clearTimeout(timeoutId);
            const output = Array.isArray(data) ? data[0] : data;
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
});