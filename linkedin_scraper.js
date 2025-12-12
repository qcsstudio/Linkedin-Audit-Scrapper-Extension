(async function () {
  try {
    // Helper functions
    const text = (el) => el?.innerText?.trim() || "";
    const src = (el) => el?.src || "";
    const q = (s) => document.querySelector(s);
    const qAll = (s) => Array.from(document.querySelectorAll(s));

    // WAIT FOR ELEMENTS
    const waitFor = async (selector, timeout = 8000) => {
      return new Promise((resolve) => {
        let waited = 0;
        const interval = setInterval(() => {
          if (document.querySelector(selector)) {
            clearInterval(interval);
            resolve(true);
          }
          waited += 200;
          if (waited >= timeout) {
            clearInterval(interval);
            resolve(false);
          }
        }, 200);
      });
    };

    // AUTO SCROLL (LinkedIn lazy loads)
    const autoScroll = async () => {
      return new Promise(async (resolve) => {
        let total = 0;
        const distance = 400;

        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          total += distance;

          if (total >= document.body.scrollHeight - 2000) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    };

    console.log("⏳ Scrolling page for lazy-loaded data…");
    await autoScroll();

    await new Promise((res) => setTimeout(res, 2500));

    await waitFor("section[aria-label='About']");
    await waitFor("section[aria-label='Experience']");
    await waitFor("section[aria-label='Education']");

    console.log("📌 Starting FINAL scraping…");

    // ===== ABOUT SECTION FIX (GUARANTEED) =====
   const getAbout = () => {
  let about = "";

  // **1. first try visually-hidden (full text)**
  const hidden = q("div.inline-show-more-text--is-collapsed span.visually-hidden");
  if (hidden?.innerText.trim().length > 10) {
    about = hidden.innerText.trim();
  }

  // **2. try aria-hidden**
  if (!about) {
    const ariaHidden = q("div.inline-show-more-text--is-collapsed span[aria-hidden='true']");
    if (ariaHidden) about = ariaHidden.innerText.trim();
  }

  // **3. direct container fallback**
  if (!about) {
    const container = q("div.inline-show-more-text--is-collapsed");
    if (container) about = container.innerText.replace("…see more", "").trim();
  }

  // **4. Last fallback: all spans inside the block**
  if (!about) {
    const spans = qAll("div.inline-show-more-text--is-collapsed span")
      .map(s => s.innerText.trim())
      .filter(t => t.length > 2);
    if (spans.length > 0) about = spans.join(" ");
  }

  return about;
};

    // ===== MAIN SCRAPED DATA =====
    const data = {
      username: (location.pathname || "").split("/").filter(Boolean).pop() || "",

      name:
        text(q("h1.text-heading-xlarge")) ||
        text(q(".pv-text-details__left-panel h1")) ||
        "",

      profile_picture:
        src(q("img.pv-top-card-profile-picture__image")) ||
        src(q("img.profile-photo-edit__preview")) ||
        src(q("img.update-components-actor__avatar-image")) ||
        "",

      headline:
        text(q("div.text-body-medium.break-words")) ||
        text(q("h2.text-heading-medium")) ||
        text(q("div.text-body-large")) ||
        "",

      about: getAbout(),

      location:
        text(q("span.text-body-small.inline.t-black--light")) ||
        text(q("div.pv-text-details__left-panel span")) ||
        "",

      connections: (() => {
        const el = qAll("span").find((s) =>
          /connections|followers/i.test(text(s))
        );
        return text(el);
      })(),

      experience: qAll("section[aria-label='Experience'] li").map((li) => ({
        title:
          text(li.querySelector("span.mr1")) ||
          text(li.querySelector("h3")),
        company: text(li.querySelector("span.t-normal")) || "",
        duration: text(li.querySelector(".t-black--light")) || "",
        location: text(li.querySelector("span.t-14.t-black--light")) || "",
        description:
          text(li.querySelector(".pv-shared-text")) ||
          text(li.querySelector(".inline-show-more-text")) ||
          "",
      })),

      education: qAll("section[aria-label='Education'] li").map((li) => ({
        school:
          text(li.querySelector("span.mr1.t-bold")) ||
          text(li.querySelector("h3")),
        degree:
          text(li.querySelector(".t-normal")) ||
          text(li.querySelector("h4")),
        duration: text(li.querySelector(".t-black--light")) || "",
      })),

      skills: qAll("span.display-flex.t-normal")
        .map((el) => text(el))
        .filter((x) => x.length > 1)
        .slice(0, 50),

      activity: qAll("div.update-components-text")
        .slice(0, 5)
        .map((post) => ({
          type: "post",
          text: text(post.querySelector("span.break-words")),
          timestamp: post.querySelector("time")?.getAttribute("datetime") || "",
        })),

      contact:
        text(q("a[href^='mailto:']")) ||
        text(q("section[aria-label='Contact info'] a")) ||
        "",
    };

    console.log("🔥 FINAL SCRAPED DATA:", data);
    return data;

  } catch (err) {
    return { error: err.message };
  }
})();