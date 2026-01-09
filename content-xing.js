if (!window.__xingScraperListenerRegistered) {
  window.__xingScraperListenerRegistered = true;
  console.log("🚀 XING Scraper Listener registriert.");

  // =========================================================
  // 0. HELPER (EINMAL, KONSISTENT)
  // =========================================================
  const DEFAULT_FALLBACK = "Keine Angabe";

  function getText(scope, selector, fallback = DEFAULT_FALLBACK) {
    if (!scope || !selector) return fallback;

    const el = scope.querySelector(selector);
    if (!el) return fallback;

    const raw = el.textContent;
    if (!raw) return fallback;

    const cleaned = raw.replace(/\s+/g, " ").trim();
    return cleaned.length ? cleaned : fallback;
  }

  function pushUnique(arr, values) {
    const set = new Set(arr.map(v => String(v).trim()).filter(Boolean));
    for (const v of values) {
      const s = String(v ?? "").replace(/\s+/g, " ").trim();
      if (s) set.add(s);
    }
    arr.length = 0;
    arr.push(...set);
  }

  // =========================================================
  // 1. iFRAME-LOGIK (DEFINITION)
  // =========================================================
  async function fetchXingSettingsContent() {
    return new Promise((resolve) => {
      const settingsUrl = "https://www.xing.com/recruiting-settings";
      const iframeId = "xing-settings-loader-" + Math.random().toString(36).slice(2);
      const iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.style.cssText =
        "position:absolute;width:1024px;height:1024px;top:-9999px;left:-9999px;visibility:hidden;";
      iframe.src = settingsUrl;
      document.body.appendChild(iframe);

      let attempts = 0;
      const maxAttempts = 40;

      const interval = setInterval(() => {
        attempts++;
        try {
          // kann je nach CSP/Login scheitern → catch bleibt
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc) {
            if (attempts >= maxAttempts) {
              clearInterval(interval);
              iframe.remove();
              resolve(null);
            }
            return;
          }

          const emailInput = doc.querySelector('[data-testid="businessEmail"]');
          const nameDiv = doc.querySelector('div[size="3"].index-es__Ro-sc-29676499-24');

          if (emailInput || nameDiv || attempts >= maxAttempts) {
            clearInterval(interval);
            const extracted =
              (emailInput || nameDiv)
                ? {
                    email: emailInput?.value || "",
                    name: nameDiv?.innerText?.trim?.() || ""
                  }
                : null;
            iframe.remove();
            resolve(extracted);
          }
        } catch (e) {
          // wenn Cross-Origin/CSP blockt: nach maxAttempts sauber abbrechen
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            iframe.remove();
            resolve(null);
          }
          console.error("iFrame Fehler:", e);
        }
      }, 200);
    });
  }

  // =========================================================
  // 2. HAUPT-LISTENER
  // =========================================================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== "scrape") return;

    (async () => {
      try {
        console.log("⏳ Versuche Recruiter-Daten via iFrame zu laden...");
        const recruiterFromIframe = await fetchXingSettingsContent();

        const storage = await chrome.storage.local.get(["cachedRecruiter"]);
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
          job_preferences: {}, // <- leer starten, dann befüllen
          interessen: []
        };

        if (recruiterFromIframe) {
          chrome.storage.local.set({ cachedRecruiter: extractedData.recruiter });
        }




        // ---------------------------------------------------------
        // A) KOPFDATEN
        // ---------------------------------------------------------
        const contactWidget = document.querySelector('[data-testid="contact-details-widget"]');
        if (contactWidget) {
          extractedData.profile.name = getText(contactWidget, 'b[data-wry="Text"][size="2"]', "");
          extractedData.profile.role = getText(contactWidget, 'b[data-wry="Text"][color="grey400"]', "");

          const panels =
            contactWidget.closest('[data-wry="Panel"]')
              ?.querySelectorAll?.('[data-wry="Text"][size="2"]');

          if (panels && panels.length > 0) {
            const lastText = panels[panels.length - 1]?.innerText?.trim?.() || "";
            if (lastText && !lastText.includes("Kontaktdaten")) extractedData.profile.location = lastText;
          }
        }

        // ---------------------------------------------------------
        // B) BERUFSERFAHRUNG
        // ---------------------------------------------------------
        document.querySelectorAll('[data-testid="professional-experience"]').forEach(item => {
          extractedData.experience.push({
            title: getText(item, '[data-wry="Text"][size="2"]', "") || getText(item, 'div[class*="hRxjwK"]', ""),
            company: getText(item, '[data-wry="Text"].jlTEdn', "") || getText(item, 'div[class*="jlTEdn"]', ""),
            date: getText(item, '[color="secondaryText"]', "")
          });
        });

        // ---------------------------------------------------------
        // C) SKILLS (dedupe + trim)
        // ---------------------------------------------------------
        const skillsWidget = document.querySelector('[data-testid="haves-widget"]');
        if (skillsWidget) {
          const vals = Array.from(skillsWidget.querySelectorAll('[data-wry="Text"]'))
            .map(el => el.textContent || "")
            .map(t => t.replace(/\s+/g, " ").trim())
            .filter(Boolean);
          pushUnique(extractedData.skills, vals);
        }

        // ---------------------------------------------------------
        // D) SPRACHEN (dedupe + trim)
        // ---------------------------------------------------------
        const langWidget = document.querySelector('[data-testid="languages-widget"]');
        if (langWidget) {
          const vals = Array.from(langWidget.querySelectorAll('.sc-fjvvzt'))
            .map(row => row.querySelector('[data-wry="Text"]')?.textContent || "")
            .map(t => t.replace(/\s+/g, " ").trim())
            .filter(Boolean);
          pushUnique(extractedData.languages, vals);
        }

        // ---------------------------------------------------------
        // E) INTERESSEN (dedupe + trim)
        // ---------------------------------------------------------
        const textNodes = Array.from(document.querySelectorAll('[data-wry="Text"]'));
        const interessenHeader = textNodes.find(el => (el.innerText || "").trim() === "Interessen");

        if (interessenHeader) {
          const panel = interessenHeader.closest('[data-wry="Panel"]');
          const contentWrapper = panel?.lastElementChild;
          const rawText = contentWrapper?.innerText || "";
          if (rawText.trim()) {
            const interestsArray = rawText
              .split(",")
              .map(t => t.replace(/\s+/g, " ").trim())
              .filter(Boolean);
            pushUnique(extractedData.interessen, interestsArray);
          }
        }

        // ---------------------------------------------------------
        // F) JOB-PRÄFERENZEN (nur widget-scope)
        // ---------------------------------------------------------
        const jobSeeker = document.querySelector('[data-testid="job-seeker-projobs"]');
        if (jobSeeker) {
          const jobPreferenceMap = {
            preferred_field: '[data-testid="disciplines-value"]',
            preferred_industry: '[data-testid="industries-value"]',
            ideal_positions: '[data-testid="ideal-position-value"]',
            working_hours: '[data-testid="preferred-working-hours-value"]',
            salary_expectation: '[data-testid="salary-expectation-value"]',
            locations: '[data-testid="preferred-location-value"]',
            workplace: '[data-testid="workplaces-value"]',
            travel_willingness: '[data-testid="willingness-travel-value"]'
          };

          for (const [key, selector] of Object.entries(jobPreferenceMap)) {
            extractedData.job_preferences[key] = getText(jobSeeker, selector, DEFAULT_FALLBACK);
          }
        }

        // seekStatus NICHT aus jobSeeker lesen (Scope-Problem) → separat
        extractedData.job_preferences.seek_status =
          getText(document, '[data-testid="seek-status-title"]', DEFAULT_FALLBACK);

        // ---------------------------------------------------------
        // G) WECHSELMOTIVATION (separates widget)
        // ---------------------------------------------------------
        const motivationWidget = document.querySelector('[data-testid="profileWillingnessToChangeJobs"]');
        if (motivationWidget) {
          const panel = motivationWidget.closest('[data-wry="Panel"]');
          extractedData.willingness_to_change =
            getText(panel || document, '[data-testid="seek-status-title"]', DEFAULT_FALLBACK);
        } else {
          extractedData.willingness_to_change = extractedData.job_preferences.seek_status || "";
        }


        
        // ---------------------------------------------------------
        // H  EDUCATION
        // ---------------------------------------------------------

     const educationWidgets = document.querySelectorAll('[data-testid="education-background-item"]');

    educationWidgets.forEach(item => {
        extractedData.education.push({
            abschluss: getText(item, 'div[data-wry="Text"].hRxjwK', DEFAULT_FALLBACK),
            uni: getText(item, 'div[data-wry="Text"].jlTEdn', DEFAULT_FALLBACK),
            zeitraum: getText(item, 'div[data-wry="Text"][color="grey400"]', DEFAULT_FALLBACK),
            beschreibung: getText(item, 'div.icHJji', DEFAULT_FALLBACK)
        });
    });

       

        console.log("✅ Daten gesendet:", extractedData);
        sendResponse({ data: extractedData });
      } catch (error) {
        console.error("Scrape-Fehler:", error);
        sendResponse({ status: "error", message: error?.message || String(error) });
      }
    })();

    return true; // hält den Kanal für sendResponse offen
  });
}
