import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const cleanBookstorePaths = new Set([
  '/rpsgt-exam-prep-books',
  '/rpsgt-exam-prep-books.html',
  'rpsgt-exam-prep-books',
  'rpsgt-exam-prep-books.html',
  'https://sleeppathwaysguild.com/rpsgt-exam-prep-books',
  'https://sleeppathwaysguild.com/rpsgt-exam-prep-books.html'
]);
const legacyShelf = 'SPG_Guild_Resource_Shelf_v1_APA_Affiliate.html';
const amazonTag = 'spg_rpsgt-20';
const scanExtensions = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.xml']);
const ignoredDirs = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build']);
const selfPath = 'scripts/audit-bookstore-links.mjs';
const failures = [];
const observations = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (scanExtensions.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}
function addFailure(file, message, detail = '') {
  failures.push({ file, message, detail });
}
function normalizedHref(href) {
  return String(href || '').trim().replace(/&amp;/g, '&');
}
function isCentralBookstoreHref(href) {
  const value = normalizedHref(href);
  return cleanBookstorePaths.has(value) || value === '#book-store' || value.startsWith('#book-store?');
}

function inspectBookstoreAnchors(file, text) {
  const anchorRe = /<a\\b([^>]*?)href\\s*=\\s*["']([^"']+)["']([^>]*)>([\\s\\S]*?)<\\/a>/gi;
  let match;
  while ((match = anchorRe.exec(text))) {
    const href = normalizedHref(match[2]);
    const label = match[4].replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
    const searchable = label + ' ' + match[1] + ' ' + match[3];
    if (!/(book\\s*store|bookstore|resource\\s*shelf)/i.test(searchable)) continue;
    if (file === 'rpsgt-exam-prep-books.html' && href.startsWith('#')) continue;
    if (!isCentralBookstoreHref(href)) {
      addFailure(file, 'Book Store / Resource Shelf link does not point to the canonical Guild bookstore.', (label || '(no label)') + ' -> ' + href);
    } else {
      observations.push(file + ': ' + (label || '(no label)') + ' -> ' + href);
    }
  }
}

function inspectLegacyRoute(file, text) {
  if (file === '_redirects' || file === selfPath) return;
  if (text.includes(legacyShelf)) addFailure(file, 'Legacy Guild Resource Shelf route is still embedded in learner-facing source.', legacyShelf);
}

function inspectAmazonLinks(file, text) {
  const urlRe = /https?:\\/\\/(?:www\\.)?(?:amazon\\.com|amzn\\.to)\\/[^\\s"'<>]+/gi;
  let match;
  while ((match = urlRe.exec(text))) {
    const url = match[0].replace(/[),.;]+$/, '');
    if (/amzn\\.to/i.test(url)) {
      addFailure(file, 'Legacy shortened Amazon link found; use a verified canonical Amazon destination.', url);
      continue;
    }
    let parsed;
    try { parsed = new URL(url); }
    catch {
      addFailure(file, 'Malformed Amazon URL.', url);
      continue;
    }
    if (parsed.searchParams.get('tag') !== amazonTag) {
      addFailure(file, 'Amazon link is missing the verified Sleep Pathways Guild Associates tag.', url);
    }
  }
}

async function assertRequiredFiles() {
  const redirects = await fs.readFile(path.join(repoRoot, '_redirects'), 'utf8');
  const requiredRedirect = '/' + legacyShelf + ' /rpsgt-exam-prep-books 301';
  if (!redirects.split(/\\r?\\n/).map(line => line.trim()).includes(requiredRedirect)) {
    addFailure('_redirects', 'Legacy Guild Resource Shelf redirect is missing or no longer targets the canonical bookstore.', requiredRedirect);
  }
  const sitemap = await fs.readFile(path.join(repoRoot, 'sitemap.xml'), 'utf8');
  if (!sitemap.includes('<loc>https://sleeppathwaysguild.com/rpsgt-exam-prep-books</loc>')) {
    addFailure('sitemap.xml', 'Canonical bookstore URL is missing from sitemap.xml.');
  }
  const homepage = await fs.readFile(path.join(repoRoot, 'index.html'), 'utf8');
  if (!homepage.includes('href="/rpsgt-exam-prep-books"') && !homepage.includes('href="https://sleeppathwaysguild.com/rpsgt-exam-prep-books"')) {
    addFailure('index.html', 'Homepage does not contain a direct canonical Book Store link.');
  }
}

await assertRequiredFiles();
const files = await walk(repoRoot);
for (const full of files) {
  const file = rel(full);
  if (file === selfPath) continue;
  let text;
  try { text = await fs.readFile(full, 'utf8'); }
  catch { continue; }
  inspectBookstoreAnchors(file, text);
  inspectLegacyRoute(file, text);
  inspectAmazonLinks(file, text);
}

if (failures.length) {
  console.error('Bookstore link audit failed with ' + failures.length + ' issue(s):');
  for (const item of failures) {
    console.error('- ' + item.file + ': ' + item.message + (item.detail ? '\\n  ' + item.detail : ''));
  }
  process.exit(1);
}

console.log('Bookstore link audit passed across ' + files.length + ' HTML/JS/XML source files.');
console.log('Canonical bookstore: https://sleeppathwaysguild.com/rpsgt-exam-prep-books');
console.log('Verified Amazon Associates tag: ' + amazonTag);
if (observations.length) {
  console.log('Learner-facing Book Store links checked:');
  for (const line of observations) console.log('- ' + line);
}
