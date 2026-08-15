import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [practiceHtml,mathHtml,source,css]=await Promise.all([
  readFile(join(root,'practice.html'),'utf8'),
  readFile(join(root,'math-coach.html'),'utf8'),
  readFile(join(root,'core','practice-calculator.js'),'utf8'),
  readFile(join(root,'assets','practice-calculator.css'),'utf8')
]);

const context={globalThis:{},module:{exports:{}},exports:{},Number,String,Boolean,Math,Object,Array,Error,RegExp};
vm.createContext(context);
vm.runInContext(source,context,{filename:'practice-calculator.js'});
const calculator=context.module.exports;
assert.ok(calculator,'Calculator API did not load.');

assert.equal(calculator.calculate('2+3*4'),'14','Multiplication must be evaluated before addition.');
assert.equal(calculator.calculate('(2+3)*4'),'20','Parentheses must alter the normal order of operations.');
assert.equal(calculator.calculate('5/2'),'2.5');
assert.equal(calculator.calculate('-4+10'),'6');
assert.equal(calculator.calculate('90*10%'),'9','Postfix percent should divide the preceding value by 100.');
assert.equal(calculator.calculate('25%'),'0.25');
assert.equal(calculator.calculate('12.5+0.75'),'13.25');
assert.equal(calculator.calculate('6×7'),'42','Displayed multiplication symbol should normalize.');
assert.equal(calculator.calculate('42÷6'),'7','Displayed division symbol should normalize.');
assert.equal(calculator.calculate('8−3'),'5','Displayed minus symbol should normalize.');
assert.throws(()=>calculator.calculate('4/0'),/divide by zero/i);
assert.throws(()=>calculator.calculate('2+abc'),/basic arithmetic symbols/i);
assert.throws(()=>calculator.calculate('(2+3'),/parenthesis/i);
assert.equal(calculator.sanitizeInput('12a+3?'),'12+3');
assert.match(calculator.HOST_SELECTOR,/data-study-calculator/);
assert.match(calculator.HOST_SELECTOR,/data-practice-calculator/);
assert.equal(source.includes('eval('),false,'Calculator must not use eval.');
assert.equal(source.includes('new Function'),false,'Calculator must not construct executable expressions.');
assert.equal(/localStorage|RPSGTStorage|sessionStorage/.test(source),false,'Calculator must not write learner or browser storage.');
assert.equal(source.includes('fetch('),false,'Calculator must not depend on network requests.');
assert.ok(source.includes('RPSGTStudyCalculator'),'Calculator should expose the shared study-tool alias.');
assert.ok(source.includes('RPSGTPracticeCalculator'),'Practice compatibility alias must remain available.');

for(const selector of ['data-practice-calculator','data-calculator-display','data-calculator-status','data-calculator-action="clear"','data-calculator-action="backspace"','data-calculator-action="calculate"']){
  assert.ok(practiceHtml.includes(selector),`Practice page is missing calculator control ${selector}.`);
}
assert.ok(practiceHtml.includes('core/practice-calculator.js'),'Practice page does not load the calculator script.');
const recordIndex=practiceHtml.indexOf('Overall learner record');
const calculatorIndex=practiceHtml.indexOf('data-practice-calculator');
assert.ok(recordIndex>=0&&calculatorIndex>recordIndex,'Calculator must appear below Overall learner record in the session rail.');

for(const token of ['id="study-calculator"','data-study-calculator','Open study calculator','temporary scratch work','core/practice-calculator.js']){
  assert.ok(mathHtml.includes(token),`Math Coach is missing shared calculator content: ${token}`);
}
const mathProgressIndex=mathHtml.indexOf('data-math-summary');
const mathCalculatorIndex=mathHtml.indexOf('data-study-calculator');
const mathCatalogIndex=mathHtml.indexOf('data-math-catalog');
assert.ok(mathProgressIndex>=0&&mathCalculatorIndex>mathProgressIndex&&mathCalculatorIndex<mathCatalogIndex,'Math Coach calculator should sit between progress and the skill catalog.');

assert.ok(source.includes("assets/practice-calculator.css"),'Calculator script must load its scoped stylesheet.');
for(const token of ['.practice-calculator-card','.practice-calculator-keys','grid-template-columns:repeat(4','.calculator-key.equals','min-height:42px','touch-action:manipulation','.math-calculator-tool']){
  assert.ok(css.includes(token),`Calculator CSS is missing ${token}.`);
}

console.log('Shared study calculator passed safe arithmetic parsing, Practice placement, Math Coach placement, touch targets, and storage isolation.');
