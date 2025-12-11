// popup.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- KONFIGURATION ---
    const API_URL = "https://xingproxy-842321698577.europe-west1.run.app/xing"; 

    //const N8N_API_KEY="my_secret_xing_key_99482_secure";
    //const API_URL = "https://n8n.stolzberger.cloud/webhook/28da305c-0beb-4939-a554-de37690a3777"; 
    const COOLDOWN_SECONDS = 20; 

    // --- ELEMENTE ---
    const scrapeBtn = document.getElementById("scrapeBtn");
    const recreateBtn = document.getElementById("recreateBtn"); // NEU
    const recreateContainer = document.getElementById("recreateContainer"); // Der Container für den Button

    const userPromptInput = document.getElementById("userPrompt");
    const statusDiv = document.getElementById("statusMessage");
    const resultContainer = document.getElementById("resultContainer");
    
    const outputSubject = document.getElementById("outputSubject");
    const outputMessage = document.getElementById("outputMessage");
    
    const spinner = document.querySelector(".spinner"); // Spinner im Hauptbutton
    const spinnerRecreate = recreateBtn.querySelector(".spinner"); // Spinner im Recreate Button
    const btnText = document.querySelector(".btn-text");

    const tonalitySelect = document.getElementById("tonalität");
    const lengthSelect = document.getElementById("msgLength");

    // Copy Buttons
    const copySubjectBtn = document.getElementById("copySubject");
    const copyMessageBtn = document.getElementById("copyMessage");


    // --- INITIALISIERUNG ---
    checkCooldown(); 

    // ==========================================
    // 1. BUTTON: NACHRICHT ERSTELLEN (Scraping)
    // ==========================================
    scrapeBtn.addEventListener("click", () => {
        
        // Anti-Ban starten
        startCooldown();

        // UI Reset
        statusDiv.innerText = "🔍 Lese Profil...";
        resultContainer.classList.add("hidden");
        recreateContainer.classList.add("hidden"); // Recreate erst ausblenden

        

        // Scraping starten
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) { showError("Kein Tab."); return; }
            
            chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {
                if (chrome.runtime.lastError || !response || !response.data) {
                    showError("Fehler beim Lesen. Bitte XING neu laden (F5).");
                    return;
                }

                
                cachedProfileData= response.data;

                // Payload für "NEU ERSTELLEN"
                const payload = {
                    mode: "create",  // Wichtig für n8n
                    text: response.data, // Das XING Profil
                    //url: tabs[0].url,
                    prompt: userPromptInput.value.trim(),
                    tonality: tonalitySelect.value,
                    length: lengthSelect.value,
                    timestamp: new Date().toISOString()
                };

                // An n8n senden
                sendPayloadToN8n(payload, "✨ KI generiert Nachricht...");
            });
        });
    });

    // ==========================================
    // 2. BUTTON: NACHRICHT ANPASSEN (Rewrite)
    // ==========================================
    recreateBtn.addEventListener("click", () => {
        
        // Anti-Ban starten
        startCooldown();

        // UI Reset (Ergebnis nicht ausblenden, nur Status updaten)
        statusDiv.innerText = "";
        
        // Payload für "UMSCHREIBEN"
        // Hier holen wir uns die ALTE Nachricht und die Einstellungen
        const payload = {
            mode: "rewrite", // Wichtig für n8n
            oldSubject: outputSubject.value, // Die alte Betreffzeile
            oldMessage: outputMessage.value, // Die alte Nachricht
            prompt: userPromptInput.value.trim(), // Der NEUE Wunsch
            tonality: tonalitySelect.value, // Die (vielleicht neue) Tonalität
            length: lengthSelect.value,     // Die (vielleicht neue) Länge
            timestamp: new Date().toISOString(),
            text: cachedProfileData, // Das XING Profil
        };

        // An n8n senden
        sendPayloadToN8n(payload, "🎨 Verfeinere Nachricht...", true);
    });


    // ==========================================
    // ZENTRALE FUNKTION: SENDEN AN N8N
    // ==========================================

    let isRequestRunning = false;


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

        console.log("📥 RAW RESPONSE:", result.text);

        if (result.status === 429) {
            throw new Error("Zu viele Anfragen (429). Bitte 30 Sekunden warten.");
        }

        if (result.status >= 400) {
            throw new Error("Server Fehler: " + result.status);
        }

        const json = JSON.parse(result.text);
        isRequestRunning = false;  // 🔥 WICHTIG
        return json;
    })
    .then(responseData => {
        if (!responseData) return;

        const output = Array.isArray(responseData) ? responseData[0] : responseData;

        outputSubject.value = output.betreff || output.subject || "";
        outputMessage.value = output.message || output.nachricht || "";

        statusDiv.innerText = "";
        resultContainer.classList.remove("hidden");
        recreateContainer.classList.remove("hidden");
    })
    .catch(err => {
        console.error("❌ ERROR:", err);
        showError(err.message);
        isRequestRunning = false;  // 🔥 WICHTIG
    });
}





    // --- HILFSFUNKTIONEN (Cooldown, Copy, Error) ---

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
        scrapeBtn.disabled = true;
        recreateBtn.disabled = true; // Beide Buttons sperren!
        
        const interval = setInterval(() => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);

            if (remaining <= 0) {
                clearInterval(interval);
                scrapeBtn.disabled = false;
                recreateBtn.disabled = false;
                if(btnText) btnText.innerText = "Nachricht erstellen 🚀";
            } else {
                if(btnText) btnText.innerText = `Warten: ${remaining}s ⏳`;
            }
        }, 1000);
    }

    function showError(msg) {
        statusDiv.innerHTML = `<span style="color:#d93025; font-weight:bold;">⚠️ ${msg}</span>`;
    }

    // Copy Logik (bleibt gleich)
    if(copySubjectBtn) copySubjectBtn.addEventListener("click", () => copyToClipboard(outputSubject.value, copySubjectBtn));
    if(copyMessageBtn) copyMessageBtn.addEventListener("click", () => copyToClipboard(outputMessage.value, copyMessageBtn));

    function copyToClipboard(text, btn) {
        if(!text) return;
        navigator.clipboard.writeText(text);
        const original = btn.innerText;
        btn.innerText = "✅";
        setTimeout(() => btn.innerText = original, 1500);
    }
});