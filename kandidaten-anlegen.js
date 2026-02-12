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

        
    async function scrapeCandidateData() {
        // 1. Name aus der Top-Card (Nutzt h1/h2 statt Klassen)
        const topCard = document.querySelector('[componentkey$="Topcard"]') || 
                        document.querySelector('[componentkey*="profile.card"]');
        const fullName = safeText(["h1", "h2"], topCard);

        // 2. Navigation über die Experience-Sektion (Nutzt deine Struktur)
        const experienceParent = document.querySelector('[componentkey^="profileCardsBelowActivityPart1"]');
        
       

        let currentJobTitle = "";
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
            position: currentJobTitle || "Nicht gefunden",
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