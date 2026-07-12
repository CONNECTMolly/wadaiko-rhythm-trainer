"use strict";
const STORE="wadaikoChartsV2", SCORE_STORE="wadaikoScoresV2";
const BUILT_IN_CHARTS=[{"id":"builtin-matsuri-2026-07-11","title":"まつり2026-07-11","bpm":100,"bars":4,"division":32,"notes":["donR","","","","","","","","donL","","","","","","","","donR","","","","","","kaR","kaL","kaR","","","","","","kaL","","donR","","","","","donR","","","","","","","","donL","","donR","","","","","","","","","bigKa","","","","","","","","donR","","","","","","","","donL","","","","","","","","donR","","","","","","kaR","kaL","kaR","","","","","","kaL","","donR","","","","","donR","","","","","","","","donL","","donR","","","","","","donL","","","donR","","","","","","",""],"rawHits":26}];
const isBuiltInChart=id=>BUILT_IN_CHARTS.some(c=>c.id===id);
const BUILTIN_REVISION_KEY="wadaikoBuiltinRevision";
const BUILTIN_REVISION="matsuri-2026-07-11-revision-2";
function ensureBuiltinRevision(){
  if(localStorage.getItem(BUILTIN_REVISION_KEY)===BUILTIN_REVISION)return;
  const stored=getStoredCharts().filter(c=>c.id!=="builtin-matsuri-2026-07-11");
  setCharts(stored);
  localStorage.setItem(BUILTIN_REVISION_KEY,BUILTIN_REVISION);
}
const labels={"":"休",donL:"左ドン",donR:"右ドン",kaL:"左カッ",kaR:"右カッ",bigDon:"両面",bigKa:"両縁"};
const colors={donL:"#d64d3f",donR:"#e46d5f",kaL:"#397fae",kaR:"#61a6cf",bigDon:"#ef5d48",bigKa:"#459ed2"};
const $=id=>document.getElementById(id);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
let ctx=null, surfaceBus=null, surfaceLimiter=null, recording=null, currentChart=null, practice=null, scheduler=null, chosenAudio=null, audioEl=null; let editMode=false, selectedEditNote="";

function audio(){
  if(!ctx){
    ctx=new(window.AudioContext||window.webkitAudioContext)();
    surfaceBus=ctx.createGain();
    surfaceLimiter=ctx.createDynamicsCompressor();
    surfaceBus.gain.value=1.85;
    surfaceLimiter.threshold.value=-12;
    surfaceLimiter.knee.value=12;
    surfaceLimiter.ratio.value=8;
    surfaceLimiter.attack.value=.003;
    surfaceLimiter.release.value=.2;
    surfaceBus.connect(surfaceLimiter);
    surfaceLimiter.connect(ctx.destination);
  }
  if(ctx.state==="suspended")ctx.resume();
  $("audioStatus").classList.add("on");
  return ctx;
}
function tone(freq,dur,gain,when,type="sine",pan=0,output=null){
  const a=audio(),o=a.createOscillator(),g=a.createGain(),p=a.createStereoPanner?a.createStereoPanner():null,destination=output||a.destination;
  o.type=type;o.frequency.setValueAtTime(freq,when);g.gain.setValueAtTime(gain,when);g.gain.exponentialRampToValueAtTime(.001,when+dur);
  o.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(destination)}else g.connect(destination);o.start(when);o.stop(when+dur)
}
function noise(dur,gain,when,pan=0,hp=300,output=null){
  const a=audio(),b=a.createBuffer(1,Math.max(1,Math.floor(a.sampleRate*dur)),a.sampleRate),d=b.getChannelData(0),destination=output||a.destination;
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),p=a.createStereoPanner?a.createStereoPanner():null;
  s.buffer=b;f.type="highpass";f.frequency.value=hp;g.gain.setValueAtTime(gain,when);g.gain.exponentialRampToValueAtTime(.001,when+dur);
  s.connect(f);f.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(destination)}else g.connect(destination);s.start(when);s.stop(when+dur)
}
function playHit(type,when=null){
  const a=audio(),t=when??a.currentTime,pan=type.endsWith("L")?-.35:type.endsWith("R")?.35:0;
  if(type.startsWith("don")||type==="bigDon"){
    const isBig=type==="bigDon";
    tone(isBig?118:142,.19,isBig?.46:.40,t,"sine",pan,surfaceBus);
    tone(isBig?86:102,.25,isBig?.34:.28,t,"triangle",pan,surfaceBus);
    tone(isBig?285:330,.085,isBig?.28:.23,t,"triangle",pan,surfaceBus);
    noise(.065,isBig?.13:.11,t,pan,260,surfaceBus);
  }else{
    tone(type==="bigKa"?820:980,.055,type==="bigKa"?.2:.14,t,"square",pan);
    noise(.045,type==="bigKa"?.2:.13,t,pan,1500);
  }
}
function clickBeat(accent,when){tone(accent?1350:950,.035,accent?.12:.075,when,"square",0)}

function switchTab(id){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));
  document.querySelectorAll("main section").forEach(s=>s.classList.toggle("active",s.id===id));
  if(id==="practice"){refreshPractice();drawLane()}
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));

function getStoredCharts(){
  try{return JSON.parse(localStorage.getItem(STORE)||"[]").map(normalize)}
  catch{return[]}
}
function getCharts(){
  const merged=new Map();
  BUILT_IN_CHARTS.map(normalize).forEach(c=>merged.set(c.id,c));
  getStoredCharts().forEach(c=>merged.set(c.id,c));
  return [...merged.values()];
}
function setCharts(v){localStorage.setItem(STORE,JSON.stringify(v))}
function getScores(){try{return JSON.parse(localStorage.getItem(SCORE_STORE)||"{}")}catch{return{}}}
function setScores(v){localStorage.setItem(SCORE_STORE,JSON.stringify(v))}
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())}
function normalize(c){
  const bars=clamp(Number(c.bars)||1,1,32);
  const division=Number(c.division)===32?32:16;
  const notes=Array(bars*division).fill("");
  (c.notes||[]).slice(0,notes.length).forEach((n,i)=>notes[i]=Object.hasOwn(labels,n)?n:"");
  return{id:c.id||uid(),title:String(c.title||"無題").slice(0,60),bpm:clamp(Number(c.bpm)||100,30,300),bars,division,notes,rawHits:Number(c.rawHits)||0}
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function refreshGeneratedSummary(){
  if(!currentChart)return;
  if($("noteCount"))$("noteCount").textContent=currentChart.notes.filter(Boolean).length;
  if($("rawCount"))$("rawCount").textContent=currentChart.rawHits||0;
  if($("summaryBpm"))$("summaryBpm").textContent=currentChart.bpm;
  if($("summaryDivision"))$("summaryDivision").textContent=`${currentChart.division}分`;
  if($("generatedTitle"))$("generatedTitle").textContent=`自動生成された${currentChart.division}分譜面`;
  if($("generatedDescription"))$("generatedDescription").textContent=
    `演奏タイミングを最も近い${currentChart.division}分音符へ丸めています。譜面修正モードで後から調整できます。`;
}
