(function(){
'use strict';
const host=document.querySelector('[data-report-reading-practicum]');
if(!host)return;
function enhance(){
 const result=host.querySelector('.report-practicum-result');
 const toolbar=result&&result.querySelector('.report-practicum-toolbar');
 if(!toolbar||toolbar.querySelector('[data-report-answer-key-link]'))return;
 const link=document.createElement('a');link.className='btn secondary';link.href='report-reading-answer-key.html';link.textContent='Annotated answer key';link.dataset.reportAnswerKeyLink='true';toolbar.appendChild(link);
}
new MutationObserver(enhance).observe(host,{childList:true,subtree:true});enhance();
})();
