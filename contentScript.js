// contentScript.js
if(window.hasRun) {

    throw new Error("Content Script already running");
}
window.hasRun = true;


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    
    // Wir müssen die Antwort "asynchron" machen, weil wir auf den Speicher warten
    // Deshalb packen wir alles in die Speicher-Abfrage:
    
    chrome.storage.local.get(['cachedRecruiter'], (result) => {
        
        // --- 1. Hilfsfunktionen ---
        const getText = (parent, selector) => {
            if (!parent) return null;
            const el = parent.querySelector(selector);
            return el ? el.innerText.trim() : null;
        };

        // --- 2. Daten-Struktur initialisieren ---
        const extractedData = {
            profile: { name: "", role: "", location: "" }, // Sven
            recruiter: { name: "", company: "", email: "" }, // Omar
            recruiterName:{name:""}, // Nur Name für einfache Nutzung
            experience: [],
            education: [],
            skills: [],
            languages: [],
            willingness_to_change: "",
            job_preferences: {}
        };

        // =========================================================
        // A. RECRUITER INFO (Intelligente Logik)
        // =========================================================

      const topBarProfile = document.querySelector('div[name][src*="profile-images"]');

      extractedData.recruiterName.name=topBarProfile.getAttribute("name") || "";

      console.log("Recruiter gefunden (Top Bar):", extractedData.recruiter.name);
    




        const menu = document.querySelector('[data-wry="Menu"]');
        
        if (menu) {
            // FALL 1: Menü ist OFFEN -> Wir lesen frisch aus und speichern es ab
            console.log("Menü offen - Lese und speichere Recruiter-Daten...");
            
            extractedData.recruiter.name = getText(menu, '[data-wry="Text"][size="3"]');
            
            const secondaryInfos = menu.querySelectorAll('[data-wry="Text"][color="secondaryText"]');
            if (secondaryInfos.length > 0) extractedData.recruiter.company = secondaryInfos[0].innerText;
            if (secondaryInfos.length > 1){
              const fixEmail=extractedData.recruiterName.name.toLowerCase().replaceAll(" ",".");
            } extractedData.recruiter.email = secondaryInfos[1].innerText || fixEmail + "@stolzberger.de";

            // Speichern für die Zukunft (Cache Update)
            chrome.storage.local.set({ cachedRecruiter: extractedData.recruiter });

        } else {
            // FALL 2: Menü ist ZU -> Wir nutzen das Gedächtnis (Cache)
            console.log("Menü geschlossen - Versuche Cache zu laden...");
            
            if (result.cachedRecruiter) {
                console.log("Cache gefunden!", result.cachedRecruiter);
                extractedData.recruiter = result.cachedRecruiter;
            } else {
                console.warn("Kein Cache und Menü zu. Bitte einmal Menü öffnen!");
                extractedData.recruiter.name = "Recruiter (Bitte Menü einmal öffnen)"; 
            }
        }

        // =========================================================
        // B. KANDIDATEN INFO (Sven) - Das ist immer da
        // =========================================================
        
        // 1. Kopfdaten
        const contactWidget = document.querySelector('[data-testid="contact-details-widget"]');
        if (contactWidget) {
            extractedData.profile.name = getText(contactWidget, 'b[data-wry="Text"][size="2"]');
            extractedData.profile.role = getText(contactWidget, 'b[data-wry="Text"][color="grey400"]');
            
            // Ort Suche (Verbesserter Selektor für das HTML von vorhin)
            const panels = contactWidget.closest('[data-wry="Panel"]').querySelectorAll('[data-wry="Text"][size="2"]');
            // Der Ort ist meistens das letzte Element in diesem Block (z.B. "Berlin,Deutschland")
            if(panels.length > 0) {
                 // Wir filtern Elemente aus, die Labels sind (wie "Geschäftliche Kontaktdaten")
                 const lastText = panels[panels.length - 1].innerText;
                 if(!lastText.includes("Kontaktdaten")) {
                     extractedData.profile.location = lastText;
                 }
            }
        }

        // 2. Berufserfahrung
        const expItems = document.querySelectorAll('[data-testid="professional-experience"]');
        expItems.forEach(item => {
            const title = getText(item, '[data-wry="Text"][size="2"]') || getText(item, 'div[class*="hRxjwK"]');
            const company = getText(item, '[data-wry="Text"].jlTEdn') || getText(item, 'div[class*="jlTEdn"]');
            const date = getText(item, '[color="secondaryText"]');
            extractedData.experience.push({ title, company, date });
        });

        // 3. Ausbildung
        const eduItems = document.querySelectorAll('[data-testid="education-background-item"]');
        eduItems.forEach(item => {
            extractedData.education.push({
                degree: getText(item, '[data-wry="Text"][class*="hRxjwK"]'),
                school: getText(item, '[data-wry="Text"][class*="jlTEdn"]')
            });
        });

        // 4. Skills
        const skillsWidget = document.querySelector('[data-testid="haves-widget"]');
        if (skillsWidget) {
            const skillEls = skillsWidget.querySelectorAll('[data-wry="Text"]');
            skillEls.forEach(el => extractedData.skills.push(el.innerText));
        }

        // 5. Sprachen
        const langWidget = document.querySelector('[data-testid="languages-widget"]');
        if (langWidget) {
            const langRows = langWidget.querySelectorAll('.sc-fjvvzt');
            langRows.forEach(row => {
                const texts = row.querySelectorAll('[data-wry="Text"]');
                if(texts.length >= 2) {
                    extractedData.languages.push(`${texts[0].innerText} (${texts[1].innerText.replace('- ', '')})`);
                } else if (texts.length === 1) {
                    extractedData.languages.push(texts[0].innerText);
                }
            });
        }

        // 6. Wechselmotivation & ProJobs (Rest wie gehabt)
        const motivationWidget = document.querySelector('[data-testid="profileWillingnessToChangeJobs"]');
        if (motivationWidget) {
            const panel = motivationWidget.closest('[data-wry="Panel"]');
            if (panel) {
                const text = getText(panel, '[color="grey800"]');
                const status = getText(panel, '[data-testid="seek-status-title"]');
                extractedData.willingness_to_change = `${status || ''} - ${text || ''}`;
            }
        }

        const proJobs = document.querySelector('[data-testid="job-seeker-projobs"]');
        if (proJobs) {
            const rows = proJobs.querySelectorAll('.sc-fopFza');
            rows.forEach(row => {
                const label = row.childNodes[0]?.textContent?.replace(':', '').trim();
                const valDiv = row.querySelector('[data-testid$="-value"]');
                if (label && valDiv) {
                    extractedData.job_preferences[label] = valDiv.innerText;
                }
            });
        }

        // --- ENDE: DATEN SENDEN ---
        console.log("Sende Daten zurück an Popup:", extractedData);
        sendResponse({ data: extractedData });

    }); // Ende storage.get

    return true; // WICHTIG: Signalisiert Chrome, dass sendResponse asynchron (später) kommt
  }
});