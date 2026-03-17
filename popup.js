import { COOLDOWN_SECONDS } from './modules/config.js';
import { 
    getRecruiterData, 
    saveRecruiterName, 
    checkCooldown, 
    startCooldown 
} from './modules/storage.js';
import { 
    state, 
    setCachedProfileData, 
    setCurrentContactPayload 
} from './modules/state.js';
import { 
    scrapeCurrentTab 
} from './modules/scraper.js';
import { 
    sendJobMatchingRequest, 
    sendPayloadToN8n, 
    sendToN8nWebhook 
} from './modules/api.js';
import { 
    applyPlatformStyles, 
    switchView, 
    showError, 
    fillProfileForm, 
    renderJobMatchResult, 
    startCandidateProgress, 
    stopCandidateProgress, 
    setSaveCandidateLoadingState,
    showSuccess
} from './modules/ui.js';
import { 
    getNameParts, 
    getBase64, 
    copyToClipboard 
} from './modules/utils.js';

document.addEventListener('DOMContentLoaded', () => {

    // Styles & Initialisierung
    applyPlatformStyles();
    
    if (chrome.tabs && chrome.tabs.onActivated) {
        chrome.tabs.onActivated.addListener(applyPlatformStyles);
        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (changeInfo.status === 'complete') applyPlatformStyles();
        });
    }

    // --- DOM ELEMENTS ---
    const elements = {
        viewMenu: document.getElementById("view-menu"),
        recruiterNameContainer: document.getElementById("recruiter-name-container"),
        recruiterNameInput: document.getElementById("user_name_input"),
        btnSaveName: document.getElementById("saveUserNameBtn"),
        settingsNameInput: document.getElementById("settings_name_input"),
        btnSaveSettingsName: document.getElementById("saveSettingsNameBtn"),
        generatorBtn: document.getElementById("nav-to-generator"),
        matchingBtn: document.getElementById("nav-to-job-matching"),
        statusDiv: document.getElementById("statusMessage"),
        
        // Buttons Navigation
        btnToGen: document.getElementById("nav-to-generator"),
        btnToMatch: document.getElementById("nav-to-job-matching"),
        btnBackMatch: document.getElementById("backFromJobMatching"),
        btnBackGen: document.getElementById("backFromNachrichtGenerator"),
        btnSettings: document.getElementById("settings-btn"),
        btnBackSettings: document.getElementById("backFromSettings"),
        btnBackKandidat: document.getElementById("backFromSection-kandidat"),
        btnBackKontakt: document.getElementById("backFromSection-kontakt"),
        btnTabKandidat: document.getElementById("tab-kandidat"),
        btnTabKontakt: document.getElementById("tab-kontakt"),

        // Generator
        scrapeBtn: document.getElementById("scrapeBtn"),
        recreateBtn: document.getElementById("recreateBtn"),
        recreateContainer: document.getElementById("recreateContainer"),
        userPromptInput: document.getElementById("userPrompt"),
        resultContainer: document.getElementById("resultContainer"),
        outputSubject: document.getElementById("outputSubject"),
        outputMessage: document.getElementById("outputMessage"),
        tonalitySelect: document.getElementById("tonalität"),
        lengthSelect: document.getElementById("msgLength"),
        copySubjectBtn: document.getElementById("copySubject"),
        copyMessageBtn: document.getElementById("copyMessage"),

        // Job Matching
        jobIdInput: document.getElementById("job_id_input"),
        btnFetchJobMatchBtn: document.getElementById("fetchJobMatchBtn"),
        jobMatchResultContainer: document.getElementById("matchResult"),

        // Candidate / Contact
        sectionKandidat: document.getElementById("section-kandidat"),
        sectionKontakt: document.getElementById("section-kontakt"),
        saveCandidateBtn: document.getElementById("saveCandidateBtn"),
        btnSaveContact: document.getElementById("saveContactBtn"),
        fileInput: document.getElementById("resume_upload"),
        removeFileBtn: document.getElementById("removeFileBtn"),
        fileNameDisplay: document.getElementById("file-name-display"),
        fileInfoContainer: document.getElementById("file-info-container"),
        dropArea: document.getElementById("drop-area"),
        
        // Inputs
        candidateFullname: document.getElementById("candidate_fullname"),
        candidateJobtitle: document.getElementById("candidate_jobtitle"),
        candidateImageUrl: document.getElementById("candidate_image_url"),
        contactFullname: document.getElementById("contact_fullname"),
        contactJobtitle: document.getElementById("contact_jobtitle")
    };

    // --- INITIALISIERUNG ---
    checkCooldown(COOLDOWN_SECONDS, (endTime) => {
        activateCooldownMode(endTime);
    });

    // Recruiter Data Check
    getRecruiterData().then(({ rName }) => {
        if (elements.recruiterNameInput) elements.recruiterNameInput.value = rName;
        if (elements.settingsNameInput) elements.settingsNameInput.value = rName;

        if (!rName || rName.trim() === "") {
            elements.generatorBtn.classList.add("hidden");
            elements.matchingBtn.classList.add("hidden");
            elements.recruiterNameContainer.classList.remove("hidden");
        }
    });

    // --- EVENT LISTENERS: NAME SAVING ---
    const handleSaveName = (name) => {
        if (!name) {
            elements.statusDiv.innerHTML = `<span style="color:red;">⚠️ Bitte Namen eingeben!</span>`;
            return;
        }
        saveRecruiterName(name).then(() => {
            elements.recruiterNameContainer.classList.add("hidden");
            elements.generatorBtn.classList.remove("hidden");
            elements.matchingBtn.classList.remove("hidden");
            if(elements.recruiterNameInput) elements.recruiterNameInput.value = name;
            if(elements.settingsNameInput) elements.settingsNameInput.value = name;
            elements.statusDiv.innerHTML = `<span style="color:green;">✅ Name gespeichert!</span>`;
            setTimeout(() => { elements.statusDiv.innerText = ""; }, 3000);
        });
    };

    if (elements.btnSaveName) {
        elements.btnSaveName.addEventListener("click", () => handleSaveName(elements.recruiterNameInput.value.trim()));
    }
    if (elements.btnSaveSettingsName) {
        elements.btnSaveSettingsName.addEventListener("click", () => {
            handleSaveName(elements.settingsNameInput.value.trim());
            switchView(elements.viewMenu);
        });
    }

    // --- EVENT LISTENERS: NAVIGATION ---
    if (elements.btnToGen) elements.btnToGen.addEventListener("click", () => switchView('view-generator'));
    if (elements.btnToMatch) elements.btnToMatch.addEventListener("click", () => switchView('job-matching-container'));
    if (elements.btnSettings) elements.btnSettings.addEventListener("click", () => switchView('view-settings'));
    
    [elements.btnBackMatch, elements.btnBackGen, elements.btnBackSettings, elements.btnBackKandidat, elements.btnBackKontakt].forEach(btn => {
        if (btn) btn.addEventListener("click", () => switchView(elements.viewMenu));
    });

    // --- EVENT LISTENERS: JOB MATCHING ---
    if (elements.btnFetchJobMatchBtn) {
        elements.btnFetchJobMatchBtn.addEventListener("click", async () => {
            const jobId = elements.jobIdInput ? elements.jobIdInput.value.trim() : "";
            
            if (!jobId || !/^\d+$/.test(jobId)) {
                showError("Bitte eine gültige Job-ID (nur Zahlen) eingeben.");
                return;
            }

            try {
                const { data, source } = await scrapeCurrentTab('message');
                startCooldownWithUI();
                
                elements.statusDiv.innerText = "⏳ Starte Matching...";
                elements.jobMatchResultContainer.classList.add("hidden");
                const spinner = elements.btnFetchJobMatchBtn.querySelector(".spinner");
                if (spinner) spinner.classList.remove("hidden");

                const payload = {
                    mode: "job_matching",
                    job_id: jobId,
                    text: data,
                    timestamp: new Date().toISOString(),
                    source: source
                };

                const result = await sendJobMatchingRequest(payload);
                renderJobMatchResult(result);
                showSuccess("Kandidat erfolgreich angelegt!"); // <-- NEU

            } catch (err) {
                showError(err.message);
            } finally {
                const spinner = elements.btnFetchJobMatchBtn.querySelector(".spinner");
                if (spinner) spinner.classList.add("hidden");
            }
        });
    }

    // --- EVENT LISTENERS: GENERATOR ---
    if (elements.scrapeBtn) {
        elements.scrapeBtn.addEventListener("click", async () => {
             // Validierung Job-ID (falls input existiert, hier nicht explizit in elements map, nehme an es ist nicht da oder optional)
             // Im original Code gab es jobIdInputMessage, aber im HTML sehe ich es nicht in view-generator. 
             // Ignoriere JobID für Generator falls nicht im HTML.

            try {
                const { rName, rEmail } = await getRecruiterData();
                const { data, source } = await scrapeCurrentTab('message');
                setCachedProfileData(data);
                startCooldownWithUI();

                elements.statusDiv.innerText = "✍️ Erstelle Nachricht...";
                elements.resultContainer.classList.add("hidden");
                elements.recreateContainer.classList.add("hidden");
                const spinner = elements.scrapeBtn.querySelector(".spinner");
                if (spinner) spinner.classList.remove("hidden");

                const payload = {
                    mode: "create",
                    text: data,
                    prompt: elements.userPromptInput.value.trim(),
                    tonality: elements.tonalitySelect.value,
                    length: elements.lengthSelect.value,
                    timestamp: new Date().toISOString(),
                    name: rName,
                    email: rEmail,
                    source: source
                };

                const result = await sendPayloadToN8n(payload);
                elements.outputSubject.value = result.betreff || result.subject || "";
                elements.outputMessage.value = result.message || result.nachricht || "";
                elements.resultContainer.classList.remove("hidden");
                elements.recreateContainer.classList.remove("hidden");
                elements.statusDiv.innerText = "";

            } catch (err) {
                showError(err.message);
            } finally {
                const spinner = elements.scrapeBtn.querySelector(".spinner");
                if (spinner) spinner.classList.add("hidden");
            }
        });
    }

    if (elements.recreateBtn) {
        elements.recreateBtn.addEventListener("click", async () => {
            try {
                const { rName, rEmail } = await getRecruiterData();
                
                // Nutze gecachte Daten oder scrape neu
                let data = state.cachedProfileData;
                let source = "linkedin"; // default fallback
                if (!data) {
                    const scrapeResult = await scrapeCurrentTab('message');
                    data = scrapeResult.data;
                    source = scrapeResult.source;
                    setCachedProfileData(data);
                }

                startCooldownWithUI();
                elements.statusDiv.innerText = "✨ Verfeinere Nachricht...";
                const spinner = elements.recreateBtn.querySelector(".spinner");
                if (spinner) spinner.classList.remove("hidden");

                const payload = {
                    mode: "rewrite",
                    text: data,
                    oldSubject: elements.outputSubject.value,
                    oldMessage: elements.outputMessage.value,
                    prompt: elements.userPromptInput.value.trim(),
                    tonality: elements.tonalitySelect.value,
                    length: elements.lengthSelect.value,
                    timestamp: new Date().toISOString(),
                    name: rName,
                    email: rEmail,
                    source: source // Sollte dynamisch sein, hier vereinfacht
                };

                const result = await sendPayloadToN8n(payload);
                elements.outputSubject.value = result.betreff || result.subject || "";
                elements.outputMessage.value = result.message || result.nachricht || "";
                elements.statusDiv.innerText = "";

            } catch (err) {
                showError(err.message);
            } finally {
                const spinner = elements.recreateBtn.querySelector(".spinner");
                if (spinner) spinner.classList.add("hidden");
            }
        });
    }

    // --- EVENT LISTENERS: CANDIDATE / CONTACT ---
    
    // Tab Switching & Scraping Logic
    const handleProfileScrape = async (type) => {
        const isCandidate = type === 'candidate';
        const targetView = isCandidate ? elements.sectionKandidat : elements.sectionKontakt;
        
        switchView(targetView);
        elements.statusDiv.innerText = "🔍 Scrape Profil & prüfe Duplikate...";
        
        // Reset specific buttons
        if (!isCandidate && elements.btnSaveContact) {
            elements.btnSaveContact.disabled = true;
            elements.btnSaveContact.style.opacity = "0.5";
            elements.btnSaveContact.dataset.ready = "0";
        }

        try {
            const { data, source, url } = await scrapeCurrentTab('profile');
            fillProfileForm(data, type);
            adjustCandidateUIForPlatform(source); // Helper below

            const { rName, rEmail } = await getRecruiterData();
            const rawName = data.profile?.name || data.fullName || "";
            const { firstName, lastName } = getNameParts(rawName);
            const jobTitle = data.profile?.role || data.position || "";

            const payload = {
                mode: "check kontakten / kandidaten",
                item: isCandidate ? "kandidate" : "kontakten",
                mode_create: "create_kontakt_candidate",
                firstName,
                lastName,
                jobTitle,
                profileImage: data.profileImage || "",
                recruiter_name: rName || "Unbekannt",
                recruiter_email: rEmail || "Keine Email",
                profileUrl: data.url || url,
                source: source
            };

            setCurrentContactPayload(payload);
            await checkDuplicateInN8n(payload, type);

        } catch (err) {
            showError(err.message);
        }
    };

    if (elements.btnTabKandidat) {
        elements.btnTabKandidat.addEventListener("click", () => handleProfileScrape('candidate'));
    }
    if (elements.btnTabKontakt) {
        elements.btnTabKontakt.addEventListener("click", () => handleProfileScrape('contact'));
    }
// SAVE CANDIDATE
    if (elements.saveCandidateBtn) {
        elements.saveCandidateBtn.addEventListener("click", async () => {
            if (elements.saveCandidateBtn.dataset.busy === "1") return;

            try {
                const { data, source, url } = await scrapeCurrentTab('profile');
                let fileBase64 = null;
                let fileName = null;

                // LinkedIn PDF Check
                if (source === 'linkedin') {
                    const file = elements.fileInput.files[0];
                    if (!file) {
                        showError("Bitte PDF für LinkedIn auswählen.");
                        return;
                    }
                    fileName = file.name;
                    fileBase64 = await getBase64(file);
                }

                setSaveCandidateLoadingState(true, "Sende an Vincere...");
                startCandidateProgress("Sende Daten...");
                elements.saveCandidateBtn.dataset.busy = "1";

                const { rName, rEmail } = await getRecruiterData();
                const rawName = elements.candidateFullname.value || data.profile?.name || data.fullName || "";
                const { firstName, lastName } = getNameParts(rawName);
                
                const payload = {
                    mode: "save kontakten / kandidaten",
                    item: "kandidate",
                    mode_create: "create_kontakt_candidate",
                    source: source,
                    firstName,
                    lastName,
                    jobTitle: elements.candidateJobtitle.value || "",
                    profileImage: elements.candidateImageUrl.value || "",
                    recruiter_name: rName,
                    recruiter_email: rEmail,
                    profileUrl: url,
                    data: data,
                    ...(fileBase64 && { fileName, fileData: fileBase64 })
                };

                const result = await sendToN8nWebhook(payload);
                if (result) {
                    // Erfolg anzeigen
                    showSuccess("Kandidat erfolgreich angelegt!");
                    setTimeout(() => switchView(elements.viewMenu), 3000);
                }

            } catch (err) {
                // Fehler anzeigen
                showError(err.message);
            } finally {
                // Hier greift nun unser gefixtes stopCandidateProgress ohne die Nachricht zu löschen!
                stopCandidateProgress();
                setSaveCandidateLoadingState(false, "Kandidat anlegen ➕");
                elements.saveCandidateBtn.dataset.busy = "0";
            }
        });
    }

    // SAVE CONTACT
    if (elements.btnSaveContact) {
        elements.btnSaveContact.addEventListener("click", async () => {
            if (elements.btnSaveContact.dataset.ready !== "1") return;
            
            const payload = state.currentContactPayload;
            if (!payload) return;

            elements.btnSaveContact.textContent = "Speichere...";
            elements.statusDiv.innerText = "⏳ Speichere...";
            
            try {
                await sendToN8nWebhook({ ...payload, mode: "save kontakten / kandidaten" });
                showSuccess("Kontakt erfolgreich angelegt!"); // <-- NEU

                
                setTimeout(() => switchView(elements.viewMenu), 3000);
            } catch (err) {
                showError(err.message);
            }
        });
    }


    // --- HELPERS ---

    function startCooldownWithUI() {
        startCooldown(COOLDOWN_SECONDS, activateCooldownMode);
    }

    function activateCooldownMode(endTime) {
        const buttons = [elements.scrapeBtn, elements.recreateBtn, elements.btnFetchJobMatchBtn];
        buttons.forEach(b => { if(b) b.disabled = true; });
        
        const interval = setInterval(() => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(interval);
                buttons.forEach(b => { if(b) b.disabled = false; });
                // Reset texts (simplified)
                if (elements.scrapeBtn) elements.scrapeBtn.innerText = "Erstellen 🚀";
                if (elements.btnFetchJobMatchBtn) elements.btnFetchJobMatchBtn.innerText = "Job Matching abrufen 🚀";
            } else {
                 // Update texts
                 buttons.forEach(b => { 
                     if(b) {
                         const span = b.querySelector(".btn-text") || b;
                         if (span === b) b.innerText = `Warten: ${remaining}s`; // Fallback simple button
                         else span.innerText = `Warten: ${remaining}s`;
                     }
                 });
            }
        }, 1000);
    }

    async function checkDuplicateInN8n(payload, type) {
        const result = await sendToN8nWebhook(payload);
        const check = Array.isArray(result) ? result[0] : result;
        
        const isEmpty = check.is_empty === true || check.is_empty === "true" || check.is_empty === 1;
        const typeName = type === 'candidate' ? "Kandidat" : "Kontakt";

        if (isEmpty) {
            elements.statusDiv.innerHTML = `<span style='color:green;'>✅ ${typeName} ist neu.</span>`;
            showFormArea(type, payload.source);
        } else {
            elements.statusDiv.innerHTML = `
            <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:8px; border:1px solid #ffeeba; margin-top:10px;">
                <strong>⚠️ ${typeName} existiert bereits!</strong><br> Trotzdem anlegen?
                <div style="margin-top:8px; display:flex; gap:10px; justify-content:center;">
                    <button id="btn-force-save" class="secondary-btn" style="padding:4px 10px; background:#d9534f; color:white; border:none;">Ja</button>
                    <button id="btn-cancel-save" class="secondary-btn" style="padding:4px 10px; border:none;">Nein</button>
                </div>
            </div>`;
            
            document.getElementById("btn-force-save")?.addEventListener("click", () => {
                elements.statusDiv.innerHTML = ""; // Clear warning
                showFormArea(type, payload.source);
            });
            document.getElementById("btn-cancel-save")?.addEventListener("click", () => switchView(elements.viewMenu));
        }
    }
function showFormArea(type, source) {
        if (type === 'candidate') {
            const saveBtn = document.getElementById("saveCandidateBtn");
            const saveCard = document.getElementById("save-candidate-card"); 
            const xingArea = document.getElementById("candidate-form-area"); // Für XING
            const linkedinArea = document.getElementById("linkedin-form-area"); // Für LinkedIn
            const dropArea = document.getElementById("drop-area");
            
            // Buttons und Card immer einblenden
            if (saveBtn) saveBtn.classList.remove("hidden");
            if (saveCard) saveCard.classList.remove("hidden");

            // Strikt nach Source (Plattform) trennen:
            if (source === 'linkedin') {
                if (xingArea) xingArea.classList.add("hidden"); // Verstecke XING Felder
                if (linkedinArea) linkedinArea.classList.remove("hidden"); // Zeige LinkedIn Upload
                if (dropArea) dropArea.classList.remove("hidden");
            } else {
                // Annahme: Alles andere (wie 'xing') zeigt das normale Formular
                if (linkedinArea) linkedinArea.classList.add("hidden"); // Verstecke LinkedIn Upload
                if (dropArea) dropArea.classList.add("hidden");
                if (xingArea) xingArea.classList.remove("hidden"); // Zeige XING Felder
            }
        } else {
            document.getElementById("contact-form-area")?.classList.remove("hidden");
            if (elements.btnSaveContact) {
                elements.btnSaveContact.disabled = false;
                elements.btnSaveContact.style.opacity = "1";
                elements.btnSaveContact.dataset.ready = "1";
            }
        }
    }

    function adjustCandidateUIForPlatform(source) {
        const xingArea = document.getElementById("candidate-form-area");
        const linkedinArea = document.getElementById("linkedin-form-area");
        const dropArea = document.getElementById("drop-area");
        const saveBtn = document.getElementById("saveCandidateBtn");

        if (source === 'xing') {
            if (linkedinArea) linkedinArea.classList.add("hidden");
            if (dropArea) dropArea.classList.add("hidden");
            if (saveBtn) {
                const txt = saveBtn.querySelector(".btn-text");
                if (txt) txt.innerText = "XING Profil scrapen & anlegen ➕";
            }
        } else if (source === 'linkedin') {
             if (xingArea) xingArea.classList.add("hidden"); 
            if (saveBtn) {
                const txt = saveBtn.querySelector(".btn-text");
                if (txt) txt.innerText = "Kandidat anlegen ➕";
            }
        }
    }

    // File Input Logic
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                elements.fileNameDisplay.textContent = "📄 " + file.name;
                elements.fileInfoContainer.classList.remove('hidden');
                elements.fileInfoContainer.style.display = "flex";
                elements.saveCandidateBtn.classList.remove('hidden');
                elements.dropArea.style.borderColor = "#28a745";
                elements.dropArea.style.backgroundColor = "#f6fff8";
                elements.saveCandidateBtn.classList.remove('hidden');
            document.getElementById("save-candidate-card")?.classList.remove('hidden'); // Unhide the parent card!
        
            }
        });
    }
    if (elements.removeFileBtn) {
        elements.removeFileBtn.addEventListener("click", (e) => {
            e.preventDefault();
            elements.fileInput.value = "";
            elements.fileInfoContainer.classList.add("hidden");
            elements.dropArea.style.borderColor = "";
            elements.dropArea.style.backgroundColor = "";
        });
    }
    // --- DRAG & DROP LOGIC ---
    if (elements.dropArea && elements.fileInput) {
        
        // 1. Standard-Verhalten des Browsers unterdrücken (wichtig!)
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // 2. Visuelles Feedback beim Drüberziehen (Hover-Effekt)
        ['dragenter', 'dragover'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, () => {
                elements.dropArea.style.borderColor = "var(--platform-primary, #026466)";
                elements.dropArea.style.backgroundColor = "rgba(2, 100, 102, 0.1)"; // Leicht eingefärbt
            }, false);
        });

        // 3. Visuelles Feedback zurücksetzen, wenn die Maus den Bereich verlässt
        ['dragleave', 'drop'].forEach(eventName => {
            elements.dropArea.addEventListener(eventName, () => {
                elements.dropArea.style.borderColor = "";
                elements.dropArea.style.backgroundColor = "";
            }, false);
        });

        // 4. Die fallengelassene Datei greifen und ins Input-Feld schieben
        elements.dropArea.addEventListener('drop', (e) => {
            let dt = e.dataTransfer;
            let files = dt.files;

            if (files && files.length > 0) {
                // Die Dateien manuell an das unsichtbare Input-Feld übergeben
                elements.fileInput.files = files;
                
                // WICHTIG: Den "change" Event manuell auslösen, 
                // damit deine bestehende File Input Logic (unten) anspringt!
                const event = new Event('change', { bubbles: true });
                elements.fileInput.dispatchEvent(event);
            }
        }, false);
    }



    // Copy Buttons
    if(elements.copySubjectBtn) elements.copySubjectBtn.addEventListener("click", () => copyToClipboard(elements.outputSubject.value, elements.copySubjectBtn));
    if(elements.copyMessageBtn) elements.copyMessageBtn.addEventListener("click", () => copyToClipboard(elements.outputMessage.value, elements.copyMessageBtn));

});
