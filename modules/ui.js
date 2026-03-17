import { platformConfig } from './config.js';
import { escapeHtml } from './utils.js';

// ============================================================================
// UI HELPER
// ============================================================================

let statusMessageTimeoutId = null;
let candidateProgressTimerId = null;
let candidateProgressSeconds = 0;
let lastDetectedPlatform = null;

// Views (werden bei Bedarf abgerufen)
const getViewElements = () => ({
    menu: document.getElementById("view-menu"),
    generator: document.getElementById("view-generator"),
    jobMatching: document.getElementById("job-matching-container"),
    settings: document.getElementById("view-settings"),
    kandidat: document.getElementById("section-kandidat"),
    kontakt: document.getElementById("section-kontakt")
});

export function showError(message) {
    const statusDiv = document.getElementById("statusMessage");
    if (!statusDiv) return;

    if (statusMessageTimeoutId) clearTimeout(statusMessageTimeoutId);

    // Fehlermeldung setzen
    statusDiv.innerHTML = `<span class="status-error-label" style="color: #d9534f; font-weight: bold; background: #fdf2f2; padding: 5px 10px; border-radius: 5px;">❌ ${message}</span>`;
    
    // Nach exakt 3 Sekunden (3000ms) wieder ausblenden
    statusMessageTimeoutId = setTimeout(() => {
        statusDiv.innerHTML = "";
    }, 3000); 
}

export function showSuccess(message) {
    const statusDiv = document.getElementById("statusMessage");
    if (!statusDiv) return;

    if (statusMessageTimeoutId) clearTimeout(statusMessageTimeoutId);

    // Grüne Erfolgsmeldung setzen
    statusDiv.innerHTML = `<span class="status-success-label" style="color: #155724; font-weight: bold; background: #d4edda; padding: 5px 10px; border-radius: 5px;">✅ ${message}</span>`;
    
    // Nach exakt 3 Sekunden (3000ms) wieder ausblenden
    statusMessageTimeoutId = setTimeout(() => {
        statusDiv.innerHTML = "";
    }, 3000); 
}

export function switchView(targetViewId) {
    stopCandidateProgress();
    // Reset Loading Buttons if any
    const saveCandidateBtn = document.getElementById("saveCandidateBtn");
    if (saveCandidateBtn) {
        saveCandidateBtn.dataset.busy = "0";
        setSaveCandidateLoadingState(false, "Speichern"); // Default Label
    }

    const views = getViewElements();
    Object.values(views).forEach(v => {
        if (v) v.classList.add("hidden");
    });

    // Spezieller Reset für Status
    const statusDiv = document.getElementById("statusMessage");
    if (statusDiv && targetViewId !== 'section-kandidat' && targetViewId !== 'section-kontakt') {
        statusDiv.innerHTML = "";
    }

    const target = typeof targetViewId === 'string' ? document.getElementById(targetViewId) : targetViewId;
    if (target) {
        target.classList.remove("hidden");
        // Reset spezifischer UI Teile
        if (target.id === 'section-kandidat') resetCandidateForm();
        if (target.id === 'section-kontakt') {
            const contactForm = document.getElementById("contact-form-area");
            if(contactForm) contactForm.classList.add("hidden");
        }
    }
}

function resetCandidateForm() {
    const candidateCards = document.querySelectorAll("#section-kandidat .card");
    const dropArea = document.getElementById("drop-area");
    const saveCandBtn = document.getElementById("saveCandidateBtn");
    const fileInfo = document.getElementById("file-info-container");
    const resumeUpload = document.getElementById("resume_upload");
    
    candidateCards.forEach(card => card.classList.add("hidden"));
    if (dropArea) dropArea.classList.add("hidden");
    if (saveCandBtn) saveCandBtn.classList.add("hidden");
    if (fileInfo) fileInfo.classList.add("hidden");
    if (resumeUpload) resumeUpload.value = "";
}

// ============================================================================
// PLATFORM STYLING
// ============================================================================

export async function applyPlatformStyles() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) return;

        const tab = tabs[0];
        const url = (tab.url || "").toLowerCase();
        let currentPlatform = 'unknown';

        if (url.includes('linkedin.com')) {
            currentPlatform = 'linkedin';
        } else if (url.includes('xing.com')) {
            currentPlatform = 'xing';
        }

        const body = document.body;
        if (body) {
            body.classList.remove('platform-xing', 'platform-linkedin', 'platform-unknown');
            const config = platformConfig[currentPlatform];
            
            body.classList.add(config.class);
            body.style.setProperty('--platform-color', config.color);

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
    const oldNote = document.querySelector('.platform-notification');
    if (oldNote) oldNote.remove();

    const notification = document.createElement('div');
    notification.className = 'platform-notification';
    notification.innerHTML = `
        <div class="platform-badge" style="background: ${color};">
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


// ============================================================================
// FORM & DATA FILLING
// ============================================================================

export function fillProfileForm(data, type = 'candidate') {
    if (!data) return;
    
    // IDs je nach Typ
    const prefix = type === 'candidate' ? 'candidate' : 'contact';
    const nameInput = document.getElementById(`${prefix}_fullname`);
    const jobInput = document.getElementById(`${prefix}_jobtitle`);
    const imgDisplay = document.getElementById(`${prefix}_image_display`);
    const imgUrlHidden = document.getElementById(`${prefix}_image_url`);

    const rawName = data.profile?.name || data.fullName || "";
    const jobTitle = data.profile?.role || data.position || "";

    if(nameInput) nameInput.value = rawName;
    if(jobInput) jobInput.value = jobTitle;

    if (imgDisplay && data.profileImage) {
        imgDisplay.src = data.profileImage;
        imgDisplay.style.display = "block"; 
        if(imgUrlHidden) imgUrlHidden.value = data.profileImage; 
    } else if (imgDisplay) {
        imgDisplay.style.display = "none"; 
    }

    const statusDiv = document.getElementById("statusMessage");
    if(statusDiv) statusDiv.innerHTML = "✅ Profildaten übernommen.";
}

export function renderJobMatchResult(output) {
    const matchOutputText = document.getElementById("matchOutputText");
    const jobMatchResultContainer = document.getElementById("matchResult");
    const statusDiv = document.getElementById("statusMessage");

    let colorHex = "#666";
    let bgColor = "#f9f9f9";
    if (output.status_color === 'red') { colorHex = "#d93025"; bgColor = "#fff5f5"; }
    else if (output.status_color === 'green') { colorHex = "#188038"; bgColor = "#e6f4ea"; }
    else if (output.status_color === 'yellow') { colorHex = "#f29900"; bgColor = "#fff8e1"; }

    const safeText = (value, fallback = "-") => {
        const raw = String(value ?? "").trim();
        return raw ? escapeHtml(raw) : fallback;
    };

    const makeList = (arr) => {
        const items = Array.isArray(arr) && arr.length ? arr : ["-"];
        return items.map(i => `<li class="match-list-item">${safeText(i)}</li>`).join('');
    };

    // Wir nutzen hier Klassen statt Inline-Styles wo möglich, aber Farben kommen dynamisch vom Backend
    const htmlContent = `
        <div class="match-card" style="border-left: 5px solid ${colorHex};">
            <h3 style="color: ${colorHex};">${safeText(output.status_headline, "Analyse")}</h3>
            <div class="match-recommendation">
                Empfehlung: <span style="background:${bgColor}; color:${colorHex}">${safeText(output.recommendation)}</span>
            </div>
            <p class="match-summary">
                ${safeText(output.summary, "")}
            </p>
            <div class="match-details">
                <div class="match-pros">
                    <strong>✅ Pro:</strong>
                    <ul>${makeList(output.pro_arguments)}</ul>
                </div>
                <div class="match-cons">
                    <strong>❌ Contra:</strong>
                    <ul>${makeList(output.contra_arguments)}</ul>
                </div>
            </div>
        </div>`;

    if(matchOutputText) matchOutputText.innerHTML = htmlContent;
    if(jobMatchResultContainer) jobMatchResultContainer.classList.remove("hidden");
    if(statusDiv) statusDiv.innerText = "";
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

export function startCandidateProgress(label) {
    stopCandidateProgress();
    candidateProgressSeconds = 0;
    renderCandidateProgress(label);
    candidateProgressTimerId = setInterval(() => {
        candidateProgressSeconds += 1;
        renderCandidateProgress(label);
    }, 1000);
}

export function stopCandidateProgress() {
    if (candidateProgressTimerId) {
        clearInterval(candidateProgressTimerId);
        candidateProgressTimerId = null;
    }
    candidateProgressSeconds = 0;
    
    // WICHTIG: Zeile entfernt!
    // Wir leeren hier NICHT mehr das statusDiv, weil sonst 
    // unsere Error/Success-Nachrichten sofort wieder gelöscht werden!
}

function renderCandidateProgress(label) {
    const statusDiv = document.getElementById("statusMessage");
    if (!statusDiv) return;
    
    const elapsedHint = candidateProgressSeconds >= 55
        ? `Läuft seit ${candidateProgressSeconds}s. Antwort kann bis zu 60s dauern.`
        : `Läuft seit ${candidateProgressSeconds}s...`;

    statusDiv.innerHTML = `
        <div class="status-container">
            <div class="pulsing-text">${label}</div>
            <small class="candidate-progress-note">${elapsedHint}</small>
        </div>`;
}
export function setSaveCandidateLoadingState(isLoading, label) {
    const btn = document.getElementById("saveCandidateBtn");
    
    // Hole die Upload-Elemente
    const fileInput = document.getElementById("resume_upload");
    const removeFileBtn = document.getElementById("removeFileBtn");
    const dropArea = document.getElementById("drop-area");

    if (!btn) return;
    
    // 1. Speichern-Button blockieren (das hattest du schon)
    btn.classList.toggle("loading", isLoading);
    btn.disabled = !!isLoading;
    
    const spinner = btn.querySelector(".spinner");
    if (spinner) spinner.classList.toggle("hidden", !isLoading);
    
    const btnText = btn.querySelector(".btn-text");
    if (btnText) btnText.textContent = label;
    else btn.textContent = label;

    // 2. NEU: Upload-Bereich blockieren
    if (fileInput) fileInput.disabled = !!isLoading; // Verhindert Datei-Auswahl
    if (removeFileBtn) removeFileBtn.disabled = !!isLoading; // Deaktiviert das "X"
    
    if (dropArea) {
        if (isLoading) {
            dropArea.style.pointerEvents = "none"; // Blockiert alle Klicks und Drag & Drop!
            dropArea.style.opacity = "0.5";        // Macht den Bereich optisch grau/transparent
        } else {
            dropArea.style.pointerEvents = "auto"; // Gibt alles wieder frei
            dropArea.style.opacity = "1";          // Normale Sichtbarkeit
        }
    }
}

