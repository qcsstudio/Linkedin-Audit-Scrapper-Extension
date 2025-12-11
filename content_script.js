// content_script.js
console.log("🔵 Content Script Loaded on:", window.location.href);

// ======== PAGE → BACKGROUND ========
window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "START_SCRAPE") {
    chrome.runtime.sendMessage({
      type: "START_SCRAPE",
      url: event.data.url,
      role: event.data.role,
      sourceTabId: null
    });
  }
});

// Extension ping check
window.addEventListener("message", (e) => {
  if (e.data === "PING_EXTENSION") {
    window.postMessage("EXTENSION_RUNNING", "*");
  }
});

// ======== BACKGROUND → PAGE ========
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  // scrape result coming from backend
  if (msg.type === "SCRAPE_RESULT") {
    window.postMessage(
      {
        from: "LINKEDIN_AUDIT_EXT",     
        type: "SCRAPE_RESULT",
        payload: msg.payload
      },
      "*"
    );
  }

  // 🔥 DEBUG DATA FORWARD
  if (msg.type === "DEBUG_DATA") {
    window.postMessage(
      {
        from: "LINKEDIN_AUDIT_EXT",
        type: "DEBUG_DATA",
        payload: msg.payload
      },
      "*"
    );
  }
});
