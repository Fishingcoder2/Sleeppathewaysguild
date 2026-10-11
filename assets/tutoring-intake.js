(function () {
  "use strict";
  const start = document.getElementById("intake-start");
  const button = document.getElementById("open-intake");
  const status = document.getElementById("intake-status");
  const confirmation = document.getElementById("proceed-confirmation");
  const embedded = document.getElementById("confidential-intake");
  const frame = document.getElementById("intake-frame");
  const heading = document.getElementById("embedded-intake-heading");
  const directLink = document.getElementById("direct-intake-link");
  if (!start || !button || !status || !confirmation || !embedded || !frame || !heading || !directLink) return;

  const config = window.GUILD_TUTORING_INTAKE || {};
  let formUrl = null;
  try {
    const candidate = new URL(config.formUrl);
    if (candidate.protocol === "https:" && candidate.hostname === "docs.google.com" && !candidate.username && !candidate.password && !candidate.port && /^\/forms\/d\/(?:e\/)?[a-zA-Z0-9_-]+\/viewform\/?$/.test(candidate.pathname)) formUrl = candidate;
  } catch (_) {
    /* An unconfigured intake must not collect or transmit applicant answers. */
  }
  const connected = formUrl && config.responseSheetConnected === true && config.adminNotificationsEnabled === true;
  if (connected) {
    button.disabled = false;
    status.textContent = "Continue opens the confidential Google intake form below. No payment is collected when you apply.";
    status.classList.add("ready");
  }

  start.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!connected || !embedded.hidden || !start.reportValidity() || !confirmation.checked) return;
    const embedUrl = new URL(formUrl.href);
    embedUrl.searchParams.set("embedded", "true");
    frame.src = embedUrl.href;
    directLink.href = formUrl.href;
    embedded.hidden = false;
    button.disabled = true;
    button.setAttribute("aria-expanded", "true");
    button.textContent = "Intake form is open below";
    heading.focus();
    embedded.scrollIntoView({ block: "start" });
  });

  document.querySelectorAll("[data-intake-cancel]").forEach(function (cancelButton) {
    cancelButton.addEventListener("click", function () {
      frame.removeAttribute("src");
      directLink.removeAttribute("href");
      embedded.hidden = true;
      confirmation.checked = false;
      button.disabled = !connected;
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Continue to confidential intake";
      status.textContent = "The embedded form has been closed. Check the confirmation again if you wish to reopen it.";
      confirmation.focus();
      start.scrollIntoView({ block: "center" });
    });
  });
})();
