import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,css,v2css,engine,store,ui]=await Promise.all([
  readFile(join(root,'flashcards.html'),'utf8'),
  readFile(join(root,'assets','flashcards.css'),'utf8'),
  readFile(join(root,'assets','flashcards-v2-layout.css'),'utf8'),
  readFile(join(root,'core','flashcard-engine.js'),'utf8'),
  readFile(join(root,'core','flashcard-store.js'),'utf8'),
  readFile(join(root,'core','flashcards.js'),'utf8')
]);

for(const required of [
  'data-card-domain','data-card-task','data-card-topic','data-card-status','data-card-library','data-card-tile',
  'data-card-stage','data-card-close','data-card-flip','data-card-prev','data-card-next','data-card-shuffle','data-card-flag','data-card-flag-state',
  'data-card-mastered','data-card-review-again','data-custom-card-form','data-card-show-flagged',
  'Make your own card','FRONT OF CARD','BACK OF CARD','Where to review:','Study anchors:','Coach Bob'
]) assert.ok(html.includes(required)||ui.includes(required),'Missing Flashcard Center contract: '+required);

const scriptOrder=[
  'core/storage.js','core/app-shell.js','core/flashcard-engine.js','core/flashcard-store.js','core/flashcards.js'
].map(path=>html.indexOf(path));
assert.ok(scriptOrder.every(index=>index>=0),'A required Flashcard Center script is missing.');
assert.deepEqual(scriptOrder.slice().sort((a,b)=>a-b),scriptOrder,'Flashcard scripts must load in dependency order.');
assert.ok(html.includes('assets/flashcards-v2-layout.css'),'The v2-style Flashcard layout stylesheet is missing.');

assert.match(css,/prefers-reduced-motion/);
assert.match(css,/backface-visibility:hidden/);
assert.match(css,/overflow-wrap:anywhere/);
assert.match(v2css,/\.flashcard-library/);
assert.match(v2css,/\.flashcard-category/);
assert.match(v2css,/\.flashcard-tile::before/);
assert.match(v2css,/\.flashcard-review-overlay/);
assert.match(v2css,/\.flashcard-v2-controls/);
assert.match(v2css,/\.flashcard-flag-badge/);
assert.match(v2css,/position:sticky/);
assert.doesNotMatch(engine,/referenceKeys/);
assert.doesNotMatch(engine,/studyRecommendationKeys/);
assert.match(store,/RPSGTStorage/);
assert.doesNotMatch(store,/localStorage/);
assert.doesNotMatch(ui,/localStorage/);
assert.doesNotMatch(store,/spg_rpsgtv2_/);
assert.doesNotMatch(store,/IMPORT_ENABLED\s*=\s*true/);
assert.match(ui,/function renderLibrary/);
assert.match(ui,/function openReview/);
assert.match(ui,/function closeReview/);
assert.match(ui,/function reviewCards/);
assert.match(ui,/function currentReviewCard/);
assert.match(ui,/reviewCategory/);
assert.match(ui,/categoryFor\(card\)===state\.reviewCategory/,'Modal Previous/Next must stay inside the category opened from the library.');
assert.match(ui,/data-card-mastered/);
assert.match(ui,/data-card-review-again/);
assert.match(ui,/data-card-flag/);
assert.match(ui,/data-card-shuffle/);
assert.match(ui,/card\.flagged\?'Unflag':'Flag for review'/);
assert.match(ui,/updateCurrent\(\{flagged:!card\.flagged\}\)/);
assert.match(ui,/'cardiac & ecg recognition':0/,'Cardiac & ECG Recognition must use the photographed v2 yellow note theme.');
assert.match(ui,/'ekg & cardiac terms':0/,'EKG & Cardiac Terms must stay in the v2 cardiac yellow family.');
assert.match(ui,/'circadian rhythm sleep-wake disorders':1/,'Circadian Rhythm Sleep-Wake Disorders must use the photographed v2 pink note theme.');
assert.match(ui,/'core sleep terms':2/,'Core Sleep Terms must use the photographed v2 blue note theme.');

console.log('RPSGT Flashcard Center v2-style category library, photographed pastel palette, category-scoped modal navigation, taped-note tiles, focused review modal, custom-card option, persistent flag/unflag, storage boundary, and responsive learner-control contracts passed.');