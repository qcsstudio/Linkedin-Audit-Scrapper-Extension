// background.js

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "START_SCRAPE") {
    const { url, role } = msg;

    (async () => {
      try {
        // create a new tab (inactive)
        const tab = await chrome.tabs.create({ url, active: false });

        // wait for tab to finish loading
        await new Promise((res) => {
          const onUpdated = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              res();
            }
          };
          chrome.tabs.onUpdated.addListener(onUpdated);
        });

        // inject scraper
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["linkedin_scraper.js"]
        });

        const scraped =
          results && results[0] && results[0].result
            ? results[0].result
            : { error: "no-data" };

        // 🔥 SEND SCRAPER DATA TO FRONTEND BEFORE BACKEND
        try {
          chrome.tabs.sendMessage(sender.tab.id, {
            from: "LINKEDIN_AUDIT_EXT",
            type: "DEBUG_DATA",
            payload: { ...scraped, role }
          });
        } catch (err) {
          console.warn("DEBUG_DATA send failed", err);
        }

        // =======================
        // BACKEND CALL
        // =======================
        const backendUrl =
          "http://ec2-13-127-109-214.ap-south-1.compute.amazonaws.com:5000/api/analyze/url";

        let scoreResponse = {
          score: 0,
          summary: "No backend configured",
          data: scraped
        };

        try {
          const resp = await fetch(backendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...scraped, role })
          });
          scoreResponse = await resp.json();
        } catch (err) {
          scoreResponse = {
            score: 0,
            summary: "Backend error: " + err.message,
            data: scraped
          };
        }

        // =======================
        // SEND RESULT TO FRONTEND
        // =======================
        try {
          const allTabs = await chrome.tabs.query({});
          for (const t of allTabs) {
            try {
              await chrome.tabs.sendMessage(t.id, {
                type: "SCRAPE_RESULT",
                payload: scoreResponse
              });
            } catch (e) {}
          }
        } catch (e) {
          console.error("sendMessage error", e);
        }

        // close the opened tab
        try {
          await chrome.tabs.remove(tab.id);
        } catch (e) {}
      } catch (err) {
        console.error("background error", err);
      }
    })();
  }
});
