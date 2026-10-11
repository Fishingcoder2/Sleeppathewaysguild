import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = readFileSync(resolve(root, 'assets/tutoring-intake.js'), 'utf8');
const html = readFileSync(resolve(root, 'tutoring.html'), 'utf8');
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
let passed = 0;

function element(extra = {}) {
  return {
    focused: false,
    attributes: {},
    srcAssignments: 0,
    addEventListener(type, listener) { this[type] = listener; },
    focus() { this.focused = true; },
    scrollIntoView(options) { this.scroll = options; },
    removeAttribute(name) { delete this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    get src() { return this.attributes.src; },
    set src(value) { this.attributes.src = value; this.srcAssignments++; },
    get href() { return this.attributes.href; },
    set href(value) { this.attributes.href = value; },
    ...extra
  };
}

function exercise(config, { checked = false, valid = true, submit = true } = {}) {
  const elements = {
    'intake-start': element({ reportValidity: () => valid }),
    'open-intake': element({ disabled: true }),
    'intake-status': element({ textContent: 'pending', classList: { add() {} } }),
    'proceed-confirmation': element({ checked }),
    'confidential-intake': element({ hidden: true }),
    'intake-frame': element(),
    'embedded-intake-heading': element(),
    'direct-intake-link': element()
  };
  const cancelButtons = [element(), element()];
  const context = {
    URL,
    document: {
      getElementById: id => elements[id],
      querySelectorAll: selector => selector === '[data-intake-cancel]' ? cancelButtons : []
    },
    window: { GUILD_TUTORING_INTAKE: config }
  };
  vm.runInNewContext(script, context);
  assert.equal(elements['confidential-intake'].hidden, true, 'The intake stays hidden before Continue.');
  assert.equal(elements['intake-frame'].src, undefined, 'No Google Form is loaded before Continue.');
  let prevented = false;
  if (submit) elements['intake-start'].submit({ preventDefault() { prevented = true; } });
  return { prevented, elements, cancelButtons };
}

function assertClosed(result) {
  assert.equal(result.elements['confidential-intake'].hidden, true);
  assert.equal(result.elements['intake-frame'].src, undefined);
  assert.equal(result.elements['direct-intake-link'].href, undefined);
}

const complete = {
  formUrl: 'https://docs.google.com/forms/d/e/ownerForm123/viewform?usp=sf_link',
  responseSheetConnected: true,
  adminNotificationsEnabled: true
};

for (const config of [undefined, {}, { ...complete, formUrl: '' }, { ...complete, responseSheetConnected: false }, { ...complete, adminNotificationsEnabled: false }]) {
  const result = exercise(config, { checked: true });
  assert.equal(result.elements['open-intake'].disabled, true, 'An incomplete intake connection stays disabled.');
  assertClosed(result);
  assert.equal(result.prevented, true);
  passed++;
}

for (const formUrl of [
  'http://docs.google.com/forms/d/e/id/viewform',
  'https://docs.google.com.evil.example/forms/d/e/id/viewform',
  'https://evil.example/forms/d/e/id/viewform',
  'javascript:alert(1)',
  'https://docs.google.com/spreadsheets/d/privateSheet/edit',
  'https://user:password@docs.google.com/forms/d/e/id/viewform',
  'https://docs.google.com:444/forms/d/e/id/viewform'
]) {
  const result = exercise({ ...complete, formUrl }, { checked: true });
  assert.equal(result.elements['open-intake'].disabled, true, 'Only a normal HTTPS Google Form can receive the applicant.');
  assertClosed(result);
  passed++;
}

for (const options of [{ checked: false, valid: true }, { checked: true, valid: false }, { checked: true, valid: true, submit: false }]) {
  const result = exercise(complete, options);
  assert.equal(result.elements['open-intake'].disabled, false);
  assertClosed(result);
  passed++;
}

for (const formUrl of [complete.formUrl, 'https://docs.google.com/forms/d/ownerForm123/viewform', `${complete.formUrl}&embedded=false&embedded=other`]) {
  const result = exercise({ ...complete, formUrl }, { checked: true });
  const embeddedUrl = new URL(result.elements['intake-frame'].src);
  assert.equal(embeddedUrl.origin + embeddedUrl.pathname, new URL(formUrl).origin + new URL(formUrl).pathname);
  assert.deepEqual(embeddedUrl.searchParams.getAll('embedded'), ['true'], 'The native embed parameter is set safely.');
  assert.equal(embeddedUrl.searchParams.get('usp'), new URL(formUrl).searchParams.get('usp'), 'Other URL parameters survive.');
  assert.equal(result.elements['direct-intake-link'].href, formUrl);
  assert.equal(result.elements['confidential-intake'].hidden, false);
  assert.equal(result.elements['open-intake'].disabled, true, 'Continue stays disabled while the form is open.');
  assert.equal(result.elements['open-intake'].attributes['aria-expanded'], 'true');
  assert.equal(result.elements['embedded-intake-heading'].focused, true);
  assert.equal(result.prevented, true);
  result.elements['intake-start'].submit({ preventDefault() {} });
  assert.equal(result.elements['intake-frame'].srcAssignments, 1, 'A repeated Continue cannot reload the form and discard answers.');
  passed++;
}

for (const cancelIndex of [0, 1]) {
  const result = exercise(complete, { checked: true });
  result.cancelButtons[cancelIndex].click();
  assertClosed(result);
  assert.equal(result.elements['proceed-confirmation'].checked, false);
  assert.equal(result.elements['proceed-confirmation'].focused, true);
  assert.equal(result.elements['open-intake'].disabled, false);
  assert.equal(result.elements['open-intake'].attributes['aria-expanded'], 'false');
  result.elements['intake-start'].submit({ preventDefault() {} });
  assertClosed(result);
  result.elements['proceed-confirmation'].checked = true;
  result.elements['intake-start'].submit({ preventDefault() {} });
  assert.equal(result.elements['confidential-intake'].hidden, false, 'The intake reopens only after fresh confirmation.');
  passed++;
}

assert.match(html, /id="cancel-intake" href="\/"/);
assert.match(html, /id="confidential-intake"[^>]*hidden/);
assert.match(html, /id="intake-frame"[^>]*title="Confidential Sleep Pathways Guild tutoring application"/);
assert.doesNotMatch(html.match(/<iframe\b[^>]*>/)?.[0] || '', /\bsrc=/, 'The iframe has no source in the initial page.');
assert.equal((html.match(/data-intake-cancel/g) || []).length, 2, 'Cancel is available above and below the native form.');
assert.ok(html.indexOf('data-intake-cancel') < html.indexOf('<iframe'));
assert.ok(html.lastIndexOf('data-intake-cancel') > html.indexOf('</iframe>'));
assert.match(html, /id="direct-intake-link" target="_blank" rel="noopener noreferrer"/);
assert.match(html, /close it without choosing Submit/);
assert.match(html, /does not withdraw an application already sent with Submit/);
assert.match(html, /id="proceed-confirmation"[^>]*required/);
assert.equal((html.match(/<input\b/g) || []).length, 1, 'The public landing does not collect intake answers.');
assert.doesNotMatch(script + html, /localStorage|sessionStorage|fetch\(|XMLHttpRequest|gtag\(|googletagmanager|analytics\.ahrefs|location\.assign/);
assert.match(home, /href="\/tutoring\.html">Tutoring<\/a>/);
assert.equal((home.match(/id="tutoring"/g) || []).length, 1);
for (const asset of ['assets/tutoring-intake.css', 'assets/tutoring-intake.js', 'assets/tutoring-intake-config.js', 'assets/branding/spg-guild-badge.png', 'assets/branding/spg-compass-logo.png']) assert.equal(existsSync(resolve(root, asset)), true, asset);
passed++;

console.log(`Tutoring intake: ${passed} connection, consent, lazy-embed, cancel, privacy, and navigation checks passed.`);
