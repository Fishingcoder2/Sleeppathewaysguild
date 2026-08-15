import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [html,source,css]=await Promise.all([
  readFile(join(root,'practice.html'),'utf8'),
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
assert.equal(source.includes('eval('),false,'Calculator must not use eval.');
assert.equal(source.includes('new Function'),false,'Calculator must not construct executable expressions.');
assert.equal(/localStorage|RPSGTStorage|sessionStorage/.test(source),false,'Calculator must not write learner or browser storage.');
assert.equal(source.includes('fetch('),false,'Calculator must not depend on network requests.');

for(const selector of ['data-practice-calculator','data-calculator-display','data-calculator-status','data-calculator-action="clear"','data-calculator-action="backspace"','data-calculator-action="calculate"']){
  assert.ok(html.includes(selector),`Practice page is missing calculator control ${selector}.`);
}
assert.ok(html.includes('core/practice-calculator.js'),'Practice page does not load the calculator script.');
const recordIndex=html.indexOf('Overall learner record');
const calculatorIndex=html.indexOf('data-practice-calculator');
assert.ok(recordIndex>=0&&calculatorIndex>recordIndex,'Calculator must appear below Overall learner record in the session rail.');
assert.ok(source.includes("assets/practice-calculator.css"),'Calculator script must load its scoped stylesheet.');
for(const token of ['.practice-calculator-card','.practice-calculator-keys','grid-template-columns:repeat(4','.calculator-key.equals','min-height:42px','touch-action:manipulation']){
  assert.ok(css.includes(token),`Calculator CSS is missing ${token}.`);
}

console.log('Practice calculator passed safe arithmetic parsing, percentage math, learner-record placement, touch targets, and storage isolation.');
