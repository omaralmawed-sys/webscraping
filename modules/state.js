// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export const state = {
    cachedProfileData: null,
    isRequestRunning: false,
    currentContactPayload: null,
    currentScrapedCandidateForUpload: null,
    tabUrl: ""
};

export function setCachedProfileData(data) {
    state.cachedProfileData = data;
}

export function setIsRequestRunning(isRunning) {
    state.isRequestRunning = isRunning;
}

export function setCurrentContactPayload(payload) {
    state.currentContactPayload = payload;
}
