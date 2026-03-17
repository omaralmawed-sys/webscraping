// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param {string|null|undefined} value - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Splits a full name into first and last name parts.
 * @param {string} fullName - The full name to split.
 * @returns {{firstName: string, lastName: string}} An object containing the first and last name.
 */
export function getNameParts(fullName) {
    const normalizedName = typeof fullName === "string" ? fullName.trim() : "";
    if (!normalizedName) return { firstName: "", lastName: "" };
    const parts = normalizedName.split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || "",
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : ""
    };
}

/**
 * Converts a File object to a Base64 string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves to the Base64 string (without prefix).
 */
export function getBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("Keine Datei übergeben."));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            const commaIndex = result.indexOf(",");
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error("Datei konnte nicht gelesen werden."));
    });
}

/**
 * Copies text to the clipboard and updates button text temporarily.
 * @param {string} text - The text to copy.
 * @param {HTMLElement} btn - The button element to update.
 */
export function copyToClipboard(text, btn) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    const original = btn.innerText;
    btn.innerText = "✅";
    setTimeout(() => btn.innerText = original, 1500);
}
