(function () {
  "use strict";

  var synth = window.speechSynthesis;
  var supported = !!(synth && window.SpeechSynthesisUtterance &&
    typeof synth.speak === "function" && typeof synth.cancel === "function");
  var canPause = supported && typeof synth.pause === "function" && typeof synth.resume === "function";
  var controls = null;
  var session = 0;
  var currentUtterance = null;
  var chunks = [];
  var chunkIndex = 0;
  var mode = "idle";
  var nextRate = 1;
  var activeRate = 1;
  var startTimer = null;
  var pauseTimer = null;

  function clearTimers() {
    window.clearTimeout(startTimer);
    window.clearTimeout(pauseTimer);
    startTimer = null;
    pauseTimer = null;
  }

  function update(message) {
    if (!controls) return;
    var active = mode !== "idle";
    controls.play.disabled = !supported;
    controls.play.textContent = active ? "Read from start" : "Read aloud";
    controls.pause.disabled = !supported || !canPause || !active || mode === "starting";
    controls.pause.textContent = mode === "paused" ? "Resume" : "Pause";
    controls.pause.setAttribute("aria-pressed", String(mode === "paused"));
    controls.stop.disabled = !supported || !active;
    controls.rate.disabled = !supported;
    if (active && nextRate !== activeRate) {
      message += " Selected speed " + nextRate + "× applies when you choose Read from start.";
    }
    controls.status.textContent = message;
  }

  function reset(message) {
    // Invalidate callbacks before cancel(), which may dispatch events immediately.
    session += 1;
    clearTimers();
    currentUtterance = null;
    chunks = [];
    chunkIndex = 0;
    mode = "idle";
    if (supported) {
      try {
        synth.cancel();
        if (typeof synth.resume === "function") synth.resume();
      } catch (error) {
        // The text lesson remains available if a browser speech service fails.
      }
    }
    update(message);
  }

  function stop() {
    reset(supported ? "Reading stopped. Choose Read aloud to start again." :
      "Read aloud is unavailable in this browser. You can read the lesson text below.");
  }

  function splitText(text) {
    var result = [];
    text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).forEach(function (paragraph) {
      var remaining = paragraph.replace(/\s+/g, " ").trim();
      // Short utterances avoid long-text speech failures on mobile browsers.
      while (remaining.length > 240) {
        var end = Math.max(remaining.lastIndexOf(". ", 239),
          remaining.lastIndexOf("? ", 239), remaining.lastIndexOf("! ", 239));
        end = end >= 80 ? end + 1 : remaining.lastIndexOf(" ", 240);
        if (end < 1) end = 240;
        result.push(remaining.slice(0, end).trim());
        remaining = remaining.slice(end).trim();
      }
      if (remaining) result.push(remaining);
    });
    return result;
  }

  function speakChunk(id) {
    if (id !== session || mode === "paused") return;
    if (chunkIndex >= chunks.length) {
      reset("Reading finished. Choose Read aloud to listen again.");
      return;
    }

    var utterance;
    try {
      utterance = new window.SpeechSynthesisUtterance(chunks[chunkIndex]);
      utterance.rate = activeRate;
      utterance.lang = document.documentElement.lang || "en";
    } catch (error) {
      reset("Read aloud could not start. You can read the lesson text or try again.");
      return;
    }
    currentUtterance = utterance;
    var started = false;
    function isCurrent() {
      return id === session && currentUtterance === utterance;
    }

    utterance.onstart = function () {
      if (!isCurrent()) return;
      started = true;
      window.clearTimeout(startTimer);
      if (mode === "starting") {
        mode = "reading";
        update("Reading this lesson at " + activeRate + "× speed.");
      }
    };
    utterance.onend = function () {
      if (!isCurrent()) return;
      window.clearTimeout(startTimer);
      currentUtterance = null;
      chunkIndex += 1;
      // A pause at a chunk boundary must not queue the next paragraph.
      if (mode !== "paused") speakChunk(id);
    };
    utterance.onerror = function (event) {
      if (!isCurrent()) return;
      var denied = event && event.error === "not-allowed";
      reset(denied ? "Your browser blocked read aloud. Choose Read aloud to try again, or read the lesson text." :
        "Read aloud stopped because the browser speech service failed. Try again or read the lesson text.");
    };
    utterance.onpause = function () {
      if (!isCurrent()) return;
      window.clearTimeout(pauseTimer);
      mode = "paused";
      update("Reading paused. Choose Resume to continue or Read from start to begin again.");
    };
    utterance.onresume = function () {
      if (!isCurrent()) return;
      window.clearTimeout(pauseTimer);
      mode = "reading";
      update("Reading this lesson at " + activeRate + "× speed.");
    };

    startTimer = window.setTimeout(function () {
      if (isCurrent() && !started && mode !== "paused") {
        reset("Read aloud did not start. Try again or read the lesson text.");
      }
    }, 9000);
    try {
      synth.speak(utterance);
    } catch (error) {
      if (isCurrent()) reset("Read aloud could not start. Try again or read the lesson text.");
    }
  }

  function play() {
    if (!supported) return;
    var reading = document.getElementById("lesson-reading");
    // Deliberately exclude the surrounding navigation and read-aloud toolbar.
    var text = reading && typeof reading.innerText === "string" ? reading.innerText.trim() : "";
    reset("Preparing read aloud.");
    if (!text) {
      update("There is no lesson text to read on this step.");
      return;
    }
    chunks = splitText(text);
    activeRate = nextRate;
    mode = "starting";
    update("Starting read aloud at " + activeRate + "× speed.");
    speakChunk(session);
  }

  function togglePause() {
    if (!supported || !canPause || mode === "idle" || mode === "starting") return;
    var id = session;
    var resuming = mode === "paused";
    window.clearTimeout(pauseTimer);
    try {
      if (resuming) {
        synth.resume();
        mode = "reading";
        update("Reading this lesson at " + activeRate + "× speed.");
        if (!currentUtterance) speakChunk(id);
      } else {
        synth.pause();
        mode = "paused";
        update("Reading paused. Choose Resume to continue or Read from start to begin again.");
      }
      // Some mobile implementations expose pause/resume but ignore the request.
      pauseTimer = window.setTimeout(function () {
        if (id !== session || mode === "idle") return;
        if (!resuming && mode === "paused" && !synth.paused) {
          canPause = false;
          mode = "reading";
          update("This browser cannot pause reading. Use Stop, then Read aloud to restart.");
          if (!currentUtterance) speakChunk(id);
        } else if (resuming && mode === "reading" && synth.paused) {
          mode = "paused";
          update("This browser could not resume reading. Choose Stop, then Read aloud to restart.");
        }
      }, 450);
    } catch (error) {
      reset("Pause or resume failed. Choose Read aloud to start again, or read the lesson text.");
    }
  }

  function changeRate() {
    var rate = Number(controls.rate.value);
    if ([0.75, 1, 1.25, 1.5].indexOf(rate) < 0) return;
    nextRate = rate;
    if (mode === "paused") {
      update("Reading paused. Choose Resume to continue at " + activeRate + "× speed.");
    } else if (mode !== "idle") {
      update("Reading speed for this playback is " + activeRate + "×.");
    } else {
      update("Reading speed is " + nextRate + "×. Choose Read aloud to begin.");
    }
  }

  function mount() {
    if (controls) {
      controls.play.removeEventListener("click", play);
      controls.pause.removeEventListener("click", togglePause);
      controls.stop.removeEventListener("click", stop);
      controls.rate.removeEventListener("change", changeRate);
    }
    var toolbar = document.getElementById("readAloud");
    controls = toolbar ? {
      play: toolbar.querySelector("#speechPlay"),
      pause: toolbar.querySelector("#speechPause"),
      stop: toolbar.querySelector("#speechStop"),
      rate: toolbar.querySelector("#speechRate"),
      status: toolbar.querySelector("#speechStatus")
    } : null;
    if (!controls || Object.keys(controls).some(function (key) { return !controls[key]; })) {
      controls = null;
      stop();
      return;
    }
    controls.status.setAttribute("role", "status");
    controls.status.setAttribute("aria-live", "polite");
    controls.status.setAttribute("aria-atomic", "true");
    [controls.play, controls.pause, controls.stop].forEach(function (button) {
      button.setAttribute("type", "button");
      button.setAttribute("aria-controls", "lesson-reading");
    });
    controls.rate.value = String(nextRate);
    controls.play.addEventListener("click", play);
    controls.pause.addEventListener("click", togglePause);
    controls.stop.addEventListener("click", stop);
    controls.rate.addEventListener("change", changeRate);
    update(supported ? (mode === "idle" ? "Choose Read aloud to listen. Speed changes apply to the next playback." :
      mode === "paused" ? "Reading paused. Choose Resume to continue or Read from start to begin again." :
      "Reading this lesson at " + activeRate + "× speed.") :
      "Read aloud is unavailable in this browser. You can read the lesson text below.");
  }

  window.addEventListener("pagehide", stop);
  window.addEventListener("popstate", stop);
  window.addEventListener("hashchange", stop);
  document.addEventListener("click", function (event) {
    if (event.target && event.target.closest && event.target.closest("a[href]")) stop();
  }, true);
  window.SPGReadAloud = { mount: mount, stop: stop };
}());
