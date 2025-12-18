// content-linkedin.js
// STABILE VERSION – Listener sicher, kein Port-Close mehr

// =========================================================
// 0. LISTENER-SCHUTZ (Richtig, ohne hasRun-Falle)
// =========================================================
if (!window.__linkedinScraperListenerRegistered) {
    window.__linkedinScraperListenerRegistered = true;

    console.log("🚀 LinkedIn Scraper Listener registriert.");

    // =========================================================
    // 1. HELFER-FUNKTION: INTELLIGENTES LADEN (POLLING)
// =========================================================
    async function fetchHiddenContent(urlSuffix) {
        return new Promise((resolve) => {
            try {
                let baseUrl = window.location.href;
                if (baseUrl.includes("/details/")) baseUrl = baseUrl.split("/details/")[0];
                if (baseUrl.includes("/overlay/")) baseUrl = baseUrl.split("/overlay/")[0];
                baseUrl = baseUrl.replace(/\/$/, "");

                const fullUrl = baseUrl + urlSuffix;
                const iframeId = "scraper-" + Math.random().toString(36).slice(2);

                const iframe = document.createElement("iframe");
                iframe.id = iframeId;
                iframe.style.cssText =
                    "position:absolute;width:1024px;height:1024px;top:-9999px;left:-9999px;pointer-events:none;z-index:-1;";
                iframe.src = fullUrl;

                document.body.appendChild(iframe);

                let attempts = 0;
                const maxAttempts = 50;

                const interval = setInterval(() => {
                    attempts++;
                    try {
                        const doc = iframe.contentDocument;
                        if (!doc) return;

                        const hasItems =
                            doc.querySelectorAll(".pvs-list__paged-list-item").length > 0 ||
                            doc.querySelectorAll(".pv-contact-info__contact-type").length > 0;

                        const hasError =
                            doc.body?.innerText.includes("Page not found") ||
                            doc.body?.innerText.includes("Status code 404");

                        if (hasItems || hasError || attempts >= maxAttempts) {
                            clearInterval(interval);
                            iframe.remove();
                            resolve(hasItems ? doc : null);
                        }
                    } catch {
                        /* ignorieren */
                    }
                }, 200);
            } catch {
                resolve(null);
            }
        });
    }

    // =========================================================
    // 2. EXTRAKTOREN
    // =========================================================
    async function getContactInfo() {
        const doc = await fetchHiddenContent("/overlay/contact-info/");
        if (!doc) return {};
        const data = {};

        doc.querySelectorAll(".pv-contact-info__contact-type").forEach(sec => {
            const icon = sec.querySelector("svg")?.getAttribute("data-test-icon");
            const val = sec.querySelector("a, span")?.innerText.trim();
            if (icon === "envelope-medium") data.email = val;
            if (icon === "phone-handset-medium") data.phone = val;
            if (icon === "linkedin-bug-medium") data.linkedin = val;
        });
        return data;
    }

    async function getExperience() {
        const doc = await fetchHiddenContent("/details/experience/");
        if (!doc) return [];

        return [...doc.querySelectorAll(".pvs-list__paged-list-item")]
            .map(item => {
                const title =
                    item.querySelector(".t-bold span[aria-hidden='true']")?.innerText.trim() || "";
                const company =
                    item.querySelector("span.t-normal:not(.t-black--light) span[aria-hidden='true']")
                        ?.innerText.trim() || "";
                const desc =
                    item.querySelector(".inline-show-more-text span[aria-hidden='true']")
                        ?.innerText.trim() || "";
                return title ? { title, company, description: desc } : null;
            })
            .filter(Boolean);
    }

    async function getSkills() {
        const doc = await fetchHiddenContent("/details/skills/");
        if (!doc) return [];
        return [...new Set(
            [...doc.querySelectorAll(".pvs-list__paged-list-item span[aria-hidden='true']")]
                .map(e => e.innerText.trim())
                .filter(Boolean)
        )];
    }

    async function getLanguages() {
        const doc = await fetchHiddenContent("/details/languages/");
        if (!doc) return [];
        return [...doc.querySelectorAll(".pvs-list__paged-list-item")].map(item => ({
            language: item.querySelector(".t-bold .visually-hidden")?.innerText.trim() || "",
            level: item.querySelector(".t-black--light .visually-hidden")?.innerText.trim() || ""
        })).filter(l => l.language);
    }

    // =========================================================
    // 3. SCRAPER
    // =========================================================
    async function scrapeProfile() {
        return {
            fullName: document.querySelector("h1")?.innerText.trim() || "",
            headline: document.querySelector(".text-body-medium")?.innerText.trim() || "",
            location: document.querySelector(".text-body-small.inline.t-black--light")?.innerText.trim() || "",
            contact: await getContactInfo(),
            experience: await getExperience(),
            skills: await getSkills(),
            languages: await getLanguages()
        };
    }

    // =========================================================
    // 4. MESSAGE LISTENER (ASYNCHRON & SICHER)
// =========================================================
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request?.action !== "SCRAPE_LINKEDIN") return;

        (async () => {
            try {
                const data = await scrapeProfile();
                sendResponse({ status: "success", data });
            } catch (e) {
                sendResponse({ status: "error", message: String(e) });
            }
        })();

        return true; // 🔑 Port bleibt offen
    });
}
