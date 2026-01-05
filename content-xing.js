if (!window.__xingScraperListenerRegistered) {
    window.__xingScraperListenerRegistered = true;
    console.log("🚀 XING Scraper Listener registriert.");

    // =========================================================
    // 1. iFRAME-LOGIK (DEFINITION)
    // =========================================================
    async function fetchXingSettingsContent() {
        return new Promise((resolve) => {
            const settingsUrl = "https://www.xing.com/recruiting-settings";
            const iframeId = "xing-settings-loader-" + Math.random().toString(36).slice(2);
            const iframe = document.createElement("iframe");
            iframe.id = iframeId;
            iframe.style.cssText = "position:absolute;width:1024px;height:1024px;top:-9999px;left:-9999px;visibility:hidden;";
            iframe.src = settingsUrl;
            document.body.appendChild(iframe);

            let attempts = 0;
            const maxAttempts = 40; 

            const interval = setInterval(() => {
                attempts++;
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!doc) return;

                    const emailInput = doc.querySelector('[data-testid="businessEmail"]');
                    const nameDiv = doc.querySelector('div[size="3"].index-es__Ro-sc-29676499-24');

                    if (emailInput || nameDiv || attempts >= maxAttempts) {
                        clearInterval(interval);
                        const extracted = (emailInput || nameDiv) ? {
                            email: emailInput?.value || "",
                            name: nameDiv?.innerText.trim() || ""
                        } : null;
                        iframe.remove();
                        resolve(extracted);
                    }
                } catch (e) {
                    console.error("iFrame Fehler:", e);
                }
            }, 200);
        });
    }

    // =========================================================
    // 2. HAUPT-LISTENER
    // =========================================================
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "scrape") {
            
            // Wir nutzen eine async Funktion, um "await" nutzen zu können
            (async () => {
                try {
                    // --- A. RECRUITER DATEN HOLEN (Priorität 1: iFrame) ---
                    console.log("⏳ Versuche Recruiter-Daten via iFrame zu laden...");
                    const recruiterFromIframe = await fetchXingSettingsContent();
                    
                    // Daten aus dem Cache laden (Priorität 2: Fallback)
                    const storage = await chrome.storage.local.get(['cachedRecruiter']);
                    const cachedRecruiter = storage.cachedRecruiter || {};

                    const extractedData = {
                        profile: { name: "", role: "", location: "" },
                        recruiter: { 
                            name: recruiterFromIframe?.name || cachedRecruiter.name || "Recruiter",
                            email: recruiterFromIframe?.email || cachedRecruiter.email || "",
                            company: cachedRecruiter.company || "" 
                        },
                        experience: [],
                        education: [],
                        skills: [],
                        languages: [],
                        willingness_to_change: "",
                        job_preferences: {},
                        interessen:[]
                    };

                    // Cache aktualisieren, wenn neue Daten gefunden wurden
                    if (recruiterFromIframe) {
                        chrome.storage.local.set({ cachedRecruiter: extractedData.recruiter });
                    }

                    // --- B. KANDIDATEN DATEN (Priorität 3: Aktuelle Seite) ---
                    const getText = (parent, selector) => {
                        const el = parent ? parent.querySelector(selector) : null;
                        return el ? el.innerText.trim() : "";
                    };

                    // Kopfdaten
                    const contactWidget = document.querySelector('[data-testid="contact-details-widget"]');
                    if (contactWidget) {
                        extractedData.profile.name = getText(contactWidget, 'b[data-wry="Text"][size="2"]');
                        extractedData.profile.role = getText(contactWidget, 'b[data-wry="Text"][color="grey400"]');
                        const panels = contactWidget.closest('[data-wry="Panel"]')?.querySelectorAll('[data-wry="Text"][size="2"]');
                        if(panels && panels.length > 0) {
                            const lastText = panels[panels.length - 1].innerText;
                            if(!lastText.includes("Kontaktdaten")) extractedData.profile.location = lastText;
                        }
                    }

                    // Berufserfahrung
                    document.querySelectorAll('[data-testid="professional-experience"]').forEach(item => {
                        extractedData.experience.push({
                            title: getText(item, '[data-wry="Text"][size="2"]') || getText(item, 'div[class*="hRxjwK"]'),
                            company: getText(item, '[data-wry="Text"].jlTEdn') || getText(item, 'div[class*="jlTEdn"]'),
                            date: getText(item, '[color="secondaryText"]')
                        });
                    });

                    // Skills
                    const skillsWidget = document.querySelector('[data-testid="haves-widget"]');
                    if (skillsWidget) {
                        skillsWidget.querySelectorAll('[data-wry="Text"]').forEach(el => extractedData.skills.push(el.innerText));
                    }

                    // Sprachen
                    const langWidget = document.querySelector('[data-testid="languages-widget"]');
                    if (langWidget) {
                        langWidget.querySelectorAll('.sc-fjvvzt').forEach(row => {
                            const texts = row.querySelectorAll('[data-wry="Text"]');
                            if(texts.length >= 1) extractedData.languages.push(texts[0].innerText);
                        });
                    }

                      // Interessen
                    // 1. Find all text elements and filter for the specific "Interessen" header
                        const textNodes = Array.from(document.querySelectorAll('[data-wry="Text"]'));
                        const interessenHeader = textNodes.find(el => el.innerText.trim() === 'Interessen');

                        if (interessenHeader) {
                            // 2. Navigate up to the main container (the Panel)
                            const panel = interessenHeader.closest('[data-wry="Panel"]');

                            if (panel) {
                                // 3. Find the container that holds the text. 
                                // Based on the image, the panel has two main children: the header and the content.
                                // We select the last main child (the content wrapper).
                                const contentWrapper = panel.lastElementChild;

                                if (contentWrapper) {
                                    // The actual text is inside a nested div within this wrapper.
                                    // We can grab all text from this wrapper to be safe.
                                    const rawText = contentWrapper.innerText; 
                                    // This will equal: "IT,Sport / Football / Fußball,Webdesign,Politik..."

                                    if (rawText) {
                                        // 4. Split the single string by commas into an array and trim whitespace
                                        const interestsArray = rawText.split(',').map(text => text.trim());

                                        // 5. Push the results into your extractedData object
                                        // We verify that 'extractedData' and 'extractedData.interessen' exist first
                                        if (typeof extractedData !== 'undefined') {
                                            if (!extractedData.interessen) extractedData.interessen = [];
                                            extractedData.interessen.push(...interestsArray);
                                        } else {
                                            console.log("Found Interests:", interestsArray);
                                        }
                                    }
                                }
                            }
                        }
                    // Wechselmotivation
                    const motivationWidget = document.querySelector('[data-testid="profileWillingnessToChangeJobs"]');
                    if (motivationWidget) {
                        const panel = motivationWidget.closest('[data-wry="Panel"]');
                        const status = getText(panel, '[data-testid="seek-status-title"]');
                        extractedData.willingness_to_change = status;
                    }

                    console.log("✅ Daten gesendet:", extractedData);
                    sendResponse({ data: extractedData });

                } catch (error) {
                    console.error("Scrape-Fehler:", error);
                    sendResponse({ status: "error", message: error.message });
                }
            })();

            return true; // Hält den Kanal für sendResponse offen
        }
    });
}