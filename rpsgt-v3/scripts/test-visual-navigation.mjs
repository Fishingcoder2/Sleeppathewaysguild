import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,js,css]=await Promise.all([
  readFile(join(root,'lab-visual.html'),'utf8'),
  readFile(join(root,'core','visual-navigation.js'),'utf8'),
  readFile(join(root,'assets','visual-navigation.css'),'utf8')
]);

for(const asset of ['assets/visual-navigation.css','core/visual-navigation.js']) if(!html.includes(asset)) throw new Error(`Visual lab is missing ${asset}.`);
for(const route of ['lab-scoring.html','lab-artifact.html','lab-respiratory.html']) if(!html.includes(route)||!js.includes(route)) throw new Error(`Visual navigation is missing the ${route} continuation route.`);
if(html.includes('spg_rpsgt_v3.labs.visual')) throw new Error('Learners must not see the internal Visual Skills storage path.');
if(!html.includes('Saved in this browser')) throw new Error('Visual Skills should use learner-facing browser-save language.');
for(const token of ['Previous visual','Next visual →','Previous epoch','Next epoch →','Suggested next visual practice','Continue to Scoring Lab visuals','Practice Artifact Recognition','Practice Respiratory visuals','data-visual-flow-action','data-visual-prev','data-visual-next','data-visual-finish']) if(!js.includes(token)) throw new Error(`Visual guided navigation is missing ${token}.`);
for(const selector of ['.visual-flow-nav','.visual-flow-main','.visual-flow-epochs','.visual-up-next','.visual-result-next']) if(!css.includes(selector)) throw new Error(`Visual navigation CSS is missing ${selector}.`);
if(!js.includes('if(!workspace.querySelector(\'[data-visual-next]\'))return null')||!js.includes('workspace.querySelector(\'[data-visual-finish]\')')) throw new Error('Up-next guidance must follow the actual Visual Skills controller state.');

console.log('Visual Skills guided navigation passed: previous/next visual, epoch shortcuts, up-next guidance, continuation routes, mobile layout, and learner-facing save language are present.');
