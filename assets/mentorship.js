(function () {
  "use strict";
  const link = document.getElementById("volunteer-form-link");
  const status = document.getElementById("volunteer-form-status");
  if (!link || !status) return;

  const config = window.GUILD_MENTORSHIP || {};
  let volunteerUrl = null;
  try {
    const candidate = new URL(config.volunteerFormUrl);
    if (candidate.protocol === "https:" && candidate.hostname === "docs.google.com" && !candidate.username && !candidate.password && !candidate.port && /^\/forms\/d\/(?:e\/)?[a-zA-Z0-9_-]+\/viewform\/?$/.test(candidate.pathname)) volunteerUrl = candidate;
  } catch (_) {
    /* A pending volunteer form stays unavailable; mentorship requests use email first. */
  }
  if (!volunteerUrl || config.volunteerResponseSheetConnected !== true) return;

  link.href = volunteerUrl.href;
  link.removeAttribute("aria-disabled");
  link.removeAttribute("tabindex");
  status.textContent = "The volunteer application is available in a separate Google Form tab. All volunteers are unpaid, and qualifications require administrator verification before acceptance or assigned-student access.";
  status.classList.add("ready");
})();
