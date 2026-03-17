import { API_URL, N8N_WEBHOOK_URL } from './config.js';

/**
 * Sends a job matching request to the external API.
 * @param {Object} payload - The payload to send.
 * @returns {Promise<Object>} The API response data.
 * @throws {Error} If the API returns an error or fails.
 */
export async function sendJobMatchingRequest(payload) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`Verbindungsfehler (Status: ${response.status})`);
    }

    const data = await response.json().catch(() => null);
    
    if (!data) {
        throw new Error("Keine gültige Antwort (JSON) vom Server erhalten.");
    }

    const output = Array.isArray(data) ? data[0] : data;
    
    if (!output || Object.keys(output).length === 0) {
        throw new Error("Fehler: n8n hat keine Daten zurückgegeben.");
    }

    if (output.error) throw new Error(output.error);
    
    return output;
}

/**
 * Sends a generic payload to the N8N/proxy API.
 * @param {Object} payload - The payload to send.
 * @param {AbortSignal} [signal] - Optional abort signal.
 * @returns {Promise<Object>} The API response data.
 * @throws {Error} If the API returns an error or fails.
 */
export async function sendPayloadToN8n(payload, signal) {
    const response = await fetch(API_URL, {
        method: "POST",
        signal: signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Verbindungsfehler (Status: ${response.status})`);
    }

    const data = await response.json().catch(() => null);
    
    if (!data) {
        throw new Error("Keine gültige Antwort (JSON) vom Server erhalten.");
    }

    const output = Array.isArray(data) ? data[0] : data;
    
    if (!output || Object.keys(output).length === 0) {
        throw new Error("Fehler: n8n hat keine Daten zurückgegeben.");
    }

    if (output.error) throw new Error(output.error);
    
    return output;
}

/**
 * Sends a structured payload to the main N8N webhook with timeout and enhanced error handling.
 * @param {Object} payload - The payload to send.
 * @returns {Promise<Object>} The parsed JSON response or raw text result.
 * @throws {Error} If the request fails, times out, or returns an error status.
 */
export async function sendToN8nWebhook(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        if (!payload || typeof payload !== "object") {
            throw new Error("Ungültige Payload für n8n.");
        }

        const response = await fetch(
            N8N_WEBHOOK_URL,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal
            }
        );

        const rawBody = await response.text().catch(() => "");

        if (!response.ok) {
            throw new Error(
                `Netzwerk-Antwort war nicht ok (HTTP ${response.status})${rawBody ? `: ${rawBody}` : ""}`
            );
        }

        if (!rawBody || !rawBody.trim()) {
            console.warn("n8n hat eine leere Antwort zurückgegeben.");
            throw new Error("Keine Antwort von n8n erhalten.");
        }

        try {
            const parsed = JSON.parse(rawBody);
            
            // NEU: Zusätzliche Prüfung, ob n8n nur ein komplett leeres JSON-Objekt {} oder [] geschickt hat
            const checkData = Array.isArray(parsed) ? parsed[0] : parsed;
            if (!checkData || (typeof checkData === 'object' && Object.keys(checkData).length === 0)) {
                throw new Error("Fehler: n8n hat leere Daten zurückgegeben.");
            }
            
            return parsed;
        } catch (parseError) {
            // Wenn wir unseren eigenen Fehler von oben fangen, werfen wir ihn weiter
            if (parseError.message.includes("leere Daten zurückgegeben")) {
                throw parseError; 
            }
            console.warn("n8n lieferte kein gültiges JSON, Rohtext wird verwendet.");
            return { ok: true, status: response.status, text: rawBody };
        }
    } catch (error) {
        const isTimeout = error && error.name === "AbortError";
        throw new Error(isTimeout ? "n8n-Request Timeout nach 120 Sekunden." : (error.message || "Verbindung zu n8n fehlgeschlagen."));
    } finally {
        clearTimeout(timeoutId);
    }
}