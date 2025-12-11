// background.js

// Erlaubt das Öffnen der Seitenleiste durch Klick auf das Icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));  