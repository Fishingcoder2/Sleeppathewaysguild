import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [guideJs,guideCss,sharedJs,sharedCss]=await Promise.all([
  readFile(join(root,'core','respiratory-study-guide.js'),'utf8'),
  readFile(join(root,'assets','respiratory-study-guide.css'),'utf8'),
  readFile(join(root,'core','shared-visual-display.js'),'utf8'),
  readFile(join(root,'assets','shared-visual-display.css'),'utf8')
]);

for(const source of [guideJs,sharedJs]){
  if(source.includes('MutationObserver'))throw new Error('Guided respiratory review and visual disclosure must remain event-driven; MutationObserver is forbidden.');
  if(source.includes("window.addEventListener('resize'"))throw new Error('Guided respiratory review must not add continuous resize-driven rendering.');
}

for(const token of [
  'Open guided review',
  'Step 1 · Guided review',
  'Step 2 · Apply the relationship',
  'Reveal teaching answer',
  'Step 3 · What you reviewed',
  'You should now be able to:',
  'Further self-guided study',
  'Continue to next station',
  'You completed the seven-station walkthrough',
  'Stations are recorded automatically as you complete the walkthrough.',
  'state.bypass=true',
  'button.click()',
  'Mattice, C. D., Brooks, R., & Lee-Chiong, T. L.',
  'American Academy of Sleep Medicine. (2023).',
  'American Association of Sleep Technologists. (n.d.). Learning Center.',
  'https://aasm.org/clinical-resources/scoring-manual/',
  'https://aastweb.org/education-events/learning-center/'
])if(!guideJs.includes(token))throw new Error(`Respiratory guided study missing ${token}`);

if(guideJs.includes('Mark reviewed'))throw new Error('The guided study layer must not tell learners to self-check a Mark reviewed checklist.');
for(const station of ['signal-inventory','airflow-pathway','effort-pathway','oxygen-carbon-dioxide','snore-position-context','event-classification','artifact-correction'])if(!guideJs.includes(`'${station}'`))throw new Error(`Guided study missing station ${station}`);

for(const token of ['respiratory-study-guide-backdrop','respiratory-study-tabs','respiratory-study-progress','respiratory-study-scenario','respiratory-study-recap','respiratory-study-sources','orientation:landscape','orientation:portrait'])if(!guideCss.includes(token))throw new Error(`Respiratory guided study CSS missing ${token}`);

for(const token of ['AI-generated teaching schematic · Not a patient recording','Real PSG tracings vary','authentic tracings','syncTeachingDisclosures','respiratory-study-guide.js','.visual-viewer,.spg-trace-fullscreen-frame,.artifact-viewer'])if(!sharedJs.includes(token))throw new Error(`Shared visual disclosure/guide loader missing ${token}`);
for(const token of ['spg-ai-visual-disclosure','spg-trace-fullscreen-frame:fullscreen>.spg-ai-visual-disclosure'])if(!sharedCss.includes(token))throw new Error(`AI visual disclosure CSS missing ${token}`);

console.log('Respiratory guided review passed: seven stations are taught through Study → Apply → Recap, completion is recorded through the existing station engine, APA-style self-study sources are shown, and AI teaching visuals carry an authentic-tracing comparison disclosure.');
