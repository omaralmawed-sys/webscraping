// ============================================================================
// STORAGE & RECRUITER DATA
// ============================================================================

/**
 * Holt die Recruiter-Daten aus dem Storage und gibt ein Promise zurück.
 */
export function getRecruiterData() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['cachedRecruiter'], (result) => {
            if (chrome.runtime.lastError) {
                console.error("Storage Error:", chrome.runtime.lastError);
                resolve({ rName: "", rEmail: "" });
                return;
            }
            const recruiterData = result.cachedRecruiter || {};
            const rName = recruiterData?.name || "";
            const rEmail = recruiterData?.email || "";
            resolve({ rName, rEmail });
        });
    });
}

/**
 * Speichert den Recruiter-Namen.
 */
export function saveRecruiterName(newName) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['cachedRecruiter'], (result) => {
            const currentData = result.cachedRecruiter || {};
            const updatedData = { ...currentData, name: newName };

            chrome.storage.local.set({ cachedRecruiter: updatedData }, () => {
                resolve(updatedData);
            });
        });
    });
}

export function checkCooldown(cooldownSeconds, callback) {
    chrome.storage.local.get(['lastRequestTime'], (result) => {
        if (result.lastRequestTime) {
            const now = Date.now();
            const end = result.lastRequestTime + (cooldownSeconds * 1000);
            if (now < end) callback(end);
        }
    });
}

export function startCooldown(cooldownSeconds, callback) {
    const now = Date.now();
    chrome.storage.local.set({ lastRequestTime: now });
    callback(now + (cooldownSeconds * 1000));
}
