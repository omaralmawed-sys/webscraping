if(window.hasRun) {

    throw new Error("Content Script already running");
}
window.hasRun = true;

// =========================================================
// 1. DER HELFER (Geheimagent)
// =========================================================
async function fetchHiddenContent(urlSuffix) {
    return new Promise((resolve) => {
        const fullUrl = window.location.href.replace(/\/$/, "") + urlSuffix;
        const iframeId = "hidden-scraper-" + Math.random().toString(36).substr(2, 9);
        
        const iframe = document.createElement("iframe");
        iframe.id = iframeId;
        iframe.style.cssText = "height:0;width:0;opacity:0;position:fixed;top:0;left:0;";
        iframe.src = fullUrl;
        
        document.body.appendChild(iframe);

        iframe.onload = () => {
            setTimeout(() => {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    console.log(`✅ Daten geladen von: ${urlSuffix}`);
                    resolve(doc);
                } catch (e) {
                    console.error("Fehler:", e);
                    resolve(null);
                } finally {
                    iframe.remove();
                }
            }, 2000); 
        };
    });
};

// =========================================================
// 2. DIE SPEZIALISTEN (Daten-Extraktoren)
// =========================================================

async function getContactInfo(){
    // KORREKTUR: Die URL heißt meistens "overlay", nicht "details" für Kontakte
    const doc = await fetchHiddenContent("/overlay/contact-info/"); 
    
    if(!doc) return {};

    const data = {};
    
    // KORREKTUR: CSS Klassen brauchen Punkte (.) davor!
    // Falsch: 'pv-contact-info__header t-16...'
    // Richtig: '.pv-contact-info__header' (Aber den Namen holen wir lieber von der Hauptseite!)
    
    // Wir holen hier echte Kontaktdaten (Email/Telefon)
    const sections = doc.querySelectorAll(".pv-contact-info__contact-type");
    sections.forEach(section => {
        const icon = section.querySelector("svg")?.getAttribute("data-test-icon");
        const value = section.querySelector("a, span")?.innerText.trim();
        
        if (icon === "envelope-medium") data.email = value;
        if (icon === "phone-handset-medium") data.phone = value;
        if (icon === "linkedin-bug-medium") data.linkedin = value;
    });

    return data;
}

async function getExperience() {
    console.log("🔍 Suche Berufserfahrung...");
    const doc = await fetchHiddenContent("/details/experience/");
    
    if (!doc) return [];

    const jobs = [];
    const items = doc.querySelectorAll("li.pvs-list__item--with-top-padding");
    
    items.forEach(item => {
        const title = item.querySelector("span.mr1 span[aria-hidden='true']")?.innerText.trim();
        const company = item.querySelector("span.t-14.t-normal span[aria-hidden='true']")?.innerText.trim();
        
        // Deine Logik für die versteckte Beschreibung
        const descriptionElement = item.querySelector('.visually-hidden');
        const description = descriptionElement ? descriptionElement.innerText.trim() : "";

        if (title) {
            jobs.push({ title, company, description });
        }
    });

    return jobs;
}

async function getSkills(){
    console.log("🔍 Suche Skills...")
    const doc = await fetchHiddenContent("/details/skills/");

    if(!doc) return [];

    const skills=[];
    const items = doc.querySelectorAll(".pvs-list__paged-list-item span[aria-hidden='true']");

    // KORREKTUR: 'forEach' schreibt man mit großem 'E'!
    items.forEach(item => { 
        const text = item.innerText.trim();
        if(text && !skills.includes(text)){
            skills.push(text);
        }
    });

    return skills;
}

async function getLanguages() {
    console.log("🔍 Suche Sprachen...");
    const doc = await fetchHiddenContent("/details/languages/");
    
    if (!doc) return [];

    const languages = [];
    const items = doc.querySelectorAll(".pvs-list__paged-list-item");
    
    items.forEach(item => {
        const nameElement = item.querySelector('.t-bold .visually-hidden');
        const name = nameElement ? nameElement.innerText.trim() : "";
        
        const levelElement = item.querySelector('.t-black--light .visually-hidden');
        const level = levelElement ? levelElement.innerText.trim() : "";

        if (name) {
            languages.push({ language: name, level: level });
        }
    });

    return languages;
}

// =========================================================
// 3. DER MANAGER (Das fehlte!)
// =========================================================

async function scrapeProfile() {
    console.log("🚀 START: Lese gesamtes Profil...");

    // 1. Basis-Infos direkt von der Hauptseite holen (Name steht immer oben!)
    const mainProfile = {
        fullName: document.querySelector("h1")?.innerText.trim() || "Unbekannt",
        headline: document.querySelector(".text-body-medium")?.innerText.trim() || "",
        location: document.querySelector(".text-body-small.inline.t-black--light.break-words")?.innerText.trim() || ""
    };

    // 2. Alle Spezialisten gleichzeitig lossschicken
    const [contactData, experienceData, skillsData, languagesData] = await Promise.all([
        getContactInfo(),
        getExperience(),
        getSkills(),
        getLanguages()
    ]);

    // 3. Alles zusammenfügen
    const finalProfile = {
        ...mainProfile,      // Name, Titel, Ort
        contact: contactData, // Email, Telefon
        experience: experienceData,
        skills: skillsData,
        languages: languagesData
    };

    console.log("🏁 ENDE: Profil erfolgreich gescrapt:", finalProfile);
    return finalProfile;
}

// =========================================================
// ZUM STARTEN:
// scrapeProfile(); 
// =========================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request.action === "SCRAPE_LINKEDIN"){
        console.log("Nachricht erhalten: SCRAPE_LINKEDIN");


        scrapeProfile().then((data)=>{
            console.log("Sende Daten zurück an den Hintergrund-Skript...");
            sendResponse({profileData: data});
        });
        
        return true; // Wichtig für asynchrone Antwort
    }
});
