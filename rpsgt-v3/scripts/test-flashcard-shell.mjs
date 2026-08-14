import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,css,v2css,realCss,engine,store,ui,visual,v2library,archivedDeckText,currentOverlayText,notesHtml,notesJs,memoryHtml,memoryJs,toolsCss]=await Promise.all([
  readFile(join(root,'flashcards.html'),'utf8'),
  readFile(join(root,'assets','flashcards.css'),'utf8'),
  readFile(join(root,'assets','flashcards-v2-layout.css'),'utf8'),
  readFile(join(root,'assets','flashcards-real-card.css'),'utf8'),
  readFile(join(root,'core','flashcard-engine.js'),'utf8'),
  readFile(join(root,'core','flashcard-store.js'),'utf8'),
  readFile(join(root,'core','flashcards.js'),'utf8'),
  readFile(join(root,'core','flashcard-visual.js'),'utf8'),
  readFile(join(root,'core','flashcard-v2-library.js'),'utf8'),
  readFile(join(root,'data','flashcards-v2-extracted.json'),'utf8'),
  readFile(join(root,'data','flashcards-v2-current-overlay.json'),'utf8'),
  readFile(join(root,'notes.html'),'utf8'),
  readFile(join(root,'core','notes.js'),'utf8'),
  readFile(join(root,'memory-games.html'),'utf8'),
  readFile(join(root,'core','memory-games.js'),'utf8'),
  readFile(join(root,'assets','study-tools.css'),'utf8')
]);

for(const required of [
  'data-card-domain','data-card-task','data-card-topic','data-card-status','data-card-library','data-card-tile',
  'data-card-stage','data-card-close','data-card-flip','data-card-prev','data-card-next','data-card-shuffle','data-card-flag','data-card-flag-state',
  'data-card-mastered','data-card-review-again','data-custom-card-form','data-card-show-flagged',
  'data-card-front-domain','data-card-front-task','data-card-front-study-area','data-card-dialog',
  'Make your own card','FRONT OF CARD','BACK OF CARD','RPSGT alignment:','References:','Coach Bob','memory-games.html','notes.html'
]) assert.ok(html.includes(required)||ui.includes(required),'Missing Flashcard Center contract: '+required);

const scriptOrder=[
  'core/storage.js','core/app-shell.js','core/flashcard-engine.js','core/flashcard-store.js','core/flashcard-v2-library.js','core/flashcards.js','core/flashcard-visual.js'
].map(path=>html.indexOf(path));
assert.ok(scriptOrder.every(index=>index>=0),'A required Flashcard Center script is missing.');
assert.deepEqual(scriptOrder.slice().sort((a,b)=>a-b),scriptOrder,'Flashcard scripts must load in dependency order.');
assert.ok(html.includes('assets/flashcards-v2-layout.css'),'The v2-style Flashcard layout stylesheet is missing.');
assert.ok(html.includes('assets/flashcards-real-card.css'),'The real-card Flashcard visual layer is missing.');

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
assert.match(realCss,/--card-paper/);
assert.match(realCss,/\.flashcard-front-meta/);
assert.match(realCss,/\.flashcard-review-dialog\.flashcard-theme-0/);
assert.match(realCss,/\.flashcard-resource-list/);
assert.match(realCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(visual,/function themeIndex/);
assert.match(visual,/Broad RPSGT review/);
assert.match(visual,/Cross-task concept/);
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

const archivedDeck=JSON.parse(archivedDeckText);
const currentOverlay=JSON.parse(currentOverlayText);
assert.equal(archivedDeck.cardCount,326,'Archived extraction contract changed unexpectedly.');
assert.equal(currentOverlay.excludeArchivedIds.length,14,'Current-copy overlay must exclude the 14 archived-only helper cards.');
assert.equal(currentOverlay.addCards.length,20,'Current-copy overlay must add all 20 runtime sleep-disorder flashcards.');
assert.equal(currentOverlay.expectedFinalCardCount,332);
assert.equal(currentOverlay.expectedFinalCategoryCount,19);
assert.equal(currentOverlay.source.sha256,'100a845b31f95676d46f9a4b9af7a099ccd1bdd5ec26e57c598c4449f41f99b4');

const sandbox={};
vm.createContext(sandbox);
vm.runInContext(v2library,sandbox,{filename:'flashcard-v2-library.js'});
const v2api=sandbox.RPSGTV2FlashcardLibrary;
assert.ok(v2api,'V2 flashcard library API did not initialize.');
const finalDeck=v2api.validatePayload(v2api.applyOverlay(archivedDeck,currentOverlay),currentOverlay);
assert.equal(finalDeck.cardCount,332);
assert.equal(finalDeck.categoryCount,19);
assert.equal(new Set(finalDeck.cards.map(card=>card.id)).size,332,'Final V2 flashcard ids must remain unique.');
for(const id of currentOverlay.excludeArchivedIds) assert.ok(!finalDeck.cards.some(card=>card.id===id),'Archived-only card leaked into final V2 deck: '+id);
for(const card of currentOverlay.addCards){
  assert.ok(finalDeck.cards.some(item=>item.id===card.id),'Current-copy V2 card is missing: '+card.id);
  assert.ok(card.memoryClue,'Current-copy V2 common-trap text must be retained as a memory clue: '+card.id);
}
for(const category of ['Central Disorders of Hypersomnolence','Parasomnias','Sleep-Related Movement Disorders']) assert.ok(finalDeck.categories.includes(category),'Current V2 category is missing: '+category);

const seeded=v2api.asV3Cards(finalDeck);
assert.equal(seeded.length,332);
for(const card of seeded){
  for(const reference of card.recommendedResources) assert.ok(v2api.looksApa(reference),'Learner flashcard reference is not APA-style: '+reference);
}
assert.match(v2library,/flashcards-v2-current-overlay\.json/);
assert.match(v2library,/function apaOnly/);
assert.match(v2library,/function sanitizeRenderedReferences/);
assert.match(v2library,/function installApaReferenceGuard/);
assert.doesNotMatch([html,ui,v2library,visual].join('\n'),/mapped reference/i,'Learner-facing Flashcard Center must not display "mapped reference" wording.');
assert.match(html,/References:/,'Flashcard backs must label learner citations as References.');

for(const page of [notesHtml,memoryHtml]){
  assert.match(page,/name="robots" content="noindex,nofollow"/,'New RPSGT study tools must remain protected during review.');
  assert.match(page,/flashcards\.html/);
}
assert.match(notesHtml,/data-notes-title/);
assert.match(notesHtml,/data-notes-body/);
assert.match(notesHtml,/data-notes-save/);
assert.match(notesHtml,/Add Coach Bob template/);
assert.match(notesJs,/RPSGTStorage/);
assert.match(notesJs,/state\.notes/);
assert.doesNotMatch(notesJs,/localStorage/,'My Notes must use the V3 storage service rather than a second localStorage contract.');
assert.match(memoryHtml,/Memory Match/);
assert.match(memoryHtml,/Front → Answer/);
assert.match(memoryHtml,/Answer → Term/);
assert.match(memoryJs,/RPSGTV2FlashcardLibrary/);
assert.match(memoryJs,/libraryApi\.load\(\)/);
assert.match(memoryJs,/learner\.labs\.memoryGames/);
assert.doesNotMatch(memoryJs,/localStorage/,'Memory Games must use the V3 storage service rather than a second localStorage contract.');
assert.match(toolsCss,/\.memory-board/);
assert.match(toolsCss,/\.notes-layout/);

console.log('RPSGT Flashcard Center exact 332-card V2 inventory, APA-only references, category-matched real-card modal, CPSGT-style front metadata, custom-card option, My Notes, three Memory Games, category-scoped navigation, persistent review state, and V3 storage boundaries passed.');
