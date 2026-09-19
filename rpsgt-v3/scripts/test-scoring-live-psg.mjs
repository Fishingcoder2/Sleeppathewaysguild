import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const [renderer,bootstrap,css,browserSpec]=await Promise.all([
  readFile(join(root,'core','scoring-live-psg.js'),'utf8'),
  readFile(join(root,'core','scoring-event-boundary-overlap-edit.js'),'utf8'),
  readFile(join(root,'assets','scoring-live-psg.css'),'utf8'),
  readFile(join(root,'tests','browser','scoring-live-psg.spec.mjs'),'utf8')
]);

for(const token of [
  'const WINDOW_SECONDS=30',
  'function buildSharedTimeline',
  "canvas.dataset.sharedTimebase='true'",
  'canvas.dataset.syncSampleCount',
  'canvas.dataset.pixelsPerSecond',
  "host.dataset.sharedTimebase='true'",
  "canvas.dataset.channelCount=String(channels.length)"
]){
  if(!renderer.includes(token)) throw new Error('Live PSG shared-timebase contract is missing '+token+'.');
}
if(!/times\[i\]=grid\.windowStart\+ratio\*WINDOW_SECONDS/.test(renderer)||!/xs\[i\]=grid\.plotLeft\+ratio\*grid\.plotWidth/.test(renderer)){
  throw new Error('All live PSG channels must use the same precomputed time/x timeline.');
}
if(!/channels\.forEach\(\(channel,index\)=>\{[\s\S]*sample\(channel,timeline\.times\[i\]\)/.test(renderer)){
  throw new Error('Live PSG channels are not drawing from the shared frame timeline.');
}
if(!renderer.includes("return amp*breath(t,0)")||!renderer.includes("return amp*breath(t,r.obstructive?Math.PI:0)")){
  throw new Error('Baseline respiratory channels should remain phase-aligned outside the intended obstructive teaching event.');
}
for(const token of ['function viewportHeight','vh*.40','targetHeight','state.rowHeight=clamp','canvas.dataset.viewportFit']){
  if(!renderer.includes(token)) throw new Error('Live PSG viewport-fit sizing is missing '+token+'.');
}
if(!renderer.includes('const target=host;')) throw new Error('Live PSG fullscreen must include the full simulator controls, not only the tracing.');
for(const token of ['scroll-margin-top:76px',':fullscreen','max-height:820px','live-psg-key,.live-psg-event-legend,.live-psg-note{display:none}']){
  if(!css.includes(token)) throw new Error('Live PSG compact/fullscreen CSS is missing '+token+'.');
}
if(!bootstrap.includes('All 12 channels share one clock and one horizontal timebase')||!bootstrap.includes('Shared clock · 30.0 s')){
  throw new Error('Live PSG learner copy must explain the shared clock.');
}
for(const token of ['data-shared-timebase','data-viewport-fit','data-pixels-per-second']){
  if(!browserSpec.includes(token)) throw new Error('Live PSG browser regression is missing '+token+'.');
}
console.log('Live PSG regression passed: one shared 30-second timeline, aligned respiratory baseline, viewport-fit sizing, and full-simulator fullscreen behavior are protected.');
