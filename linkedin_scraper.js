(async function () {
  try {
    const text = (el) => el?.innerText?.trim() || "";
    const q = (s) => document.querySelector(s);
     const src = (el) => el?.src || "";

    // ==========================
    // HELPERS
    // ==========================
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    async function waitFor(selector, timeout = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (document.querySelector(selector)) return true;
        await sleep(300);
      }
      return false;
    }

    async function autoScroll() {
      let total = 0;
      const step = 500;
      while (total < document.body.scrollHeight) {
        window.scrollBy(0, step);
        total += step;
        await sleep(300);
      }
    }

    // ==========================
    // about SCRAPER
    // ==========================

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



    // ==========================
    // EXPERIENCE SCRAPER
    // ==========================
    async function scrapeExperienceDetails() {
      await waitFor("h1");
      await autoScroll();
      await sleep(1200);

      const experiences = [];
      const items = document.querySelectorAll("li.pvs-list__paged-list-item");

      items.forEach(item => {
        if (item.querySelector("ul.pvs-list")) return;

        const getText = sel =>
          item.querySelector(sel)?.innerText?.trim() || "";

        const title = getText(
          "div.hoverable-link-text span[aria-hidden='true']"
        );

        const companyLine = getText(
          "span.t-14.t-normal span[aria-hidden='true']"
        );

        let company = "";
        let employmentType = "";

        if (companyLine.includes("·")) {
          const parts = companyLine.split("·").map(s => s.trim());
          company = parts[0];
          employmentType = parts[1] || "";
        } else {
          company = companyLine;
        }

        const metaLines = Array.from(
          item.querySelectorAll(
            "span.t-14.t-normal.t-black--light span[aria-hidden='true']"
          )
        ).map(el => el.innerText.trim());

        let duration = "";
        let location = "";

        metaLines.forEach(line => {
          if (/present|yr|mos/i.test(line)) duration = line;
          else if (/india|remote|on-site|hybrid/i.test(line)) location = line;
        });

        let skills = [];
        const skillBlock = item.querySelector("strong");
        if (skillBlock?.innerText.includes("Skills")) {
          skills = skillBlock.parentElement.innerText
            .replace("Skills:", "")
            .split("·")
            .map(s => s.trim())
            .filter(Boolean);
        }

        if (title && company) {
          experiences.push({
            company: title,           // title → company
            employmentType: company,  // company → employmentType
            duration,
            location,
            skills
          });
        }
      });

      return experiences;
    }

    // ==========================
    // EDUCATION SCRAPER
    // ==========================
    async function scrapeEducationDetails() {
      await waitFor("section");
      await autoScroll();
      await sleep(1000);

      const education = [];

      const items = document.querySelectorAll(
        "li.pvs-list__paged-list-item"
      );

      items.forEach(item => {
        const institute =
          item.querySelector(
            "div.hoverable-link-text span[aria-hidden='true']"
          )?.innerText?.trim() || "";

        const degree =
          item.querySelector(
            "span.t-14.t-normal span[aria-hidden='true']"
          )?.innerText?.trim() || "";

        const duration =
          item.querySelector(
            "span.pvs-entity__caption-wrapper[aria-hidden='true']"
          )?.innerText?.trim() || "";

        const description =
          item.querySelector(
            "div.t-14.t-normal.t-black span[aria-hidden='true']"
          )?.innerText?.trim() || "";

        const logo =
          item.querySelector("img.ivm-view-attr__img")?.src || "";

        if (institute) {
          education.push({
            institute,
            degree,
            duration,
            description,
            logo
          });
        }
      });

      return education;
    }


    // skills
// ==========================
// SKILLS SCRAPER
// ==========================
async function scrapeSkillsDetails() {
  await waitFor("section");
  await autoScroll();
  await sleep(1000);

  const skills = [];

  const items = document.querySelectorAll(
    "li.pvs-list__paged-list-item"
  );

  items.forEach(item => {
    const skill = item.querySelector(
      "div.hoverable-link-text span[aria-hidden='true']"
    )?.innerText?.trim();

    if (skill) skills.push(skill);
  });

  return skills;
}

// ==========================
// CONTACT INFO SCRAPER
// ==========================
function scrapeContactInfo() {
  const contact = {};

  const sections = document.querySelectorAll(
    "section.pv-contact-info__contact-type"
  );

  sections.forEach(section => {
    const header =
      section.querySelector("h3")?.innerText?.trim().toLowerCase() || "";

    // PROFILE
    // if (header.includes("profile")) {
    //   contact.profile =
    //     section.querySelector("a")?.href || "";
    // }

    // PHONE
    if (header.includes("phone")) {
      contact.phone =
        section.querySelector("span.t-black")?.innerText?.trim() || "";
    }

    // ADDRESS
    if (header.includes("address")) {
      contact.address =
        section.querySelector("a")?.innerText?.trim() || "";
    }

    // EMAIL
    if (header.includes("email")) {
      contact.email =
        section.querySelector("a")?.innerText?.trim() || "";
    }

    // BIRTHDAY
    if (header.includes("birthday")) {
      contact.birthday =
        section.querySelector("span.t-black")?.innerText?.trim() || "";
    }

    // WEBSITE
    if (header.includes("website")) {
      contact.website =
        section.querySelector("a")?.href || "";
    }
  });

  return contact;
}

// ==========================
// ACTIVITY SCRAPER
// ==========================
async function scrapeActivity() {
  await waitFor("section");
  await autoScroll();
  await sleep(1200);

  const activity = {
    type: "posts",
    items: []
  };

  // Empty state check
  const emptyText = document.querySelector(
    ".artdeco-empty-state__headline"
  )?.innerText;

  if (emptyText && /nothing to see/i.test(emptyText)) {
    return activity; // no activity
  }

  const posts = document.querySelectorAll(
    "div.feed-shared-update-v2, div.feed-shared-post"
  );

  posts.forEach(post => {
    const content =
      post.querySelector("span.break-words, div.feed-shared-text")
        ?.innerText?.trim() || "";

    const time =
      post.querySelector("span.feed-shared-actor__sub-description")
        ?.innerText?.trim() || "";

    const reactions =
      post.querySelector("span.social-details-social-counts__reactions-count")
        ?.innerText?.trim() || "0";

    const comments =
      post.querySelector("span.social-details-social-counts__comments")
        ?.innerText?.trim() || "0";

    if (content) {
      activity.items.push({
        content,
        time,
        reactions,
        comments
      });
    }
  });

  return activity;
}
// ==========================
//Location Scraper
// ==========================
function scrapeLocation() {
  // primary selector (top card location)
  const location =
  document.querySelector(
    "section.artdeco-card span.text-body-small.inline.t-black--light.break-words"
  )?.innerText?.trim();
  
  return location || "";
}

// ==========================
//profileImage Scraper
// ==========================
function scrapeProfileImage() {
  // Primary selector (most reliable)
  const img =
    document.querySelector(
      "img.profile-photo-edit__preview"
    ) ||
    document.querySelector(
      "img.pv-top-card-profile-picture__image"
    ) ||
    document.querySelector(
      "img[alt][src*='profile-displayphoto']"
    );

  return img?.src || "";
}


    // ==========================
    // ROUTE DETECTOR
    // ==========================
    if (location.pathname.includes("/details/experience")) {
      return { experience: await scrapeExperienceDetails() };
    }

    if (location.pathname.includes("/details/education")) {
      return { education: await scrapeEducationDetails() };
    }

    if (location.pathname.includes("/details/skills")) {
  return { skills: await scrapeSkillsDetails() };
}

if (location.pathname.includes("overlay/contact-info")) {
  return { contact: scrapeContactInfo() };
}

if (location.pathname.includes("recent-activity")) {
  return { activity: await scrapeActivity() };
}

    // ==========================
    // BASE PROFILE
    // ==========================
    return {
      username: location.pathname.split("/").filter(Boolean).pop() || "",
      name: q("h1")?.innerText || "",
      headline: q("div.text-body-medium")?.innerText || "",
      location: scrapeLocation(),
      about: getAbout(),
      connections:
        Array.from(document.querySelectorAll("span"))
          .find(s => /connections/i.test(s.innerText))?.innerText || "",
      profile_picture:scrapeProfileImage(),
    };

  } catch (err) {
    console.error("SCRAPER ERROR:", err);
    return { error: err.message };
  }
})();
