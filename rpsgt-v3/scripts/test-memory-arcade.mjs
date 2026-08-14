import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const arcade=await readFile(join(root,'core','memory-arcade.js'),'utf8');
const memory=await readFile(join(root,'core','memory-games.js'),'utf8');
const html=await readFile(join(root,'memory-games.html'),'utf8');
const css=await readFile(join(root,'assets','memory-arcade.css'),'utf8');
const manifest=JSON.parse(await readFile(join(root,'data','math-coach','manifest.json'),'utf8'));
const handbook=JSON.parse(await readFile(join(root,'data','memory','brpt-rpsgt-abbreviations.json'),'utf8'));

new Function(memory);
new Function(arcade);

for(const mode of ['formula-builder','missing-piece','units','abbreviation-sprint'])assert.match(html,new RegExp('data-arcade-mode="'+mode+'"'));
assert.match(html,/data-memory-arcade/);
assert.match(html,/memory-arcade\.css/);
assert.match(html,/core\/memory-arcade\.js/);
assert.match(html,/Retro sound:/);
assert.match(css,/arcade-build-zone/);
assert.match(css,/arcade-sprint-head/);

assert.match(memory,/window\.RPSGTMemoryGames/);
assert.match(memory,/recordMemoryResult:recordArcadeMemory/);
assert.match(memory,/saveAbbreviationSprint/);
assert.match(memory,/type\|\|'square'/);
assert.match(memory,/patterns=\{/);
assert.match(memory,/streak:/);

assert.match(arcade,/function formulaTokens/);
assert.match(arcade,/formulaCardId/);
assert.match(arcade,/unitCardId/);
assert.match(arcade,/abbreviationCardId/);
assert.match(arcade,/recordMemoryResult/);
assert.match(arcade,/remaining:60/);
assert.match(arcade,/Correct formula:/);
assert.match(arcade,/data\/math-coach\/manifest\.json/);
assert.match(arcade,/data\/memory\/brpt-rpsgt-abbreviations\.json/);

assert.equal(manifest.skillFiles.length,12);
for(const file of manifest.skillFiles){
  const skill=JSON.parse(await readFile(join(root,'data','math-coach',file),'utf8'));
  assert.ok(skill.id,'Math Coach skill missing id: '+file);
  assert.ok(skill.title,'Math Coach skill missing title: '+file);
  assert.ok(skill.formula,'Math Coach skill missing formula: '+file);
  assert.ok(skill.unit,'Math Coach skill missing unit: '+file);
}
assert.ok(handbook.items.length>=90);
for(const abbreviation of ['AHI','CPAP','RDI','REI','TST','WASO','SOREMP'])assert.ok(handbook.items.some(item=>item.abbreviation===abbreviation),'Missing sprint abbreviation '+abbreviation);

console.log('Memory Arcade passed syntax, Formula Builder, Missing Piece, Units Challenge, Abbreviation Sprint, Weak Memory hook, and retro-sound contracts.');
