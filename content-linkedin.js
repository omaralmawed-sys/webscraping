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
        console.log("🐢 Starte Expandierung...");

        // --- A. LISTEN & DETAILS ---
        const listSelectors = [
            'button[aria-label*="Weitere Zertifikate anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Weitere Positionen mit Berufserfahrung anzeigen"][aria-expanded="false"]', // <--- WICHTIG
            'button[aria-label*="Details anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Berufserfahrung anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Ausbildung anzeigen"][aria-expanded="false"]',
            'button[aria-label*="Sprachen anzeigen"][aria-expanded="false"]',
            'button.expandable-list__button[aria-expanded="false"]',
            'button[id*="expand-more-lower-button"][aria-expanded="false"]',
            'button[data-test-decorated-line-clamp-see-more-button][aria-expanded="false"]'
        ];

        const listButtons = document.querySelectorAll(listSelectors.join(', '));

        if (listButtons.length > 0) {
            for (const btn of listButtons) {
                if (btn.isConnected && btn.offsetParent !== null) {
                    
                    const label = (btn.getAttribute("aria-label") || btn.innerText || "").toLowerCase();
                    const id = (btn.id || "").toLowerCase();
                    const visibleText = btn.innerText.toLowerCase();

                    // --- FILTER (Buttons ignorieren) ---
                    if (id.includes("expand-less") || label.includes("weniger") || label.includes("less")) continue; 
                    if (label.includes("kenntnisse") || label.includes("skills")) continue; 
                    
                    // Interessen ignorieren
                    if (label.includes("interessen") || label.includes("interests")) continue;
                    const container = btn.closest('.expandable-list');
                    if (container) {
                        const title = container.querySelector('[data-test-expandable-list-title]');
                        if (title && title.innerText.toLowerCase().includes("interessen")) continue;
                    }

                    // Details anzeigen ignorieren
                    if (label.includes("details anzeigen") || visibleText.includes("details anzeigen")) continue;
                    // ----------------------------------

                    try {
                        console.log("   👉 Klicke (Stufe 1):", label.substring(0, 40));
                        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await randomWait(300, 600); 
                        btn.click();
                        await randomWait(1500, 2500); 

                        // --- SPEZIAL: ZWEITE RUNDE (DOUBLE TRIGGER) ---
                        
                        // Fall 1: Zertifikate nachladen
                        if (label.includes("zertifikate")) {
                            const certBtnRound2 = document.querySelector('button[aria-label*="Weitere Zertifikate anzeigen"][aria-expanded="false"]');
                            if (certBtnRound2 && certBtnRound2.offsetParent !== null) {
                                console.log("   🔄 Klicke Zertifikate ein 2. Mal!");
                                certBtnRound2.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                await randomWait(500, 800);
                                certBtnRound2.click();
                                await randomWait(1500, 2500);
                            }
                        }

                        // Fall 2: Berufserfahrung nachladen (NEU)
                        if (label.includes("berufserfahrung") || label.includes("experience")) {
                            const expBtnRound2 = document.querySelector('button[aria-label*="Weitere Positionen mit Berufserfahrung anzeigen"][aria-expanded="false"]');
                            if (expBtnRound2 && expBtnRound2.offsetParent !== null) {
                                console.log("   🔄 Klicke Berufserfahrung ein 2. Mal!");
                                expBtnRound2.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                await randomWait(500, 800);
                                expBtnRound2.click();
                                await randomWait(1500, 2500);
                            }
                        }
                        // ----------------------------------------------

                    } catch(e) { console.log("Fehler beim Klicken:", e); }
                }
            }
        }

        // --- B. ZUSAMMENFASSUNG ---
        const summaryButtons = document.querySelectorAll(
            '.inline-show-more-text__button, [aria-label*="Zusammenfassung"] button, #line-clamp-show-more-button'
        );
        for (const btn of summaryButtons) {
            if (btn.isConnected && btn.offsetParent !== null) {
                try { btn.click(); await randomWait(100, 200); } catch(e) {}
            }
        }

        // --- C. ACCORDIONS ---
        const accordionButtons = document.querySelectorAll('button.accordion-header__button[aria-expanded="false"]');
        for (const btn of accordionButtons) {
            const txt = (btn.innerText + (btn.getAttribute("aria-label")||"")).toLowerCase();
            const isRelevant = txt.includes("kenntnisse") || txt.includes("skills") || 
                               txt.includes("jobangebote") || txt.includes("offen für") || 
                               txt.includes("sprachen");

            if (isRelevant && btn.isConnected) {
                try {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btn.click();
                    await randomWait(500, 800);
                } catch(e) {}
            }
        }

        console.log("✅ Expandierung fertig.");
        await randomWait(500, 1000); 
    }

    // =========================================================
    // 3. HAUPT-SCRAPER LOGIK
    // =========================================================
    async function scrapeProfile() {
        await expandSections();

        // Header
        const name = safeText("h1") || safeText(".artdeco-entity-lockup__title");
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

        const openToWork = safeTextAll(".accordion-body__body li, .accordion-body__body span");

        // --- ERFAHRUNG (MULTI-ROLE LOGIK) ---
        let experience = [];

        // 1. Gruppierte Positionen (Firma mit mehreren Rollen, z.B. Freshfields)
        const groupedItems = document.querySelectorAll("[data-test-group-position-list-container]");
        groupedItems.forEach(group => {
            const company = safeText("[data-test-grouped-position-entity-company-name]", group);
            
            // Finde alle Rollen-Header innerhalb dieser Firma
            const roles = group.querySelectorAll("[data-test-grouped-position-entity-metadata-container]");

            roles.forEach(roleMetadata => {
                const title = safeText("[data-test-grouped-position-entity-title]", roleMetadata);
                const date = safeText("[data-test-grouped-position-entity-date-range]", roleMetadata);
                const location = safeText("[data-test-grouped-position-entity-location]", roleMetadata);
                
                // Wir suchen die Beschreibung und Skills in den Elementen DANACH (Siblings)
                // WICHTIG: Wir stoppen, sobald wir auf den nächsten Header (metadata-container) stoßen
                let description = "";
                let roleSkills = "";
                let nextElem = roleMetadata.nextElementSibling;
                
                while (nextElem && !nextElem.matches("[data-test-grouped-position-entity-metadata-container]")) {
                    
                    // Beschreibung gefunden? (Der Container enthält oft <h3> Bulletpoints)
                    const descContainer = nextElem.querySelector("[data-test-grouped-position-entity-description]");
                    if (descContainer) {
                        description = cleanText(descContainer.innerText);
                    }

                    // Skills gefunden? (NEU: Suche nach dem korrekten Skills-Container im Sibling)
                    const skillsContainer = nextElem.querySelector("[data-test-position-skills]");
                    if (skillsContainer) {
                        roleSkills = safeTextAll("[data-test-position-skill-item]", skillsContainer).join(", ");
                    }

                    nextElem = nextElem.nextElementSibling;
                }

                if (title) {
                    let text = `${title} bei ${company}`;
                    if (date) text += ` [${date}]`;
                    if (location) text += ` (${location})`;
                    if (description) text += `\n   📝 Details: ${description}`;
                    if (roleSkills) text += `\n   💡 Skills: ${roleSkills}`;
                    experience.push(text);
                }
            });
        });

        // 2. Einzelne Positionen (Standard, z.B. Capricorn)
        const singleItems = document.querySelectorAll("[data-test-position-list-container]");
        singleItems.forEach(item => {
            const title = safeText("[data-test-position-entity-title]", item);
            const company = safeText("[data-test-position-entity-company-name]", item);
            const date = safeText("[data-test-position-entity-date-range]", item);
            const location = safeText("[data-test-position-entity-location]", item);
            
            // Beschreibung (Direkt im Item)
            const description = safeText("[data-test-position-entity-description]", item);
            
            // Skills (Direkt im Item)
            let roleSkills = "";
            const skillsContainer = item.querySelector("[data-test-position-skills]");
            if (skillsContainer) {
                roleSkills = safeTextAll("[data-test-position-skill-item]", skillsContainer).join(", ");
            }

            if (title) {
                let text = `${title} bei ${company}`;
                if (date) text += ` [${date}]`;
                if (location) text += ` (${location})`;
                if (description) text += `\n   📝 Details: ${description}`;
                if (roleSkills) text += `\n   💡 Skills: ${roleSkills}`;
                experience.push(text);
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