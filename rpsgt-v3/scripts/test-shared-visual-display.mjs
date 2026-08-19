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
for(const token of ['data-spg-request-fullscreen','data-visual-question-layout','visual-split-view','Full question','Split view','isPhoneLandscape'])if(!visualJs.includes(token))throw new Error(`Visual Skills display logic missing ${token}`);
for(const token of ['orientation:landscape','visual-split-view','grid-template-areas:"head head" "epochs epochs" "viewer question"'])if(!visualCss.includes(token))throw new Error(`Visual Skills split CSS missing ${token}`);

for(const token of ['assets/shared-visual-display.css','assets/respiratory-visual-display.css','core/shared-visual-display.js','core/respiratory-visual-display.js','data-spg-visual-surface'])if(!respHtml.includes(token))throw new Error(`Respiratory page missing shared display hook ${token}`);
for(const token of ['Rotate your phone sideways','data-respiratory-visual-layout','Full question','Split view','Are you sure?','Submit answer','Change answer','Hint','data-spg-request-fullscreen'])if(!respJs.includes(token))throw new Error(`Respiratory display logic missing ${token}`);
for(const token of ['orientation:landscape','orientation:portrait','respiratory-full-question','grid-template-columns:minmax(0,1.45fr) minmax(280px,.85fr)'])if(!respCss.includes(token))throw new Error(`Respiratory display CSS missing ${token}`);

console.log('Shared visual display passed: native fullscreen, phone landscape split/full-question modes, portrait rotate guidance, Visual Skills integration, and Respiratory visual integration are present without observers or resize loops.');
