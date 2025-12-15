// background.js

const DETAILS_PAGES = ["experience", "education", "skills"];

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "START_SCRAPE") return;

  const { url, role } = msg;

  (async () => {
    let profileTab;
    try {
      // 1️⃣ OPEN BASE PROFILE
      profileTab = await chrome.tabs.create({ url, active: false });
      await waitForTab(profileTab.id);

      // 2️⃣ SCRAPE BASE PROFILE
      const baseResult = await runScraper(profileTab.id);
      const finalData = { ...baseResult };

      // 3️⃣ SCRAPE DETAILS PAGES
      for (const page of DETAILS_PAGES) {
        const detailsUrl = `${url.replace(/\/$/, "")}/details/${page}/`;
        const tab = await chrome.tabs.create({ url: detailsUrl, active: false });
        await waitForTab(tab.id);

        const detailResult = await runScraper(tab.id);

        if (page === "experience") finalData.experience = detailResult.experience || [];
        if (page === "education") finalData.education = detailResult.education || [];
        if (page === "skills") finalData.skills = detailResult.skills || [];

        await chrome.tabs.remove(tab.id);
      }

      // ==========================
// SCRAPE CONTACT INFO (OVERLAY) 👈 YAHAN
// ==========================
const contactUrl = `${url.replace(/\/$/, "")}/overlay/contact-info/`;
const contactTab = await chrome.tabs.create({
  url: contactUrl,
  active: false
});
await waitForTab(contactTab.id);

const contactResult = await runScraper(contactTab.id);
finalData.contact = contactResult.contact || {};

await chrome.tabs.remove(contactTab.id);

// ==========================
// SCRAPE ACTIVITY
// ==========================
const activityUrl = `${url.replace(/\/$/, "")}/recent-activity/all/`;
const activityTab = await chrome.tabs.create({
  url: activityUrl,
  active: false
});
await waitForTab(activityTab.id);

const activityResult = await runScraper(activityTab.id);
finalData.activity = activityResult.activity || {};

await chrome.tabs.remove(activityTab.id);


      // 4️⃣ DEBUG DATA
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "DEBUG_DATA",
        payload: { ...finalData, role }
      });

      // 5️⃣ BACKEND CALL
      const backendUrl =
        "http://ec2-13-127-109-214.ap-south-1.compute.amazonaws.com:5000/api/analyze/url";

      const resp = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...finalData, role })
      });

      const response = await resp.json();

      // 6️⃣ SEND RESULT
      const tabs = await chrome.tabs.query({});
      tabs.forEach((t) => {
        try {
          chrome.tabs.sendMessage(t.id, {
            type: "SCRAPE_RESULT",
            payload: response
          });
        } catch {}
      });

    } catch (err) {
      console.error("BACKGROUND ERROR:", err);
    } finally {
      if (profileTab?.id) {
        try { await chrome.tabs.remove(profileTab.id); } catch {}
      }
    }
  })();
});

function waitForTab(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 1500);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function runScraper(tabId) {
  const res = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["linkedin_scraper.js"]
  });
  return res?.[0]?.result || {};
}
