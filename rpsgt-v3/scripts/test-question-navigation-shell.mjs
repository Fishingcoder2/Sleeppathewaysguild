import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const mentoringHtml=read('mentoring-diagnostic.html');
const mentoringJs=read('core/mentoring-diagnostic.js');
const mentoringCss=read('assets/mentoring-diagnostic.css');
const mathHtml=read('math-coach.html');
const mathNav=read('core/math-question-navigation.js');
const mathCss=read('assets/math-question-modal.css');
const memoryHtml=read('memory-games.html');
const memoryNav=read('core/memory-arcade-navigation.js');
const memoryCss=read('assets/memory-arcade.css');

assert.match(mentoringHtml,/data-md-session[^>]+role="dialog"[^>]+aria-modal="true"/);
assert.match(mentoringJs,/data-md-close/);
assert.match(mentoringJs,/Resume diagnostic/);
assert.match(mentoringJs,/data-md-prev/);
assert.match(mentoringJs,/data-md-next/);
assert.match(mentoringJs,/Question navigator/);
assert.match(mentoringJs,/closeSession\(\)/);
assert.match(mentoringCss,/position:fixed;inset:0/);
assert.match(mentoringCss,/\.md-nav\{position:sticky/);
assert.match(mentoringCss,/body\.md-session-open\{overflow:hidden\}/);

assert.match(mathHtml,/core\/math-question-navigation\.js/);
assert.match(mathNav,/data-math-set-prev/);
assert.match(mathNav,/data-math-set-next/);
assert.match(mathNav,/data-math-set-progress/);
assert.match(mathNav,/field\.hidden=i!==safe/);
assert.match(mathNav,/Question \$\{safe\+1\} of \$\{fields\.length\}/);
assert.match(mathCss,/\.math-set-navigation\{position:sticky/);
assert.match(mathCss,/\.math-set-question\[hidden\]\{display:none!important\}/);

assert.match(memoryHtml,/core\/memory-arcade-navigation\.js/);
assert.match(memoryNav,/Next challenge →/);
assert.match(memoryNav,/Choose another game/);
assert.match(memoryNav,/data-arcade-next-challenge/);
assert.match(memoryCss,/\.arcade-next-actions/);
assert.match(memoryCss,/position:sticky/);

console.log('Focused question navigation contract passed for Mentoring Diagnostic, Math Coach, and Memory Arcade.');