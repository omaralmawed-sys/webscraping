// kandidaten-anlegen.js
if (!window.__linkedinCandidateScraperRegistered) {
    window.__linkedinCandidateScraperRegistered = true;

    function cleanText(text) {
        return text ? text.replace(/[\n\r]+/g, " ").replace(/\s{2,}/g, " ").trim() : "";
    }

    function safeText(selectors, parent = document) {
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        for (const selector of selectorList) {
            try {
                const el = parent.querySelector(selector);
                if (el && el.innerText.trim() !== "") {
                    return cleanText(el.innerText);
                }
            } catch (e) { continue; }
        }
        return "";
    }

        async function scrapeExperienceOnly() {
    // 1. Wir greifen uns NUR die Experience Section über den ComponentKey
    const experienceSection = document.querySelector('section[componentkey*="ExperienceTopLevelSection"]');

    if (!experienceSection) {
        console.warn("Experience Section nicht gefunden.");
        return [];
    }

    // 2. Wir suchen alle Job-Einträge innerhalb dieser Section
    const jobEntries = experienceSection.querySelectorAll('[componentkey^="entity-collection-item"]');
    let companies = [];

    jobEntries.forEach(entry => {
        // Weg A: Über das aria-label des Logos (Sehr sauber: "enmit", "dropp")
        let name = entry.querySelector('figure[aria-label]')?.getAttribute('aria-label') || "";
        name = name.replace("Logo von ", "").trim();

        // Weg B: Falls kein Logo da ist, über den Text-Paragraph
        if (!name) {
            const textElement = entry.querySelector('div.f4339567 p:nth-child(2)');
            if (textElement) {
                // Trennt "enmit · Selbstständig" am Punkt und nimmt den ersten Teil
                name = textElement.innerText.split('·')[0].trim();
            }
        }

        if (name && !companies.includes(name)) {
            companies.push(name);
        }
    });

    return companies; // Gibt ["enmit", "dropp", "McKinsey & Company"] zurück
}

    async function scrapeCandidateData() {
        // 1. Name aus der Top-Card (Nutzt h1/h2 statt Klassen)
        const topCard = document.querySelector('[componentkey$="Topcard"]') || 
                        document.querySelector('[componentkey*="profile.card"]');
        const fullName = safeText(["h1", "h2"], topCard);

        // 2. Navigation über die Experience-Sektion (Nutzt deine Struktur)
        const experienceParent = document.querySelector('[componentkey^="profileCardsBelowActivityPart1"]');
        
        // 2. Standort / Adresse extrahieren (NEU)
        // Wir suchen nach dem Textblock, der typischerweise Ort und Land enthält
        const location = safeText([
            "div.f4339567 p.c5713723", // Spezifisch für das neue HTML Layout
            "span.text-body-small.inline.t-black--light.break-words", // Klassisches Layout
            "div._923a8cfe p" // Fallback für Topcard-Struktur
        ], topCard);

        let currentJobTitle = "";
        // let currentCompany = "";
        // let companyList = [];


                // Targeted extraction for the company name within the Top Card
        const companyName = safeText([
            // Target the specific paragraph class inside the company section
            "div[role='button'] p._70666991", 
            // Fallback: look for the img alt text or surrounding p tag in the first Top Card button
            "div[data-view-name='image'] + div p",
            // Broadest fallback within the Top Card
            "._70666991"
        ], topCard);

        // To ensure you don't get the University name, 
        // you can specifically check for the logo source
       //const companySection = topCard.querySelector('img[src*="company-logo"]')?.closest('div[role="button"]');
      //  const exactCompany = companySection ? safeText("p", companySection) : "";

        if (experienceParent) {
            // Wir suchen das erste Item der Liste
            const firstJobItem = experienceParent.querySelector('[componentkey^="entity-collection-item"]');

            if (firstJobItem) {
                //Jobtitel: Wir suchen nach dem ersten fettgedruckten Text oder h3
                currentJobTitle = safeText([
                    "div.display-flex span[aria-hidden='true']",
                    "h3 span[aria-hidden='true']",
                    "h3"
                ], firstJobItem);

                // Unternehmen: Wir suchen nach dem Text unter dem Titel
                currentJobTitle = safeText([
                    "span.t-14.t-normal span[aria-hidden='true']",
                    "div[data-display-contents='true'] p",
                    "span.t-black--light"
                ], firstJobItem);
            }

            
        }

        // Profilbild URL
        const profileImg = document.querySelector('div[data-view-name="profile-top-card-member-photo"] img')?.src || "";

        return {
            fullName: fullName || "Unbekannt",
            location:location || "Nicht gefunden",
            // infos: infos || "Nicht gefunden",
            // Services: Services || "Nicht gefunden",
            // education: education || "Nicht gefunden",
            // skills:skills || "Nicht gefunden",
            position: currentJobTitle || "Nicht gefunden",
            company: companyName || "Nicht gefunden",
            companyList: await scrapeExperienceOnly(),
          //  experience:await scrapeExperienceOnly(),
            profileImage: profileImg,
            url: window.location.href
        };
    }






    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "SCRAPE_CANDIDATE") {
            scrapeCandidateData().then(data => sendResponse({ status: "success", data }));
            return true; 
        }
    });
}