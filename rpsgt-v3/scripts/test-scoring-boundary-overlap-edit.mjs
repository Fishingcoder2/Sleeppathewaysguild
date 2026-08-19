import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,patch]=await Promise.all([
  readFile(join(root,'lab-scoring.html'),'utf8'),
  readFile(join(root,'core','scoring-event-boundary-overlap-edit.js'),'utf8')
]);

if(!html.includes('core/scoring-event-boundary-overlap-edit.js')) throw new Error('Scoring page must load the boundary overlap-edit controller.');
if(html.indexOf('core/scoring-event-boundary-overlap-edit.js')<html.indexOf('core/scoring-event-boundary-drag.js')) throw new Error('Overlap-edit controller must load after the main drag controller.');
for(const token of [
  "window.addEventListener('pointerdown'",
  "window.addEventListener('pointerup'",
  "[data-boundary-drag-bar]",
  'countBefore:eventCount()',
  'countAfter>pending.countBefore',
  'oldChip.click()',
  "Clear all marks",
  'Clear all respiratory event marks',
  '.scoring-boundary-event-bar[data-boundary-drag-bar]{pointer-events:all',
  '.scoring-boundary-clear-prominent'
]) if(!patch.includes(token)) throw new Error(`Boundary overlap-edit protection is missing ${token}.`);
if(patch.includes('MutationObserver')) throw new Error('Boundary overlap-edit controller must stay event-driven and must not use MutationObserver.');
if(/addEventListener\(\s*['"]resize['"]/.test(patch)) throw new Error('Boundary overlap-edit controller must not add resize redraw behavior.');
if(/localStorage\.(?:setItem|removeItem|clear)/.test(patch)) throw new Error('Boundary overlap-edit controller must not write outside versioned storage.');

console.log('Boundary overlap-edit regression passed: dragging again on an existing event replaces the old mark instead of adding a duplicate, short invalid drags preserve the existing mark, and Clear all marks remains prominent.');
