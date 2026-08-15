(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.RPSGTStudyCalculator=api;
  root.RPSGTPracticeCalculator=api;
  if(root.document){
    const styleHref='assets/practice-calculator.css';
    if(!root.document.querySelector(`link[href="${styleHref}"]`)){
      const link=root.document.createElement('link');
      link.rel='stylesheet';
      link.href=styleHref;
      link.dataset.studyCalculatorStyle='true';
      root.document.head.appendChild(link);
    }
    const start=()=>api.init(root.document);
    if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MAX_EXPRESSION_LENGTH=120;
  const HOST_SELECTOR='[data-study-calculator],[data-practice-calculator]';
  const DEFAULT_STATUS='Basic arithmetic · nothing is saved';

  function normalizeExpression(value){
    return String(value==null?'':value)
      .replace(/[×xX]/g,'*')
      .replace(/÷/g,'/')
      .replace(/[−–—]/g,'-')
      .replace(/\s+/g,'');
  }

  function tokenize(value){
    const source=normalizeExpression(value);
    if(source.length>MAX_EXPRESSION_LENGTH) throw new Error('Calculation is too long.');
    if(!source) return [];
    if(!/^[0-9+\-*/().%]+$/.test(source)) throw new Error('Use numbers and basic arithmetic symbols only.');
    const tokens=[];
    let index=0;
    while(index<source.length){
      const char=source[index];
      if(/[0-9.]/.test(char)){
        const start=index;
        let dots=0;
        while(index<source.length&&/[0-9.]/.test(source[index])){
          if(source[index]==='.') dots+=1;
          index+=1;
        }
        const raw=source.slice(start,index);
        if(dots>1||raw==='.') throw new Error('Check the decimal point.');
        const number=Number(raw);
        if(!Number.isFinite(number)) throw new Error('Check the number entered.');
        tokens.push({type:'number',value:number});
        continue;
      }
      tokens.push({type:char,value:char});
      index+=1;
    }
    return tokens;
  }

  function evaluate(expression){
    const tokens=tokenize(expression);
    if(!tokens.length) throw new Error('Enter a calculation.');
    let index=0;
    const peek=()=>tokens[index]||null;
    const take=type=>{
      const token=peek();
      if(token&&token.type===type){index+=1;return token;}
      return null;
    };

    function parsePrimary(){
      const number=take('number');
      if(number) return number.value;
      if(take('(')){
        const value=parseExpression();
        if(!take(')')) throw new Error('Close the parenthesis.');
        return value;
      }
      throw new Error('Check the calculation.');
    }
    function parsePostfix(){let value=parsePrimary();while(take('%')) value/=100;return value;}
    function parseUnary(){if(take('+')) return parseUnary();if(take('-')) return -parseUnary();return parsePostfix();}
    function parseTerm(){
      let value=parseUnary();
      while(true){
        if(take('*')) value*=parseUnary();
        else if(take('/')){const divisor=parseUnary();if(divisor===0) throw new Error('Cannot divide by zero.');value/=divisor;}
        else break;
      }
      return value;
    }
    function parseExpression(){
      let value=parseTerm();
      while(true){if(take('+')) value+=parseTerm();else if(take('-')) value-=parseTerm();else break;}
      return value;
    }

    const result=parseExpression();
    if(index!==tokens.length) throw new Error('Check the calculation.');
    if(!Number.isFinite(result)) throw new Error('Result is outside the calculator range.');
    return Object.is(result,-0)?0:result;
  }

  function formatResult(value){
    const number=Number(value);
    if(!Number.isFinite(number)) throw new Error('Result is outside the calculator range.');
    if(Object.is(number,-0)||Math.abs(number)<1e-12) return '0';
    const magnitude=Math.abs(number);
    if(magnitude>=1e12||magnitude<1e-9) return number.toExponential(8).replace(/\.0+e/,'e').replace(/(\.\d*?)0+e/,'$1e');
    return String(Number(number.toFixed(10)));
  }

  function calculate(expression){return formatResult(evaluate(expression));}

  function sanitizeInput(value){
    return String(value==null?'':value)
      .replace(/[×xX]/g,'*')
      .replace(/÷/g,'/')
      .replace(/[−–—]/g,'-')
      .replace(/[^0-9+\-*/().%\s]/g,'')
      .slice(0,MAX_EXPRESSION_LENGTH);
  }

  function initHost(host){
    if(!host||host.dataset.calculatorReady==='true') return Boolean(host);
    const display=host.querySelector('[data-calculator-display]');
    const status=host.querySelector('[data-calculator-status]');
    if(!display||!status) return false;
    host.dataset.calculatorReady='true';

    const setStatus=(message,isError)=>{status.textContent=message;status.classList.toggle('error-text',Boolean(isError));};
    const clear=()=>{display.value='';display.dataset.calculated='false';setStatus(DEFAULT_STATUS,false);display.focus();};
    const backspace=()=>{
      const start=Number.isFinite(display.selectionStart)?display.selectionStart:display.value.length;
      const end=Number.isFinite(display.selectionEnd)?display.selectionEnd:start;
      if(start!==end) display.setRangeText('',start,end,'end');
      else if(start>0) display.setRangeText('',start-1,start,'end');
      display.dataset.calculated='false';setStatus(DEFAULT_STATUS,false);display.focus();
    };
    const append=value=>{
      const token=String(value||'');
      if(display.dataset.calculated==='true'&&/^[0-9.(]$/.test(token)) display.value='';
      const start=Number.isFinite(display.selectionStart)?display.selectionStart:display.value.length;
      const end=Number.isFinite(display.selectionEnd)?display.selectionEnd:start;
      if(display.value.length+token.length<=MAX_EXPRESSION_LENGTH) display.setRangeText(token,start,end,'end');
      display.dataset.calculated='false';setStatus(DEFAULT_STATUS,false);display.focus();
    };
    const compute=()=>{
      const expression=display.value;
      try{const result=calculate(expression);display.value=result;display.dataset.calculated='true';setStatus(`${normalizeExpression(expression)} = ${result}`,false);}
      catch(error){display.dataset.calculated='false';setStatus(error&&error.message||'Check the calculation.',true);}
      display.focus();
    };

    host.addEventListener('click',event=>{
      const valueButton=event.target.closest('[data-calculator-value]');
      if(valueButton&&host.contains(valueButton)){append(valueButton.dataset.calculatorValue);return;}
      const actionButton=event.target.closest('[data-calculator-action]');
      if(!actionButton||!host.contains(actionButton)) return;
      const action=actionButton.dataset.calculatorAction;
      if(action==='clear') clear();
      else if(action==='backspace') backspace();
      else if(action==='calculate') compute();
    });
    display.addEventListener('input',()=>{const safe=sanitizeInput(display.value);if(display.value!==safe) display.value=safe;display.dataset.calculated='false';setStatus(DEFAULT_STATUS,false);});
    display.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key==='='){event.preventDefault();compute();}else if(event.key==='Escape'){event.preventDefault();clear();}});
    return true;
  }

  function init(scope){
    const documentRef=scope&&scope.querySelectorAll?scope:null;
    if(!documentRef) return 0;
    const hosts=[...documentRef.querySelectorAll(HOST_SELECTOR)];
    return hosts.reduce((count,host)=>count+(initHost(host)?1:0),0);
  }

  return {MAX_EXPRESSION_LENGTH,HOST_SELECTOR,normalizeExpression,tokenize,evaluate,formatResult,calculate,sanitizeInput,initHost,init};
});
