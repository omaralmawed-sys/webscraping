// popup.js

document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURATION ---
    const API_URL = "https://xingproxy-842321698577.europe-west1.run.app/xing"; 
    const COOLDOWN_SECONDS = 20;

    // --- GLOBALE VARIABLEN ---
    let cachedProfileData = null; // Wichtig: Muss hier oben stehen!
    let isRequestRunning = false;

    // ==========================================
    // 1. DOM ELEMENTE HOLEN
    // ==========================================

    // --- NAVIGATION ---
    const viewMenu = document.getElementById("view-menu");
    const viewGenerator = document.getElementById("view-generator");
    const viewJobMatching = document.getElementById("job-matching-container"); // Hier war vorher eine Verwirrung mit IDs

    const btnToGen = document.getElementById("nav-to-generator");
    const btnToMatch = document.getElementById("nav-to-job-matching");

    const btnBackMatch = document.getElementById("backFromJobMatching");
    const btnBackGen = document.getElementById("backFromNachrichtGenerator");

    // --- GENERATOR TOOL ---
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
    const btnText = document.querySelector(".btn-text");

    // --- JOB MATCHING TOOL ---
    const job_id_input = document.getElementById("job_id_input");
    const btnFetchJobMatchBtn = document.getElementById("fetchJobMatchBtn");
    const jobMatchResultContainer = document.getElementById("matchResult"); // ID aus deinem HTML (habe ich angepasst)
    const matchOutputText = document.getElementById("matchOutputText");

    // --- COPY BUTTONS ---
    const copySubjectBtn = document.getElementById("copySubject");
    const copyMessageBtn = document.getElementById("copyMessage");
    
    // --- SPINNER ---
    const spinner = document.querySelector(".spinner"); 
    const spinnerRecreate = recreateBtn ? recreateBtn.querySelector(".spinner") : null;


    // --- INITIALISIERUNG ---
    checkCooldown();


    // ==========================================
    // 2. NAVIGATIONS-LOGIK (Repariert)
    // ==========================================

    function switchView(targetView) {
        // Alles verstecken
        if(viewMenu) viewMenu.classList.add("hidden");
        if(viewGenerator) viewGenerator.classList.add("hidden");
        if(viewJobMatching) viewJobMatching.classList.add("hidden");

        // Ziel anzeigen
        if(targetView) targetView.classList.remove("hidden");
    }

    // A. Vom Menü zum Generator
    if (btnToGen) {
        btnToGen.addEventListener("click", () => {
            switchView(viewGenerator);
        });
    }

    // B. Vom Menü zum Job Matching
    if (btnToMatch) {
        btnToMatch.addEventListener("click", () => {
            switchView(viewJobMatching);
        });
    }

    // C. Zurück zum Menü (vom Job Matching)
    if (btnBackMatch) {
        btnBackMatch.addEventListener("click", () => {
            switchView(viewMenu);
        });
    }

    // D. Zurück zum Menü (vom Generator)
    if (btnBackGen) {
        btnBackGen.addEventListener("click", () => {
            switchView(viewMenu);
        });
    }


    // ==========================================
    // 3. JOB MATCHING LOGIK (Repariert)
    // ==========================================

    if (btnFetchJobMatchBtn) {
        btnFetchJobMatchBtn.addEventListener("click", () => {

            const jobId = job_id_input.value.trim();
            if (!jobId) {
                showError("Bitte Job-ID eingeben.");
                return;
            }

            // Anti-Ban starten
            startCooldown();

            // UI Reset
            statusDiv.innerText = "🔍 Lese Job-Daten...";
            if(jobMatchResultContainer) jobMatchResultContainer.classList.add("hidden");
            if(matchOutputText) matchOutputText.innerText = "";

            // Scraping starten
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0) {
                    showError("Kein Tab.");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {

                    if (chrome.runtime.lastError || !response || !response.data) {
                        showError("Fehler beim Lesen. Bitte XING neu laden (F5).");
                        return;
                    }

                    // --- WICHTIG: Das Senden muss HIER DRIN passieren ---
                    // Sonst ist 'response.data' noch nicht da.
                    
                    const payload = {
                        mode: "job_matching",
                        job_id: jobId,
                        profile_data: response.data, // Wir senden das Profil mit
                        timestamp: new Date().toISOString()
                    };

                    // Wir nutzen eine spezielle Funktion hierfür, damit das Ergebnis nicht im Generator landet
                    sendJobMatchingRequest(payload, "🔍 Analysiere Matching...");
                });
            });
        });
    }


    // ==========================================
    // 4. GENERATOR LOGIK (Create & Rewrite)
    // ==========================================

    if (scrapeBtn) {
        scrapeBtn.addEventListener("click", () => {
            startCooldown();
            statusDiv.innerText = "🔍 Lese Profil...";
            resultContainer.classList.add("hidden");
            if(recreateContainer) recreateContainer.classList.add("hidden");

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0) { showError("Kein Tab."); return; }

                chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.data) {
                        showError("Fehler beim Lesen. Bitte XING neu laden (F5).");
                        return;
                    }

                    cachedProfileData = response.data; // Speichern!

                    const payload = {
                        mode: "create",
                        text: response.data,
                        prompt: userPromptInput.value.trim(),
                        tonality: tonalitySelect.value,
                        length: lengthSelect.value,
                        timestamp: new Date().toISOString()
                    };

                    sendPayloadToN8n(payload, "✨ KI generiert Nachricht...");
                });
            });
        });
    }

    if (recreateBtn) {
        recreateBtn.addEventListener("click", () => {
            startCooldown();
            statusDiv.innerText = "";

            const payload = {
                mode: "rewrite",
                oldSubject: outputSubject.value,
                oldMessage: outputMessage.value,
                prompt: userPromptInput.value.trim(),
                tonality: tonalitySelect.value,
                length: lengthSelect.value,
                timestamp: new Date().toISOString(),
                text: cachedProfileData,
            };

            sendPayloadToN8n(payload, "🎨 Verfeinere Nachricht...", true);
        });
    }


    // ==========================================
    // 5. FETCH FUNKTIONEN
    // ==========================================

    // Speziell für Job Matching (zeigt Ergebnis woanders an)
    function sendJobMatchingRequest(payload, loadingText) {
        if (isRequestRunning) return;
        isRequestRunning = true;

        statusDiv.innerText = loadingText;
        const spinnerMatch = btnFetchJobMatchBtn.querySelector(".spinner");
        if(spinnerMatch) spinnerMatch.classList.remove("hidden");

        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            const output = Array.isArray(data) ? data[0] : data;
            
            // Ergebnis anzeigen
            if(matchOutputText) {
                // n8n sollte 'analysis' oder 'message' zurückgeben
                matchOutputText.innerText = output.analysis || output.message || JSON.stringify(output);
            }
            if(jobMatchResultContainer) jobMatchResultContainer.classList.remove("hidden");
            statusDiv.innerText = "";
        })
        .catch(err => showError(err.message))
        .finally(() => {
            isRequestRunning = false;
            if(spinnerMatch) spinnerMatch.classList.add("hidden");
        });
    }

    // Standard Funktion für Generator
    function sendPayloadToN8n(payload, loadingText, isRecreate = false) {
        if (isRequestRunning) {
            console.warn("⛔ BLOCKED: Request already running");
            return;
        }

        isRequestRunning = true;
        console.log("📤 SEND TO PROXY:", payload);

        statusDiv.innerHTML = `
            <div class="status-container">
                <div class="pulsing-text">${loadingText}</div>
                <small style="color:#999; font-size:11px;">(Dauer ca. 10-30s)</small>
            </div>
        `;

        // Spinner an
        if(isRecreate && spinnerRecreate) spinnerRecreate.classList.remove("hidden");
        if(!isRecreate && spinner) spinner.classList.remove("hidden");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        fetch(API_URL, {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(res => res.text().then(text => ({ status: res.status, text })))
        .then(result => {
            clearTimeout(timeoutId);
            if (result.status === 429) throw new Error("Zu viele Anfragen (429). Bitte warten.");
            if (result.status >= 400) throw new Error("Server Fehler: " + result.status);
            return JSON.parse(result.text);
        })
        .then(responseData => {
            const output = Array.isArray(responseData) ? responseData[0] : responseData;
            outputSubject.value = output.betreff || output.subject || "";
            outputMessage.value = output.message || output.nachricht || "";
            
            statusDiv.innerText = "";
            resultContainer.classList.remove("hidden");
            if(recreateContainer) recreateContainer.classList.remove("hidden");
        })
        .catch(err => {
            console.error("❌ ERROR:", err);
            showError(err.message);
        })
        .finally(() => {
            isRequestRunning = false; // WICHTIG: Reset
            if(spinner) spinner.classList.add("hidden");
            if(spinnerRecreate) spinnerRecreate.classList.add("hidden");
        });
    }


    // ==========================================
    // 6. HELPER (Cooldown, Copy, Error)
    // ==========================================

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
        if(scrapeBtn) scrapeBtn.disabled = true;
        if(recreateBtn) recreateBtn.disabled = true;
        // Optional: Auch den Job Match Button sperren
        if(btnFetchJobMatchBtn) btnFetchJobMatchBtn.disabled = true;

        const interval = setInterval(() => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);

            if (remaining <= 0) {
                clearInterval(interval);
                if(scrapeBtn) scrapeBtn.disabled = false;
                if(recreateBtn) recreateBtn.disabled = false;
                if(btnFetchJobMatchBtn) btnFetchJobMatchBtn.disabled = false;
                if (btnText) btnText.innerText = "Nachricht erstellen 🚀";
            } else {
                if (btnText) btnText.innerText = `Warten: ${remaining}s ⏳`;
            }
        }, 1000);
    }

    function showError(msg) {
        statusDiv.innerHTML = `<span style="color:#d93025; font-weight:bold;">⚠️ ${msg}</span>`;
    }

    if (copySubjectBtn) copySubjectBtn.addEventListener("click", () => copyToClipboard(outputSubject.value, copySubjectBtn));
    if (copyMessageBtn) copyMessageBtn.addEventListener("click", () => copyToClipboard(outputMessage.value, copyMessageBtn));

    function copyToClipboard(text, btn) {
        if (!text) return;
        navigator.clipboard.writeText(text);
        const original = btn.innerText;
        btn.innerText = "✅";
        setTimeout(() => btn.innerText = original, 1500);
    }
});