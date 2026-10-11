"use strict";

// Run with: node --test tutoring-demo/tests/read-aloud.test.cjs
// Browser speech and timers are simulated; no audio service or DOM dependency is required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../read-aloud.js"), "utf8");
const ids = ["speechPlay", "speechPause", "speechStop", "speechRate", "speechStatus"];

function makeControls() {
  return Object.fromEntries(ids.map(id => [id, {
    value: "1", disabled: false, textContent: "", attributes: {}, listeners: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(type, handler) { (this.listeners[type] ||= new Set()).add(handler); },
    removeEventListener(type, handler) { this.listeners[type]?.delete(handler); },
    dispatch(type) { for (const handler of this.listeners[type] || []) handler(); }
  }]));
}

function fixture({ supported = true, text = "Coach Bob explains the sleep study." } = {}) {
  let controls = makeControls();
  const reading = { innerText: text };
  const timers = new Map();
  const events = {}, documentEvents = {};
  let timerId = 0;
  const synth = {
    paused: false, spoken: [], current: null,
    speak(utterance) {
      assert.equal(this.current, null, "Playback must not overlap another utterance");
      this.spoken.push(utterance);
      this.current = utterance;
    },
    cancel() {
      const old = this.current;
      this.current = null;
      // Exercise browsers that synchronously report cancellation as an error.
      old?.onerror?.({ error: "canceled" });
    },
    pause() { this.paused = true; this.current?.onpause?.(); },
    resume() { this.paused = false; this.current?.onresume?.(); }
  };
  const document = {
    documentElement: { lang: "en" },
    body: { innerText: "NAVIGATION AND BUTTON TEXT MUST NOT BE NARRATED" },
    getElementById(id) {
      if (id === "lesson-reading") return reading;
      if (id === "readAloud") return { querySelector: selector => controls[selector.slice(1)] };
      throw new Error("Unexpected narration source: " + id);
    },
    addEventListener(type, handler) { documentEvents[type] = handler; }
  };
  Object.defineProperty(reading, "textContent", {
    get() { throw new Error("Narration must use visible lesson innerText"); }
  });
  const window = {
    addEventListener(type, handler) { events[type] = handler; },
    setTimeout(handler, delay) { const id = ++timerId; timers.set(id, { handler, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  if (supported) {
    window.speechSynthesis = synth;
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  }
  vm.runInNewContext(source, { window, document });
  const api = window.SPGReadAloud;
  api.mount();
  return {
    api, synth, events, documentEvents, timers, reading,
    get controls() { return controls; },
    get status() { return controls.speechStatus.textContent; },
    click(id) { controls[id].dispatch("click"); },
    play() { controls.speechPlay.dispatch("click"); return synth.current; },
    finish(utterance = synth.current) {
      if (synth.current === utterance) synth.current = null;
      utterance.onend();
    },
    expire(delay) {
      for (const [id, timer] of [...timers]) {
        if (timer.delay === delay) { timers.delete(id); timer.handler(); }
      }
    },
    replaceLesson(text) { controls = makeControls(); reading.innerText = text; api.mount(); }
  };
}

test("supported speech announces state and narrates only visible lesson text", () => {
  const f = fixture({ text: "First teaching paragraph.\n\nSecond teaching paragraph." });
  assert.equal(f.controls.speechPlay.disabled, false);
  assert.equal(f.controls.speechPause.disabled, true);
  assert.equal(f.controls.speechStatus.attributes.role, "status");
  assert.equal(f.controls.speechStatus.attributes["aria-live"], "polite");
  for (const id of ["speechPlay", "speechPause", "speechStop"]) {
    assert.equal(f.controls[id].attributes["aria-controls"], "lesson-reading");
    assert.equal(f.controls[id].attributes.type, "button");
  }
  let utterance = f.play();
  assert.match(f.status, /Starting read aloud/);
  utterance.onstart();
  assert.match(f.status, /Reading this lesson/);
  assert.equal(utterance.lang, "en");
  f.finish(utterance);
  utterance = f.synth.current;
  utterance.onstart();
  f.finish(utterance);
  assert.deepEqual(f.synth.spoken.map(u => u.text), ["First teaching paragraph.", "Second teaching paragraph."]);
  assert.match(f.status, /Reading finished/);
  assert.equal(f.controls.speechStop.disabled, true);
  assert.equal(f.timers.size, 0);
});

test("unsupported speech keeps a visible text fallback and disables controls", () => {
  const f = fixture({ supported: false });
  for (const id of ids.filter(id => id !== "speechStatus")) assert.equal(f.controls[id].disabled, true);
  assert.match(f.status, /unavailable.*lesson text/);
  f.play();
  f.api.stop();
  assert.equal(f.synth.spoken.length, 0);
});

test("empty lesson content never starts speech", () => {
  const f = fixture({ text: " \n " });
  f.play();
  assert.equal(f.synth.spoken.length, 0);
  assert.match(f.status, /no lesson text/);
  assert.equal(f.controls.speechStop.disabled, true);
});

test("rate changes apply on the next playback and do not interrupt current speech", () => {
  const f = fixture();
  let utterance = f.play();
  utterance.onstart();
  for (const rate of [0.75, 1.25, 1.5, 1]) {
    const count = f.synth.spoken.length;
    const previousRate = utterance.rate;
    f.controls.speechRate.value = String(rate);
    f.controls.speechRate.dispatch("change");
    assert.equal(f.synth.spoken.length, count);
    assert.equal(utterance.rate, previousRate);
    assert.match(f.status, /applies when you choose Read from start/);
    utterance = f.play();
    assert.equal(utterance.rate, rate);
    utterance.onstart();
  }
  f.api.stop();
  f.controls.speechRate.value = "3";
  f.controls.speechRate.dispatch("change");
  assert.equal(f.play().rate, 1, "Unexpected speed values are ignored");
});

test("pause, resume, and stop update accessible controls and clear pending work", () => {
  const f = fixture();
  const utterance = f.play();
  utterance.onstart();
  f.click("speechPause");
  assert.equal(f.synth.paused, true);
  assert.equal(f.controls.speechPause.textContent, "Resume");
  assert.equal(f.controls.speechPause.attributes["aria-pressed"], "true");
  f.api.mount();
  assert.match(f.status, /paused/);
  f.click("speechPause");
  assert.equal(f.synth.paused, false);
  assert.equal(f.controls.speechPause.textContent, "Pause");
  f.click("speechStop");
  assert.equal(f.synth.current, null);
  assert.equal(f.controls.speechPlay.textContent, "Read aloud");
  assert.equal(f.controls.speechPause.disabled, true);
  assert.equal(f.controls.speechStop.disabled, true);
  assert.match(f.status, /Reading stopped/);
  assert.equal(f.timers.size, 0);
});

test("stale and duplicate utterance callbacks cannot affect new playback", () => {
  const f = fixture({ text: "First paragraph.\n\nSecond paragraph." });
  const old = f.play();
  old.onstart();
  const current = f.play();
  const count = f.synth.spoken.length;
  for (const type of ["onstart", "onend", "onpause", "onresume", "onerror"]) old[type]({ error: "synthesis-failed" });
  assert.equal(f.synth.spoken.length, count);
  assert.equal(f.synth.current, current);
  assert.match(f.status, /Starting read aloud/);
  current.onstart();
  f.finish(current);
  const next = f.synth.current;
  current.onend();
  assert.equal(f.synth.current, next);
  assert.equal(f.synth.spoken.length, count + 1);
});

test("long content uses small sequential chunks and waits at a paused boundary", () => {
  const text = ("A beginner lesson explains what sleep means. ").repeat(20).trim();
  const f = fixture({ text });
  const first = f.play();
  first.onstart();
  f.click("speechPause");
  f.finish(first);
  assert.equal(f.synth.spoken.length, 1, "A paused chunk must not queue another utterance");
  f.click("speechPause");
  assert.equal(f.synth.spoken.length, 2);
  while (f.synth.current) {
    f.synth.current.onstart();
    f.finish();
  }
  assert.ok(f.synth.spoken.length > 2);
  assert.ok(f.synth.spoken.every(u => u.text.length <= 240));
  assert.equal(f.synth.spoken.map(u => u.text).join(" "), text);
  assert.match(f.status, /Reading finished/);
});

test("navigation cancels speech and remounts preserve rate without duplicate listeners", () => {
  for (const event of ["pagehide", "popstate", "hashchange"]) {
    const f = fixture();
    f.play();
    f.events[event]();
    assert.equal(f.synth.current, null, event + " must cancel playback");
  }
  const f = fixture();
  f.controls.speechRate.value = "1.25";
  f.controls.speechRate.dispatch("change");
  const stale = f.play();
  f.documentEvents.click({ target: { closest: () => null } });
  assert.equal(f.synth.current, stale, "A button click is not link navigation");
  f.documentEvents.click({ target: { closest: () => ({ href: "/reference" }) } });
  assert.equal(f.synth.current, null);
  const oldControls = f.controls;
  f.api.stop();
  f.replaceLesson("Replacement lesson explanation.");
  f.api.mount();
  assert.equal(oldControls.speechPlay.listeners.click.size, 0);
  assert.equal(f.controls.speechPlay.listeners.click.size, 1);
  assert.equal(f.controls.speechRate.value, "1.25");
  const current = f.play();
  stale.onend();
  assert.equal(f.synth.current, current);
  assert.equal(current.text, "Replacement lesson explanation.");
  assert.equal(current.rate, 1.25);
});

test("startup timeouts and speech errors stop cleanly and allow a retry", () => {
  const f = fixture();
  const old = f.play();
  f.expire(9000);
  assert.match(f.status, /did not start/);
  assert.equal(f.synth.current, null);
  old.onstart();
  assert.equal(f.controls.speechStop.disabled, true);
  for (const [error, message] of [["not-allowed", /blocked/], ["synthesis-failed", /speech service failed/]]) {
    f.play().onerror({ error });
    assert.match(f.status, message);
    assert.equal(f.synth.current, null);
    assert.equal(f.timers.size, 0);
  }
  f.synth.speak = () => { throw new Error("Speech service unavailable"); };
  f.play();
  assert.match(f.status, /could not start/);
  assert.equal(f.controls.speechStop.disabled, true);
});

test("ignored native pause and resume expose a usable Stop/restart fallback", () => {
  const f = fixture();
  f.play().onstart();
  f.synth.pause = function () { this.paused = false; };
  f.click("speechPause");
  f.expire(450);
  assert.match(f.status, /cannot pause.*Stop/);
  assert.equal(f.controls.speechPause.disabled, true);
  assert.equal(f.controls.speechStop.disabled, false);
  f.click("speechStop");
  assert.ok(f.play());

  const g = fixture();
  g.play().onstart();
  g.click("speechPause");
  g.synth.resume = function () { this.paused = true; };
  g.click("speechPause");
  g.expire(450);
  assert.match(g.status, /could not resume.*Stop/);
  assert.equal(g.controls.speechPause.textContent, "Resume");
  g.click("speechStop");
  assert.equal(g.synth.current, null);
});
