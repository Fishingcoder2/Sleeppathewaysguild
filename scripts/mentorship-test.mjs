import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'mentorship.html'), 'utf8');
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
const configSource = readFileSync(resolve(root, 'assets/mentorship-config.js'), 'utf8');
const script = readFileSync(resolve(root, 'assets/mentorship.js'), 'utf8');
let passed = 0;

function exercise(config) {
  const link = {
    attributes: { 'aria-disabled': 'true', tabindex: '-1' },
    removeAttribute(name) { delete this.attributes[name]; }
  };
  const status = { textContent: 'pending', classList: { add(value) { this.added = value; } } };
  vm.runInNewContext(script, {
    URL,
    window: { GUILD_MENTORSHIP: config },
    document: { getElementById: id => id === 'volunteer-form-link' ? link : status }
  });
  return { link, status };
}

const complete = {
  volunteerFormUrl: 'https://docs.google.com/forms/d/e/approvedVolunteerForm/viewform?usp=sf_link',
  volunteerResponseSheetConnected: true
};
for (const config of [undefined, {}, { ...complete, volunteerFormUrl: '' }, { ...complete, volunteerResponseSheetConnected: false }]) {
  const result = exercise(config);
  assert.equal(result.link.href, undefined, 'A pending destination cannot activate the volunteer form.');
  assert.equal(result.link.attributes['aria-disabled'], 'true');
  assert.equal(result.link.attributes.tabindex, '-1');
  passed++;
}
for (const volunteerFormUrl of [
  'http://docs.google.com/forms/d/e/id/viewform',
  'https://docs.google.com.evil.example/forms/d/e/id/viewform',
  'https://evil.example/forms/d/e/id/viewform',
  'javascript:alert(1)',
  'https://docs.google.com/spreadsheets/d/privateSheet/edit',
  'https://user:password@docs.google.com/forms/d/e/id/viewform',
  'https://docs.google.com:444/forms/d/e/id/viewform'
]) {
  assert.equal(exercise({ ...complete, volunteerFormUrl }).link.href, undefined, 'Only a normal HTTPS public Google Form is accepted.');
  passed++;
}
for (const volunteerFormUrl of [complete.volunteerFormUrl, 'https://docs.google.com/forms/d/approvedVolunteerForm/viewform']) {
  const result = exercise({ ...complete, volunteerFormUrl });
  assert.equal(result.link.href, volunteerFormUrl);
  assert.equal(result.link.attributes['aria-disabled'], undefined);
  assert.equal(result.link.attributes.tabindex, undefined);
  assert.match(result.status.textContent, /unpaid.*verification.*assigned-student access/);
  passed++;
}

assert.match(html, /id="mentorship-request-email" href="mailto:admin@sleeppathwaysguild\.com\?subject=Free%20mentorship%20request"/);
assert.match(html, /<strong>short essay<\/strong>/);
assert.match(html, /administrator will explain any next steps and provide a request form when appropriate/);
assert.match(html, /Mentorship is free/);
assert.match(html, /separate program from.*paid tutoring/);
assert.match(html, /Limited seats currently/);
assert.match(html, /Volunteering is unpaid/);
const volunteerSection = html.match(/<section\b[^>]*id="volunteer"[^>]*>[\s\S]*?<\/section>/)?.[0];
const requestSection = html.match(/<section\b[^>]*id="request"[^>]*>[\s\S]*?<\/section>/)?.[0];
assert.ok(volunteerSection && requestSection, 'Volunteer eligibility and learner requests have separate sections.');
assert.match(volunteerSection, /current eligible credential.*current professional registration.*applicable state license.*current standing/);
assert.match(volunteerSection, /administrator verifies current standing before accepting a mentor/);
assert.match(volunteerSection, /Background screening is required before mentor approval, student contact or access to student information/);
assert.match(volunteerSection, /individualized review of convictions relevant to student safety and trust/);
assert.match(volunteerSection, /no blanket automatic exclusion/);
assert.match(volunteerSection, /opportunity to clarify or correct records before a decision/);
assert.match(volunteerSection, /Keep background reports and criminal-history details out of your initial email and public posts/);
assert.doesNotMatch(volunteerSection, /screening (?:has been|is) completed|(?:you|mentors) (?:have|has) passed (?:a )?background/i);
assert.doesNotMatch(requestSection, /registration|state license|screening|conviction/i, 'Volunteer eligibility does not impose new restrictions on mentorship applicants.');
assert.equal((volunteerSection.match(/<li>/g) || []).length, 4, 'The four eligible credential categories are preserved.');
passed++;
assert.match(html, /reviews volunteer applications manually and contacts applicants by email/);
assert.doesNotMatch(configSource + script, /NotificationsEnabled|notification trigger/);
for (const credential of ['RPSGT', 'CPSGT', 'MD board certified in sleep medicine', 'PhD with ABSM certification']) assert.ok(html.includes(credential));
assert.match(html, /id="volunteer-form-link"[^>]*aria-disabled="true"[^>]*tabindex="-1"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
assert.doesNotMatch(html.match(/<a\b[^>]*id="volunteer-form-link"[^>]*>/)?.[0] || '', /\bhref=/);
assert.match(html, /close that tab before submitting/);
assert.doesNotMatch(html, /<form\b|<input\b|<textarea\b|<iframe\b/);
assert.doesNotMatch(html + script, /localStorage|sessionStorage|fetch\(|XMLHttpRequest|gtag\(|googletagmanager|analytics\.ahrefs|\$\d|donat(?:e|ion)/i);
assert.doesNotMatch(html + configSource + script, /requestFormUrl|menteeFormUrl|spreadsheets\/d\/|formResponse/);
assert.match(home, /href="\/mentorship\.html">Mentorship<\/a>/);
assert.equal((home.match(/id="mentorship"/g) || []).length, 1);
assert.equal((sitemap.match(/<loc>https:\/\/sleeppathwaysguild\.com\/mentorship\.html<\/loc>/g) || []).length, 1);
for (const asset of ['assets/tutoring-intake.css', 'assets/mentorship.css', 'assets/mentorship.js', 'assets/mentorship-config.js', 'assets/branding/spg-guild-badge.png', 'assets/branding/spg-compass-logo.png']) assert.equal(existsSync(resolve(root, asset)), true, asset);
passed++;

console.log(`Mentorship: ${passed} activation, privacy, eligibility, email-first and navigation checks passed.`);
