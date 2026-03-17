
// ============================================================================
// CONFIGURATION
// ============================================================================

export const API_URL = "https://xingproxy-842321698577.europe-west1.run.app/xing"; 
export const N8N_WEBHOOK_URL = "https://n8n.stolzberger.cloud/webhook/36f1d14f-c7eb-427c-a738-da2dfb5b9649";
export const COOLDOWN_SECONDS = 35;

export const platformConfig = {
    linkedin: { class: 'platform-linkedin', color: '#0A66C2', name: 'LinkedIn' },
    xing: { class: 'platform-xing', color: '#026466', name: 'XING' },
    unknown: { class: 'platform-unknown', color: '#6c757d', name: 'Unbekannt' } 
};
