import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const values=new Map();
const localStorage={
  get length(){return values.size;},
  key(index){return [...values.keys()][index]??null;},
  getItem(key){return values.has(String(key))?values.get(String(key)):null;},
  setItem(key,value){values.set(String(key),String(value));},
  removeItem(key){values.delete(String(key));},
  clear(){values.clear();}
};
const sandbox={console,Date,JSON,TextEncoder,localStorage,document:null};
sandbox.window=sandbox;
sandbox.globalThis=sandbox;
vm.createContext(sandbox);
for(const file of ["storage.js","flashcard-engine.js","flashcard-store.js","practice-question-actions.js"]){
  const source=await readFile(join(root,"core",file),"utf8");
  vm.runInContext(source,sandbox,{filename:file});
}

const storage=sandbox.RPSGTStorage;
const actions=sandbox.RPSGTPracticeQuestionActions;
const flashcards=sandbox.RPSGTFlashcardStore;
const question={
  id:"practice-test-question",
  prompt:"Which answer should be saved as a stable Practice flashcard?",
  answer:"Correct answer",
  rationale:"The saved card keeps the learner-facing explanation.",
  domain:"D1",
  taskCode:"D1A",
  task:"Collect and analyze patient information",
  topic:"Patient information",
  options:["Correct answer","Distractor"]
};

if(!actions.toggleReview(storage,question.id,"flaggedIds")) throw new Error("Flagging did not enable the saved state");
if(!storage.load().review.flaggedIds.includes(question.id)) throw new Error("Flagging did not persist in the v3 review state");
if(!actions.toggleReview(storage,question.id,"reviewLaterIds")) throw new Error("Review later did not enable the saved state");
if(!storage.load().review.reviewLaterIds.includes(question.id)) throw new Error("Review later did not persist in the v3 review state");

const context={
  domainTitle:"Patient Information Gathering and Verification",
  taskTitle:"Collect and analyze patient information",
  taskCode:"D1A",
  recommendedResources:["Verified RPSGT Study Resource"],
  sourceContext:"Learner Practice"
};
const first=actions.saveFlashcard(flashcards,question,context,"2026-08-05T14:00:00.000Z");
const second=actions.saveFlashcard(flashcards,question,context,"2026-08-05T14:01:00.000Z");
if(!first.created) throw new Error("The first Practice flashcard was not created");
if(second.created) throw new Error("Recreating the same Practice flashcard created a duplicate");
const saved=storage.load();
if(saved.flashcards.order.length!==1) throw new Error(`Expected one stable flashcard, found ${saved.flashcards.order.length}`);
if(saved.flashcards.cards[saved.flashcards.order[0]].recommendedResources[0]!=="Verified RPSGT Study Resource") throw new Error("Verified resource title was not stored with the flashcard");
if(saved.migration.importEnabled!==false) throw new Error("Legacy import was enabled");
const writtenKeys=[...values.keys()];
if(writtenKeys.length!==1||writtenKeys[0]!=="spg_rpsgt_v3") throw new Error(`Unexpected browser-storage writes: ${writtenKeys.join(", ")}`);
for(const legacyKey of storage.LEGACY_KEYS){
  if(values.has(legacyKey)) throw new Error(`Legacy storage key was written: ${legacyKey}`);
}

console.log(JSON.stringify({
  storageKey:writtenKeys[0],
  flagged:saved.review.flaggedIds.length,
  reviewLater:saved.review.reviewLaterIds.length,
  flashcards:saved.flashcards.order.length,
  duplicatePrevented:!second.created,
  importEnabled:saved.migration.importEnabled
},null,2));
