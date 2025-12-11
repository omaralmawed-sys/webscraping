



// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    
    // Hilfsfunktion: Text sicher extrahieren
    const getText = (parent, selector) => {
      const el = parent.querySelector(selector);
      return el ? el.innerText.trim() : null;
    };

    // Daten-Objekt initialisieren
    const extractedData = {
      profile: {},
      contact_info: {},
      experience: [],
      education: [],
      skills: [],
      languages: [],
      interests: null,
      organizations: null,
      willingness_to_change: {
        status: "Unbekannt",
        reasons: [],
        prognosis: null
      },
      job_preferences: {}
    };

    // ------------------------------------------
    // 1. Profil / Header extrahieren
    // ------------------------------------------
    const contactWidget = document.querySelector('[data-testid="contact-details-widget"]');
    if (contactWidget) {
      extractedData.profile.name = getText(contactWidget, 'b[data-wry="Text"]');
      // Rolle ist oft das zweite Element oder hat eine spezifische Farbe
      const roleEl = contactWidget.querySelectorAll('[data-wry="Text"]');
      if (roleEl.length > 1) {
         extractedData.profile.current_role = roleEl[1].innerText;
      }
      
      // Adresse aus dem "Geschäftliche Kontaktdaten" Bereich
      // Im HTML: 70173 Stuttgart,Deutschland
      const addressContainer = contactWidget.querySelector('.sc-IqJVf');
      if (addressContainer) {
        const addressText = addressContainer.innerText.replace('Geschäftliche Kontaktdaten', '').trim();
        extractedData.contact_info.address = addressText;
      }
    }

    // ------------------------------------------
    // 2. Berufserfahrung extrahieren
    // ------------------------------------------
    const expItems = document.querySelectorAll('[data-testid="professional-experience"]');
    expItems.forEach(item => {
      const title = getText(item, '[data-wry="Text"][class*="hRxjwK"]') || getText(item, '[size="2"]'); 
      const company = getText(item, '[data-wry="Text"][class*="jlTEdn"]') || getText(item, 'a[data-wry="A"]');
      
      // Zeit und Dauer
      const dateEl = item.querySelector('[color="secondaryText"][data-wry="Text"]');
      const dateDuration = dateEl ? dateEl.innerText : null;
      
      // Ort (oft das zweite "secondaryText" Element)
      const metaInfos = item.querySelectorAll('[color="secondaryText"][data-wry="Text"]');
      const location = metaInfos.length > 1 ? metaInfos[1].innerText : null;

      extractedData.experience.push({
        title: title,
        company: company,
        date_duration: dateDuration,
        location: location
      });
    });

    // ------------------------------------------
    // 3. Ausbildung extrahieren
    // ------------------------------------------
    const eduItems = document.querySelectorAll('[data-testid="education-background-item"]');
    eduItems.forEach(item => {
      extractedData.education.push({
        degree: getText(item, '[data-wry="Text"][class*="hRxjwK"]'),
        university: getText(item, '[data-wry="Text"][class*="jlTEdn"]'),
        date: getText(item, '[color="grey400"]')
      });
    });

    // ------------------------------------------
    // 4. Skills ("Ich biete")
    // ------------------------------------------
    const skillsWidget = document.querySelector('[data-testid="haves-widget"]');
    if (skillsWidget) {
      const skillItems = skillsWidget.querySelectorAll('[data-wry="Text"]');
      skillItems.forEach(skill => {
        extractedData.skills.push(skill.innerText);
      });
    }

    // ------------------------------------------
    // 5. Sprachen
    // ------------------------------------------
    const langWidget = document.querySelector('[data-testid="languages-widget"]');
    if (langWidget) {
      const rows = langWidget.querySelectorAll('.sc-fjvvzt');
      rows.forEach(row => {
          const langName = getText(row, '[data-wry="Text"]:first-child');
          const langLevel = getText(row, '[data-wry="Text"]:last-child');
          if(langName) {
            extractedData.languages.push({ language: langName, level: langLevel ? langLevel.replace('- ', '') : '' });
          }
      });
    }

    // ------------------------------------------
    // 6. Interessen & Organisationen (Panel Suche)
    // ------------------------------------------
    // Da diese keine eindeutige ID haben, suchen wir nach den Panel-Headern
    const panels = document.querySelectorAll('[data-wry="Panel"]');
    panels.forEach(panel => {
        const header = getText(panel, '[size="4"][data-wry="Text"]'); // z.B. "Interessen"
        
        if (header === 'Interessen') {
            // Der Inhalt ist im nächsten Container
            // Im HTML: class="sc-aXZVg sc-eqUAAy fLYpfw jeRGbg"
            const content = panel.querySelector('div[class*="fLYpfw"]');
            if (content) extractedData.interests = content.innerText;
        }

        if (header === 'Organisationen') {
            const content = panel.querySelector('div[class*="fLYpfw"]');
            if (content) extractedData.organizations = content.innerText;
        }
    });

    // ------------------------------------------
    // 7. Wechselmotivation
    // ------------------------------------------
    const motivationWidget = document.querySelector('[data-testid="profileWillingnessToChangeJobs"]');
    if (motivationWidget) {
        extractedData.willingness_to_change.status = "Vorhanden (Details prüfen)";
        
        // Das Widget ist Teil eines Panels. Wir suchen im Eltern-Container nach der Liste.
        const panel = motivationWidget.closest('[data-wry="Panel"]');
        if (panel) {
            // Prognose Text (z.B. "Diese Kandidat dürfte...")
            extractedData.willingness_to_change.prognosis = getText(panel, '[color="grey800"]');
            
            // Indikatoren (Liste)
            const listItems = panel.querySelectorAll('ul li div[data-wry="Text"]');
            listItems.forEach(li => {
                extractedData.willingness_to_change.reasons.push(li.innerText);
            });
        }
    }

    // ------------------------------------------
    // 8. Job Präferenzen (ProJobs)
    // ------------------------------------------
    const proJobs = document.querySelector('[data-testid="job-seeker-projobs"]');
    if (proJobs) {
        // Die Struktur ist: Label (div) -> Value (div)
        // Wir iterieren über die Container
        const rows = proJobs.querySelectorAll('.sc-fopFza'); // Container für jede Zeile
        rows.forEach(row => {
            // Text holen. Der innere Text enthält oft Label + Value getrennt durch Newline
            const fullText = row.innerText.split('\n');
            if (fullText.length >= 2) {
                const label = fullText[0].replace(':', '').trim();
                const value = fullText.slice(1).join(', ').trim(); // Falls mehrere Zeilen Value
                extractedData.job_preferences[label] = value;
            }
        });
    }

    // Antwort zurücksenden
    sendResponse({ data: extractedData });
  }
  
  return true; 
});

