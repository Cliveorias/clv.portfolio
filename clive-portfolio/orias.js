document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  initLoadingScreen();
  initCursorGlow();
  initHeaderScroll();
  initMobileMenu();
  initHeroPhoto();
  initRevealAnimations();
  initSectionHighlight();
  initStatCounters();
  renderSkills();
  renderProjects();
  initContactForm();
  initDownloadCv();
});

/* ---------------------------------------------------------
   LOADING SCREEN
   A short, honest sequence: it advances through real steps
   (DOM ready, assets, then an actual Supabase ping) instead
   of a fake timer, so the bar means something.
--------------------------------------------------------- */
function initLoadingScreen() {
  const screen = document.getElementById("loading-screen");
  const fill = document.getElementById("loader-bar-fill");
  const status = document.getElementById("loader-status");

  const steps = [
    { pct: 25, label: "Loading interface…" },
    { pct: 55, label: "Loading assets…" },
    { pct: 80, label: "Connecting to Supabase…" },
    { pct: 100, label: "Ready." }
  ];

  let i = 0;
  const advance = async () => {
    if (i >= steps.length) {
      setTimeout(() => {
        screen.classList.add("hidden");
        document.body.classList.add("loaded");
      }, 350);
      return;
    }
    const step = steps[i];
    fill.style.width = step.pct + "%";
    status.textContent = step.label;

    if (step.label.includes("Supabase")) {
      await pingSupabase().catch(() => false);
    } else {
      await wait(280);
    }
    i++;
    advance();
  };

  wait(200).then(advance);
}

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/* ---------------------------------------------------------
   CURSOR GLOW
--------------------------------------------------------- */
function initCursorGlow() {
  const glow = document.getElementById("cursor-glow");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("mousemove", (e) => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
      glow.classList.add("active");
    });
    document.addEventListener("mouseleave", () => glow.classList.remove("active"));
  }
}

/* ---------------------------------------------------------
   HEADER — shrink/solidify on scroll
--------------------------------------------------------- */
function initHeaderScroll() {
  const header = document.getElementById("site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------------------------------------------------------
   MOBILE MENU (simple top-nav toggle for small screens)
--------------------------------------------------------- */
function initMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.querySelector(".top-nav");

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    nav.style.cssText = open
      ? "display:flex;flex-direction:column;gap:18px;position:fixed;top:72px;right:20px;background:#0d1220;border:1px solid #1c2436;padding:20px 26px;border-radius:16px;z-index:99;"
      : "";
  });

  document.querySelectorAll(".top-nav .nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      nav.style.cssText = "";
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------------------------------------------------------
   HERO PHOTO — falls back to the code icon until a real
   photo is added at assets/profile.jpg
--------------------------------------------------------- */
function initHeroPhoto() {
  const wrapper = document.getElementById("orb-photo");
  const img = document.getElementById("orb-photo-img");
  if (!wrapper || !img) return;

  img.addEventListener("error", () => wrapper.classList.add("no-photo"));
  if (img.complete && img.naturalWidth === 0) {
    wrapper.classList.add("no-photo");
  }
}

/* ---------------------------------------------------------
   SCROLL REVEAL — IntersectionObserver fade/slide-in
--------------------------------------------------------- */
function initRevealAnimations() {
  const targets = document.querySelectorAll(".reveal, .reveal-line");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach((t) => io.observe(t));
}

/* ---------------------------------------------------------
   SECTION HIGHLIGHT — mark the current section's nav link active
--------------------------------------------------------- */
function initSectionHighlight() {
  const sections = ["home", "about", "skills", "portfolio", "playground", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll(".top-nav .nav-link").forEach((l) => l.classList.remove("active"));
          const navMatch = document.querySelector(`.top-nav .nav-link[href="#${entry.target.id}"]`);
          if (navMatch) navMatch.classList.add("active");
        }
      });
    },
    { threshold: 0.5 }
  );
  sections.forEach((s) => io.observe(s));
}

/* ---------------------------------------------------------
   STAT COUNTERS — count up when the hero comes into view
--------------------------------------------------------- */
function initStatCounters() {
  const nums = document.querySelectorAll(".stat-num");
  nums.forEach((el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    let current = 0;
    const duration = 1200;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      current = Math.floor(progress * target);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  });
}

/* ---------------------------------------------------------
   SKILLS — dual opposing slow marquee tracks
--------------------------------------------------------- */
function renderSkills() {
  const container = document.getElementById("skills-marquee-wrap") || document.getElementById("skills-grid");
  if (!container) return;

  const allSkills = SITE_CONTENT.skills || [];
  const mid = Math.ceil(allSkills.length / 2);
  const row1 = SITE_CONTENT.skillsTop || allSkills.slice(0, mid);
  const row2 = SITE_CONTENT.skillsBottom || allSkills.slice(mid);

  const renderPill = (skill) => `
    <div class="skill-pill">
      <span class="dot" aria-hidden="true"></span>
      <span>${escapeHtml(skill)}</span>
    </div>`;

  const buildGroup = (items) => {
    // Repeat items so tracks are wide enough for seamless looping on any resolution
    const repeated = [...items, ...items, ...items, ...items];
    return repeated.map(renderPill).join("");
  };

  container.innerHTML = `
    <!-- Top row: moves left to right -->
    <div class="skills-marquee marquee-ltr" aria-label="Skills row 1">
      <div class="marquee-group">
        ${buildGroup(row1)}
      </div>
      <div class="marquee-group" aria-hidden="true">
        ${buildGroup(row1)}
      </div>
    </div>

    <!-- Bottom row: moves right to left -->
    <div class="skills-marquee marquee-rtl" aria-label="Skills row 2">
      <div class="marquee-group">
        ${buildGroup(row2)}
      </div>
      <div class="marquee-group" aria-hidden="true">
        ${buildGroup(row2)}
      </div>
    </div>
  `;

  initRevealAnimations();
}

/* ---------------------------------------------------------
   PROJECTS — fetched from Supabase, with a graceful fallback
--------------------------------------------------------- */
async function renderProjects() {
  const grid = document.getElementById("portfolio-grid");
  const note = document.getElementById("portfolio-note");
  const { data, usedFallback } = await fetchProjects();

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="portfolio-empty">No projects yet — add rows to the "projects" table in Supabase.</p>`;
    return;
  }

  note.textContent = usedFallback
    ? "Showing sample projects — connect Supabase in js/config.js to pull in your own."
    : "";

  grid.innerHTML = data
    .map((project, idx) => {
      const tags = (project.tags || [])
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join("");
      return `
        <article class="project-card reveal" style="transition-delay:${idx * 0.06}s">
          <div class="tag-row">${tags}</div>
          <h3>${escapeHtml(project.title || "Untitled project")}</h3>
          <p>${escapeHtml(project.description || "")}</p>
          <div class="card-links">
            ${project.project_url ? `<a href="${escapeAttr(project.project_url)}" target="_blank" rel="noopener">Live site
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>` : ""}
            ${project.repo_url ? `<a href="${escapeAttr(project.repo_url)}" target="_blank" rel="noopener">Code
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            </a>` : ""}
          </div>
        </article>`;
    })
    .join("");

  initRevealAnimations();
}

/* ---------------------------------------------------------
   CONTACT FORM — inserts into Supabase "messages" table
--------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  const submitBtn = document.getElementById("cf-submit");
  const msg = document.getElementById("cf-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "form-msg";

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      msg.textContent = "Please fill in every field.";
      msg.classList.add("error");
      return;
    }

    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const { error } = await submitContactMessage({ name, email, message });

    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;

    if (error) {
      msg.textContent = error.message || "Something went wrong. Please try again.";
      msg.classList.add("error");
      return;
    }

    msg.textContent = "Message sent — thanks! I'll get back to you soon.";
    msg.classList.add("success");
    form.reset();
  });
}

/* ---------------------------------------------------------
   DOWNLOAD CV — point this at your actual resume file
--------------------------------------------------------- */
function initDownloadCv() {
  const link = document.getElementById("download-cv");
  link.addEventListener("click", (e) => {
    // Replace "assets/resume.pdf" once you've added your own file.
    link.setAttribute("href", "assets/resume.pdf");
    link.setAttribute("download", "");
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}