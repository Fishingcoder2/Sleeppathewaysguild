import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const [visualSource,contextSource,visualPack,contextPack]=await Promise.all([
  readFile(join(root,'core','visual-psg-renderer.js'),'utf8'),
  readFile(join(root,'core','scoring-context-renderer.js'),'utf8'),
  readFile(join(root,'data','visual','prototype-sleep-staging.json'),'utf8').then(JSON.parse),
  readFile(join(root,'data','scoring','context-cases.json'),'utf8').then(JSON.parse)
]);
const sandbox={globalThis:{},Math,Object,Array,Number,String,Boolean,JSON};
sandbox.globalThis.globalThis=sandbox.globalThis;
vm.createContext(sandbox);
vm.runInContext(visualSource,sandbox,{filename:'visual-psg-renderer.js'});
vm.runInContext(contextSource,sandbox,{filename:'scoring-context-renderer.js'});
const visual=sandbox.globalThis.RPSGTVisualPSGRenderer;
const context=sandbox.globalThis.RPSGTScoringContextRenderer;
assert.ok(visual&&context);

const expected={slowWave:[0.5,2],thetaLamf:[4,7],alpha:[8,13],spindle:[11,16],spindleCommon:[12,14],sawtooth:[2,6],betaMin:14};
assert.deepEqual(JSON.parse(JSON.stringify(visual.FREQUENCY_BANDS)),expected);
assert.deepEqual(JSON.parse(JSON.stringify(context.FREQUENCY_BANDS)),{...expected,arousalFast:[6,20]});

function samplesFrom(fn,start=0,duration=12,sampleRate=100){
  const count=Math.round(duration*sampleRate);
  return Array.from({length:count},(_,index)=>fn(start+index/sampleRate));
}
function bandPower(samples,sampleRate,lo,hi,step=.2){
  const mean=samples.reduce((sum,value)=>sum+value,0)/samples.length;
  let total=0;
  for(let frequency=lo;frequency<=hi+1e-9;frequency+=step){
    let real=0,imag=0;
    for(let index=0;index<samples.length;index+=1){
      const value=(samples[index]-mean)*(0.5-0.5*Math.cos(2*Math.PI*index/Math.max(1,samples.length-1)));
      const angle=2*Math.PI*frequency*index/sampleRate;
      real+=value*Math.cos(angle);
      imag-=value*Math.sin(angle);
    }
    total+=(real*real+imag*imag)/(samples.length*samples.length);
  }
  return total;
}
const power=(trace,band)=>bandPower(trace,100,band[0],band[1]);
const ratio=(a,b)=>a/Math.max(1e-12,b);

const byStage=stage=>visualPack.studies.find(study=>study.stage===stage);
const channel=(study,label)=>study.channels.find(item=>item.label===label);
const clean=item=>({...item,features:[]});
const visualTrace=(study,label)=>samplesFrom(t=>visual.sample(clean(channel(study,label)),t),2,16,100);

const wake=visualTrace(byStage('W'),'O1-M2');
const n1=visualTrace(byStage('N1'),'F3-M2');
const n2=visualTrace(byStage('N2'),'F3-M2');
const n3=visualTrace(byStage('N3'),'C3-M2');
const rem=visualTrace(byStage('R'),'F3-M2');
assert.ok(ratio(power(wake,expected.alpha),power(wake,expected.thetaLamf))>2,'Wake occipital EEG must remain alpha-dominant.');
assert.ok(ratio(power(n1,expected.thetaLamf),power(n1,expected.alpha))>3,'N1 EEG must remain predominantly 4-7 Hz theta/LAMF rather than alpha-like.');
assert.ok(ratio(power(n2,expected.thetaLamf),power(n2,expected.alpha))>2.5,'N2 background EEG must remain LAMF/theta-dominant outside defining features.');
assert.ok(ratio(power(n3,expected.slowWave),power(n3,expected.thetaLamf))>4,'N3 background EEG must remain dominated by 0.5-2 Hz slow-wave activity.');
assert.ok(ratio(power(rem,expected.thetaLamf),power(rem,expected.alpha))>2,'REM EEG must remain low-amplitude mixed-frequency with predominant theta-range LAMF rather than alpha-dominant wakefulness.');

const contextRow={type:'eeg'};
const contextTrace=stage=>samplesFrom(t=>context.sample({stage,durationSeconds:30},contextRow,t,0),2,16,100);
for(const [stage,dominant,comparison,minimum] of [
  ['W',expected.alpha,expected.thetaLamf,2],
  ['N1',expected.thetaLamf,expected.alpha,3],
  ['N2',expected.thetaLamf,expected.alpha,2.5],
  ['N3',expected.slowWave,expected.thetaLamf,4],
  ['R',expected.thetaLamf,expected.alpha,2]
]){
  const trace=contextTrace(stage);
  assert.ok(ratio(power(trace,dominant),power(trace,comparison))>minimum,`Scoring-context ${stage} EEG is outside its intended dominant frequency character.`);
}

const n2Arousal=contextPack.cases.find(item=>item.id==='context-arousal-n2-valid').study;
const aStart=Number(n2Arousal.arousalStart),aDuration=Number(n2Arousal.arousalDuration),insideStart=aStart+.25,insideDuration=Math.max(.8,aDuration-.5),baselineStart=Math.max(1,aStart-insideDuration-1);
const before=samplesFrom(t=>context.sample(n2Arousal,contextRow,t,0),baselineStart,insideDuration,120);
const during=samplesFrom(t=>context.sample(n2Arousal,contextRow,t,0),insideStart,insideDuration,120);
const fastBand=context.FREQUENCY_BANDS.arousalFast;
assert.ok(ratio(bandPower(during,120,fastBand[0],fastBand[1]),bandPower(before,120,fastBand[0],fastBand[1]))>1.4,'Arousal 6-20 Hz energy must rise above the surrounding stage EEG.');
assert.ok(ratio(bandPower(during,120,expected.alpha[0],expected.alpha[1]),bandPower(before,120,expected.alpha[0],expected.alpha[1]))>3,'The teaching arousal must add a clear alpha-range component.');
assert.ok(ratio(bandPower(during,120,16,20),bandPower(before,120,16,20))>2,'The teaching arousal must add a clear greater-than-16-Hz component.');
assert.ok(ratio(bandPower(before,120,expected.thetaLamf[0],expected.thetaLamf[1]),bandPower(during,120,expected.thetaLamf[0],expected.thetaLamf[1]))>2,'The teaching arousal must remain an abrupt frequency shift rather than an amplified theta background.');

console.log('Rendered sleep-stage frequency bands passed: Wake alpha, N1/N2 theta-LAMF, N3 slow wave, REM LAMF, and fast arousal contrast.');
