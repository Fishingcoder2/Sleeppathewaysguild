import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const [, , inputArg, outputArg] = process.argv;
if(!inputArg || !outputArg){
  console.error('Usage: node extract-v2-flashcards.mjs <legacy-core.html> <output.json>');
  process.exit(2);
}

const input=resolve(inputArg);
const output=resolve(outputArg);
const source=await readFile(input,'utf8');
const scriptId='spg-v12-62a-reference-flashcard-button-hotfix-script';
const scriptStart=source.indexOf(scriptId);
if(scriptStart<0) throw new Error('Final v2 flashcard hotfix script was not found.');
const scriptEnd=source.indexOf('</script>',scriptStart);
if(scriptEnd<0) throw new Error('Final v2 flashcard hotfix script is not closed.');
const block=source.slice(scriptStart,scriptEnd);
const match=block.match(/var DECK = (\[[\s\S]*?\]);\s*var STORE=/);
if(!match) throw new Error('Final effective v2 DECK literal was not found.');

const legacy=JSON.parse(match[1]);
if(!Array.isArray(legacy)||!legacy.length) throw new Error('Final effective v2 DECK is empty.');
const required=['id','cat','front','back'];
const ids=new Set();
for(const [index,card] of legacy.entries()){
  for(const key of required){
    if(!String(card?.[key]||'').trim()) throw new Error(`Card ${index+1} is missing ${key}.`);
  }
  if(ids.has(card.id)) throw new Error(`Duplicate v2 flashcard id: ${card.id}`);
  ids.add(card.id);
}

const categories=[...new Set(legacy.map(card=>card.cat.trim()))].sort((a,b)=>a.localeCompare(b));
const cards=legacy.map(card=>({
  id:String(card.id).trim(),
  category:String(card.cat).trim(),
  front:String(card.front).trim(),
  back:String(card.back).trim(),
  memoryClue:String(card.watchPoint||'').trim()
}));

const record={
  schemaVersion:1,
  source:{
    branch:'rpsgt-pre-repair-20260725',
    path:'RPSGTv2.2026-core.html',
    blobSha:'4423bb6220af7fa354ce4f33acedc6f7b6a8cc53',
    deckMarker:scriptId
  },
  cardCount:cards.length,
  categoryCount:categories.length,
  categories,
  cards
};
await writeFile(output,JSON.stringify(record,null,2)+'\n','utf8');
console.log(`Extracted ${cards.length} final-effective RPSGT v2 flashcards across ${categories.length} categories.`);
console.log(categories.join(' | '));
