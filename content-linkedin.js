// content-linkedin.js
// VERSION: FINAL DIAMOND V3 (Multi-Role Precision + Skills + Description)

if (!window.__linkedinScraperListenerRegistered) {
    window.__linkedinScraperListenerRegistered = true;
    console.log("🚀 LinkedIn Recruiter Scraper (Diamond V3) registriert.");

    // =========================================================
    // 1. HELPER FUNKTIONEN
    // =========================================================
    
    function cleanText(text) {
        return text ? text.replace(/[\n\r]+/g, " ").replace(/\s{2,}/g, " ").trim() : "";
    }

    function safeText(selector, parent = document) {
        try {
            const el = parent.querySelector(selector);
            return el ? cleanText(el.innerText) : "";
        } catch (e) { return ""; }
    }

    function safeTextAll(selector, parent = document) {
        try {
            return Array.from(parent.querySelectorAll(selector))
                .map(el => cleanText(el.innerText))
                .filter(t => t.length > 0);
        } catch (e) { return []; }
    }

    const randomWait = (min, max) => {
        const delay = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, delay));
    };

    // =========================================================
    // 2. EXPANDER LOGIK
    // =========================================================


    async function expandSections() {
        console.log("🐢 Starte Expandierung (Langsam & Sicher)...");

        // 1. Container finden (WICHTIG: Damit der Hintergrund nicht springt)
        const profileContainer = document.querySelector('.profile__main-container') || 
                                 document.querySelector('#profile-container') || 
                                 document.body;

        if (!profileContainer) {
            console.log("⚠️ Kein Profil-Container gefunden.");
            return;
        }

        // --- A. LISTEN & DETAILS ---
        const listSelectors = [
            'button[aria-label*="Weitere Zertifikate anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Weitere Positionen mit Berufserfahrung anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Details anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Berufserfahrung anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Ausbildung anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Sprachen anzeigen"][aria-expanded="false"]',
            'button.expandable-list__button[aria-expanded="false"]',
            'button[id*="expand-more-lower-button"][aria-expanded="false"]',
            'button[data-test-decorated-line-clamp-see-more-button][aria-expanded="false"]'
        ];

        // Nur Buttons im Container suchen
        const listButtons = profileContainer.querySelectorAll(listSelectors.join(', '));

        if (listButtons.length > 0) {
            for (const btn of listButtons) {
                if (btn.offsetParent !== null) {
                    
                    const label = (btn.getAttribute("aria-label") || btn.innerText || "").toLowerCase();
                    const id = (btn.id || "").toLowerCase();
                    const visibleText = btn.innerText.toLowerCase();

                    // Filter
                    if (id.includes("expand-less") || label.includes("weniger") || label.includes("less")) continue; 
                    if (label.includes("kenntnisse") || label.includes("skills")) continue; 
                    if (label.includes("interessen") || label.includes("interests")) continue;
                    if (label.includes("details anzeigen") || visibleText.includes("details anzeigen")) continue;

                    const container = btn.closest('.expandable-list');
                    if (container) {
                        const title = container.querySelector('[data-test-expandable-list-title]');
                        if (title && title.innerText.toLowerCase().includes("interessen")) continue;
                    }

                    try {
                        // 1. SANFT SCROLLEN
                        // 'smooth' macht es weich, 'nearest' verhindert große Sprünge
                        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        
                        // 2. LÄNGER WARTEN (Damit das Scrollen fertig ist vor dem Klick)
                        await randomWait(600, 900); 
                        
                        // 3. KLICKEN
                        btn.click();
                        
                        // 4. WARTEN (Damit der Inhalt nachlädt)
                        await randomWait(800, 1500); 

                        // --- ZWEITE RUNDE (Falls nötig) ---
                        if (label.includes("zertifikate")) {
                            const certBtnRound2 = profileContainer.querySelector('button[aria-label*="Weitere Zertifikate anzeigen"][aria-expanded="false"]');
                            if (certBtnRound2) {
                                certBtnRound2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                await randomWait(500, 800);
                                certBtnRound2.click();
                                await randomWait(800, 1200);
                            }
                        }

                        if (label.includes("berufserfahrung") || label.includes("experience")) {
                            const expBtnRound2 = profileContainer.querySelector('button[aria-label*="Weitere Positionen mit Berufserfahrung anzeigen"][aria-expanded="false"]');
                            if (expBtnRound2) {
                                expBtnRound2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                await randomWait(500, 800);
                                expBtnRound2.click();
                                await randomWait(800, 1200);
                            }
                        }

                    } catch(e) { console.log("Klick-Fehler:", e); }
                }
            }
        }

        // --- B. ZUSAMMENFASSUNG ---
        const summaryButtons = profileContainer.querySelectorAll(
            '.inline-show-more-text__button, [aria-label*="Zusammenfassung"] button, #line-clamp-show-more-button'
        );
        for (const btn of summaryButtons) {
            try { 
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                await randomWait(300, 500); // Kurze Pause
                btn.click(); 
                await randomWait(200, 400); 
            } catch(e) {}
        }

        // --- RESET ---
        console.log("✅ Fertig. Scrolle sanft nach oben...");
        if (profileContainer.scrollTo) {
            profileContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            profileContainer.scrollTop = 0;
        }
        await randomWait(500, 1000); 
    }

    // =========================================================
    // 3. HAUPT-SCRAPER LOGIK
    // =========================================================
    async function scrapeProfile() {
        await expandSections();

        // Header
        const name =  safeText(".artdeco-entity-lockup__title.ember-view");
        const headline = safeText("[data-test-row-lockup-headline]") || safeText(".artdeco-entity-lockup__subtitle");
        const location = safeText("[data-test-row-lockup-location]") || safeText(".artdeco-entity-lockup__metadata div:first-child");

        // Zusammenfassung
        const summary = safeText(".lt-line-clamp__raw-line") || safeText(".inline-show-more-text");

        // Skills (Top Level)
        let skills = safeTextAll(".skill-entity__skill-name");
        if (skills.length === 0) skills = safeTextAll(".summary-card__top-skills-skill-name");
        if (skills.length === 0) skills = safeTextAll(".pv-skill-category-entity__name span");
        skills = [...new Set(skills)];

        // --- JOB PRÄFERENZEN ---
        let jobPreferences = {
            roles: [],
            locations: [],
            workModels: [],
            workTypes: [],
            startDate: ""
        };
        const openCandidateContainer = document.querySelector("[data-test-open-candidate]");
        if (openCandidateContainer) {
            const roleHeader = openCandidateContainer.querySelector("[data-test-open-candidate-title]");
            if (roleHeader && roleHeader.nextElementSibling) {
                jobPreferences.roles = safeTextAll("li", roleHeader.nextElementSibling);
            }
            let locs = [];
            const remoteDiv = openCandidateContainer.querySelector("[data-test-open-candidate-remote-locations]");
            if (remoteDiv) safeTextAll("li", remoteDiv).forEach(l => locs.push(`${l} (Remote)`));
            
            const onSiteDiv = openCandidateContainer.querySelector("[data-test-open-candidate-on-site-locations]");
            if (onSiteDiv) safeTextAll("li", onSiteDiv).forEach(l => locs.push(`${l} (Vor Ort)`));
            
            if (locs.length === 0) locs = safeTextAll("[data-test-open-candidate-location]", openCandidateContainer);
            jobPreferences.locations = locs;

            jobPreferences.workTypes = safeTextAll("[data-test-open-candidate-job-title]", openCandidateContainer);
            jobPreferences.startDate = safeText("[data-test-job-seeking-urgency-detail]", openCandidateContainer);

            const worksModelHeader = openCandidateContainer.querySelector("[data-test-open-candidate-workplaces]");
            if (worksModelHeader && worksModelHeader.nextElementSibling) {
                jobPreferences.workModels = safeTextAll("li", worksModelHeader.nextElementSibling);
            }
        }

   // =========================================================
        // 4. ERFAHRUNG (EXPERIENCE) - FINAL DIAMOND V5 LOGIC
        // =========================================================
        let experience = [];

        // --- TEIL A: GRUPPIERTE POSITIONEN (Mehrere Jobs bei einer Firma) ---
        // Suche nach Containern, die eine Gruppe von Jobs enthalten
        const groupedCompanyContainers = document.querySelectorAll("[data-test-group-position-list-container]");
        
        groupedCompanyContainers.forEach(group => {
            // Firmenname steht ganz oben im Gruppen-Container
            const companyName = safeText("[data-test-grouped-position-entity-company-name]", group);
            
            // Suche den Wrapper für die Job-Liste innerhalb der Gruppe
            const jobList = group.querySelector("[data-test-position-list]");
            
            if (jobList) {
                // Iteriere über jeden Job-Eintrag (metadata-container)
                const jobRows = jobList.querySelectorAll("[data-test-grouped-position-entity-metadata-container]");
                
                jobRows.forEach(row => {
                    const title = safeText("[data-test-grouped-position-entity-title]", row);
                    const date = safeText("[data-test-grouped-position-entity-date-range]", row);
                    const loc = safeText("[data-test-grouped-position-entity-location]", row);
                    
                    // WICHTIG: Beschreibung & Skills sind Kindelemte von 'row'
                    // (in einem verschachtelten div 'grouped-position-entity__right-content')
                    const description = safeText("[data-test-grouped-position-entity-description]", row);
                    const jobSkills = safeTextAll("[data-test-position-skill-item]", row).join(", ");

                    if (title) {
                        let entry = `${title} bei ${companyName}`;
                        if (date) entry += ` [${date}]`;
                        if (loc) entry += ` (${loc})`;
                        if (description) entry += `\n   📝 Details: ${description}`;
                        if (jobSkills) entry += `\n   💡 Skills: ${jobSkills}`;
                        
                        experience.push(entry);
                    }
                });
            }
        });

        // --- TEIL B: EINZELNE POSITIONEN (Standard) ---
        const singlePositionContainers = document.querySelectorAll("[data-test-position-list-container]");
        
        singlePositionContainers.forEach(item => {
            // Prüfen, ob Firmenname direkt im Item ist (Zeichen für Einzeljob)
            const companyEl = item.querySelector("[data-test-position-entity-company-name]");
            
            if (companyEl) {
                const title = safeText("[data-test-position-entity-title]", item);
                const company = cleanText(companyEl.innerText);
                const date = safeText("[data-test-position-entity-date-range]", item);
                const location = safeText("[data-test-position-entity-location]", item);
                const description = safeText("[data-test-position-entity-description]", item);
                const jobSkills = safeTextAll("[data-test-position-skill-item]", item).join(", ");

                if (title) {
                    let entry = `${title} bei ${company}`;
                    if (date) entry += ` [${date}]`;
                    if (location) entry += ` (${location})`;
                    if (description) entry += `\n   📝 Details: ${description}`;
                    if (jobSkills) entry += `\n   💡 Skills: ${jobSkills}`;
                    
                    experience.push(entry);
                }
            }
        });

        // --- AUSBILDUNG ---
        let education = [];
        const educationItems = document.querySelectorAll("[data-test-education-item]");
        if (educationItems.length > 0) {
            education = Array.from(educationItems).map(item => {
                const school = safeText("[data-test-education-entity-school-name]", item);
                const degree = safeText("[data-test-education-entity-degree-name]", item);
                const field = safeText("[data-test-education-entity-field-of-study]", item);
                const dates = safeText("[data-test-education-entity-dates]", item);
                
                let text = school;
                if (degree) text += ` - ${degree}`;
                if (field) text += ` (${field})`;
                if (dates) text += ` [${dates}]`;
                return text;
            }).filter(Boolean);
        } else {
            education = safeTextAll(".education-item, #education ~ .pvs-list__outer-container .pvs-entity li");
        }

        // --- ZERTIFIKATE ---
        let certifications = [];
        const certItems = document.querySelectorAll(".accomplishments-base-entity.certification-entity");
        if (certItems.length > 0) {
            certifications = Array.from(certItems).map(item => {
                const title = safeText(".accomplishments-base-entity__title", item);
                const issuer = safeText(".accomplishments-base-entity__company-name", item);
                const date = safeText(".accomplishments-base-entity__date", item);
                if (title) {
                    let text = title;
                    if (issuer) text += ` - ${issuer}`;
                    if (date) text += ` [${date}]`;
                    return text;
                }
                return "";
            }).filter(Boolean);
        } else {
            certifications = safeTextAll("#licenses_and_certifications ~ .pvs-list__outer-container .pvs-entity li, #profile-certifications li");
        }

        // --- KURSE ---
        let courses = [];
        const courseItems = document.querySelectorAll(".accomplishments-base-entity.course-entity");
        if (courseItems.length > 0) {
            courses = Array.from(courseItems).map(item => {
                const courseName = safeText(".course-entity__name", item);
                const courseNumber = safeText(".course-entity__number", item);
                if (courseName) {
                    return courseNumber ? `${courseName} (${courseNumber})` : courseName;
                }
                return "";
            }).filter(Boolean);
        }

        // --- SPRACHEN ---
        let languages = [];
        const languageItems = document.querySelectorAll(".language-entity");
        if (languageItems.length > 0) {
            languages = Array.from(languageItems).map(item => {
                const langName = safeText("[data-test-language-name]", item) || safeText(".t-bold", item);
                const proficiency = safeText("[data-test-language-proficiency]", item) || safeText(".t-black--light", item);
                return langName ? `${langName} (${proficiency})` : "";
            }).filter(Boolean);
        } else {
            languages = safeTextAll("#languages ~ .pvs-list__outer-container .pvs-entity li");
        }

        return {
            fullName: name,
            headline: headline,
            location: location,
            summary: summary,
            jobPreferences: jobPreferences,
            skills: skills,
            courses: courses,
            languages: languages,
            experience: experience,
            education: education,
            certifications: certifications,
            profileUrl: window.location.href,
            scrapedAt: new Date().toISOString(),
            source: "linkedin_recruiter"
        };
    }

    // =========================================================
    // 4. LISTENER
    // =========================================================
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request?.action !== "SCRAPE_LINKEDIN") return;

        (async () => {
            try {
                const data = await scrapeProfile();
                const cleanData = JSON.parse(JSON.stringify(data)); 
                console.log("✅ Daten gesendet:", cleanData);
                sendResponse({ status: "success", data: cleanData });
            } catch (e) {
                console.error("❌ Scraper Fehler:", e);
                sendResponse({ status: "error", message: e.toString() });
            }
        })();

        return true; 
    });
}