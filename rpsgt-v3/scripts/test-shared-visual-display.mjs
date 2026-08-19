import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [sharedJs,sharedCss,visualHtml,visualJs,visualCss,respHtml,respJs,respCss]=await Promise.all([
  readFile(join(root,'core','shared-visual-display.js'),'utf8'),
  readFile(join(root,'assets','shared-visual-display.css'),'utf8'),
  readFile(join(root,'lab-visual.html'),'utf8'),
  readFile(join(root,'core','visual-confirmation.js'),'utf8'),
  readFile(join(root,'assets','visual-split-view.css'),'utf8'),
  readFile(join(root,'lab-respiratory.html'),'utf8'),
  readFile(join(root,'core','respiratory-visual-display.js'),'utf8'),
  readFile(join(root,'assets','respiratory-visual-display.css'),'utf8')
]);

for(const source of [sharedJs,visualJs,respJs]){
  if(source.includes('MutationObserver'))throw new Error('Shared visual display must remain event-driven; MutationObserver is forbidden.');
  if(source.includes("window.addEventListener('resize'"))throw new Error('Shared visual display must not add continuous resize-driven rendering.');
}
for(const source of [visualHtml,respHtml])if(source.includes('<iframe'))throw new Error('Visual lab display must remain native and iframe-free.');

for(const token of ['requestFullscreen','fullscreenchange','navigationUI','data-spg-request-fullscreen','SPGVisualDisplay'])if(!sharedJs.includes(token))throw new Error(`Shared fullscreen helper missing ${token}`);
for(const token of ['data-spg-visual-surface',':fullscreen','100dvh'])if(!sharedCss.includes(token))throw new Error(`Shared fullscreen CSS missing ${token}`);

for(const token of ['assets/shared-visual-display.css','assets/visual-split-view.css','core/shared-visual-display.js','data-spg-visual-surface'])if(!visualHtml.includes(token))throw new Error(`Visual Skills page missing shared display hook ${token}`);
for(const token of ['ensureViewerFullscreenControl',"existing('.visual-viewer-head')",'visual-viewer-fullscreen','data-spg-request-fullscreen','data-visual-question-layout','visual-split-view','Full question','Split view','isPhoneLandscape'])if(!visualJs.includes(token))throw new Error(`Visual Skills display logic missing ${token}`);
const panelTemplate=visualJs.match(/panel\.innerHTML=`([\s\S]*?)`;/)?.[1]||'';
if(panelTemplate.includes('data-spg-request-fullscreen'))throw new Error('Visual Skills Full screen control must stay with the PSG viewer, not the status/question launcher.');
for(const token of ['orientation:landscape','visual-split-view','visual-viewer-fullscreen','grid-template-areas:"head head" "epochs epochs" "viewer question"'])if(!visualCss.includes(token))throw new Error(`Visual Skills split CSS missing ${token}`);

for(const token of ['assets/shared-visual-display.css','assets/respiratory-visual-display.css','core/shared-visual-display.js','core/respiratory-visual-display.js','data-spg-visual-surface'])if(!respHtml.includes(token))throw new Error(`Respiratory page missing shared display hook ${token}`);
if(respHtml.includes('respiratory-surface-toolbar')||respHtml.includes('Tracing controls'))throw new Error('Respiratory Full screen must not occupy a separate instructional/control row above the tracing.');
for(const token of ['makeTraceFullscreenButton','ensureTraceFrame','spg-trace-fullscreen-frame','spg-trace-fullscreen-button','View this tracing full screen','spgRequestFullscreen'])if(!respJs.includes(token))throw new Error(`Respiratory tracing fullscreen logic missing ${token}`);
if(respJs.includes("section.querySelector(':scope > .section-head')")||respJs.includes('addFullscreenControl'))throw new Error('Respiratory Full screen controls must not be injected into instructional section headings.');
const respiratoryToolbarTemplate=respJs.match(/toolbar\.innerHTML=`([\s\S]*?)`;/)?.[1]||'';
if(respiratoryToolbarTemplate.includes('data-spg-request-fullscreen')||respiratoryToolbarTemplate.includes('spgRequestFullscreen'))throw new Error('Respiratory question toolbar must not carry Full screen; Full screen belongs on the waveform.');
for(const token of ['Rotate your phone sideways','data-respiratory-visual-layout','Full question','Split view','Are you sure?','Submit answer','Change answer','Hint'])if(!respJs.includes(token))throw new Error(`Respiratory display logic missing ${token}`);

for(const token of ['openWalkthrough','renderWalkthrough','walkthroughItems','data-respiratory-pattern-walkthrough','Guided respiratory visual walkthrough','data-respiratory-walkthrough-tab','Compare side by side','Definition & key relationship','What to notice','data-respiratory-walkthrough-prev','data-respiratory-walkthrough-next','data-resp-long-case','data-respiratory-pattern'])if(!respJs.includes(token))throw new Error(`Respiratory walkthrough logic missing ${token}`);
for(const token of ['.respiratory-walkthrough-modal','.respiratory-walkthrough-tabs','.respiratory-walkthrough-visual','.respiratory-walkthrough-compare-grid','.respiratory-walkthrough-footer','grid-template-columns:repeat(2,minmax(0,1fr))'])if(!respCss.includes(token))throw new Error(`Respiratory walkthrough CSS missing ${token}`);

for(const token of ['orientation:landscape','orientation:portrait','respiratory-full-question','.spg-trace-fullscreen-frame','.spg-trace-fullscreen-button','grid-area:trace','grid-template-columns:minmax(0,1.45fr) minmax(280px,.85fr)'])if(!respCss.includes(token))throw new Error(`Respiratory display CSS missing ${token}`);

console.log('Shared visual display passed: visual fullscreen remains attached to traces, respiratory pattern selectors open a guided walkthrough with top choices, Previous/Next and side-by-side comparison, and all visual labs remain event-driven without iframes, observers, or resize loops.');
