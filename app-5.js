function practiceHit(type,time){
  if(!practice)return;let cand=practice.events.filter(e=>e.status==="pending"&&Math.abs(time-e.time)<=.155).sort((a,b)=>Math.abs(time-a.time)-Math.abs(time-b.time));
  if(!cand.length){judgeText("空打ち","#65564d");return}const e=cand[0];
  if(e.type==="bigDon"||e.type==="bigKa"){
    const ok=e.type==="bigDon"?type.startsWith("don"):type.startsWith("ka");if(!ok){judgeText("違う音","#765047");return}
    if(type.endsWith("L"))e.chord.L=true;if(type.endsWith("R"))e.chord.R=true;e.chord.times.push(time);
    if(e.chord.L&&e.chord.R){const avg=e.chord.times.reduce((a,b)=>a+b,0)/e.chord.times.length;scoreEvent(e,Math.abs(avg-e.time))}
    else judgeText("もう片方！","#d49c27");return
  }
  if(!match(e.type,type,$("handMode").value)){judgeText("左右／音を確認","#765047");return}
  scoreEvent(e,Math.abs(time-e.time))
}
function scoreEvent(e,d){
  if(e.status!=="pending")return;if(d<=.055){e.status="great";practice.great++;practice.weighted+=1;judgeText("良","#f2b134")}
  else{e.status="good";practice.good++;practice.weighted+=.5;judgeText("可","#5e9dc7")}practice.combo++
}
function score(){return practice?.total?Math.round(practice.weighted/practice.total*1000000):0}
function updateHud(){
  if(!practice)return;const judged=practice.great+practice.good+practice.miss;$("score").textContent=score().toLocaleString();$("combo").textContent=practice.combo;
  $("accuracy").textContent=(judged?Math.round((practice.great+.5*practice.good)/judged*100):0)+"%"
}
function resetHud(){$("score").textContent="0";$("combo").textContent="0";$("accuracy").textContent="0%"}
let jt=null;function judgeText(t,c){$("judgement").textContent=t;$("judgement").style.background=c;clearTimeout(jt);jt=setTimeout(()=>$("judgement").style.background="transparent",260)}
function finishPractice(){
  if(!practice||practice.done)return;practice.done=true;practice.events.forEach(e=>{if(e.status==="pending"){e.status="miss";practice.miss++}});updateHud();
  const final=score();$("greatCount").textContent=practice.great;$("goodCount").textContent=practice.good;$("missCount").textContent=practice.miss;$("finalScore").textContent=final.toLocaleString();
  const scores=getScores(),old=scores[practice.chart.id]||0;if(final>old){scores[practice.chart.id]=final;setScores(scores);$("highScoreText").textContent="🎉 ハイスコア更新！"}else $("highScoreText").textContent=`ハイスコア：${old.toLocaleString()}`;
  $("resultPanel").classList.add("show");$("practice").classList.remove("practice-live");$("judgement").textContent="終了";$("startPracticeBtn").disabled=false;$("stopPracticeBtn").disabled=true;
  if(scheduler){clearInterval(scheduler);scheduler=null}if(audioEl){audioEl.pause();URL.revokeObjectURL(audioEl.src);audioEl=null}
}
function drawLane(){
  const c=$("lane"),g=c.getContext("2d"),dpr=devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||310;
  if(c.width!==Math.floor(w*dpr)||c.height!==Math.floor(h*dpr))c.width=Math.floor(w*dpr),c.height=Math.floor(h*dpr);
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.fillStyle="#211c19";g.fillRect(0,0,w,h);
  const y=h*.53,x=w*.17;
  const sizeScale = Number($("noteSizeInput")?.value||100) / 100;
  const noteRadius = 21 * sizeScale;
  g.fillStyle="#efe4cf";g.fillRect(0,y-55,w,110);g.strokeStyle="#6b5544";g.lineWidth=3;g.strokeRect(0,y-55,w,110);
  g.fillStyle="#fff8e9";g.beginPath();g.arc(x,y,noteRadius,0,Math.PI*2);g.fill();g.strokeStyle="#a62b27";g.lineWidth=7;g.stroke();
  g.fillStyle="#a62b27";g.font=`bold ${Math.max(11,12*sizeScale)}px system-ui`;g.textAlign="center";g.fillText("ここで打つ",x,y+4);
  if(!practice){g.fillStyle="#fff";g.font="bold 23px system-ui";g.fillText("保存した曲を選んで練習開始",w/2,55);return}
  const now=audio().currentTime;
  const spacingScale = Number($("spacingInput")?.value||100) / 100;
  const px = (Math.min(520,w*.64)/Math.max(.8,practice.beat*4)) * spacingScale;
  practice.events.forEach(e=>{
    const nx=x+(e.time-now)*px;
    if(nx<-(noteRadius+24)||nx>w+noteRadius+24)return;
    g.globalAlpha=e.status==="pending"?1:.22;
    g.fillStyle=colors[e.type]||"#aaa";
    g.beginPath();g.arc(nx,y,noteRadius,0,Math.PI*2);g.fill();
    g.strokeStyle="#fff";g.lineWidth=3;g.stroke();
    g.fillStyle="#fff";
    g.font=`bold ${Math.max(10,11*sizeScale)}px system-ui`;
    g.fillText(short(e.type),nx,y+4);
  });
  g.globalAlpha=1
}
function short(t){return{donL:"左",donR:"右",kaL:"左",kaR:"右",bigDon:"左右",bigKa:"左右"}[t]||""}
function flash(type){document.querySelectorAll(`[data-hit="${type}"]`).forEach(el=>{el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),80)})}
function inputHit(type){
  const a=audio(),time=a.currentTime;playHit(type,time);flash(type);
  if(recording&&time>=recording.recordStart&&time<=recording.end){recording.raw.push({type,time});addHitChip(type)}
  practiceHit(type,time)
}
document.querySelectorAll("[data-hit]").forEach(zone=>{
  zone.addEventListener("pointerdown",e=>{
    e.preventDefault();
    e.stopPropagation();
    try{zone.setPointerCapture?.(e.pointerId)}catch{}
    inputHit(zone.dataset.hit);
  },{passive:false});
  zone.addEventListener("contextmenu",e=>e.preventDefault());
});
addEventListener("keydown",e=>{if(e.repeat||["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;const map={a:"kaL",s:"donL",k:"donR",l:"kaR"},t=map[e.key.toLowerCase()];if(t){e.preventDefault();inputHit(t)}});
$("audioInput").onchange=e=>{chosenAudio=e.target.files?.[0]||null;$("audioFileName").textContent=chosenAudio?chosenAudio.name:"音源なし：メトロノームで練習"};
$("barsInput").oninput=()=>{if(!recording&&!currentChart)$("recordProgress").textContent=`0 / ${$("barsInput").value||4}小節`};
addEventListener("resize",drawLane);addEventListener("beforeunload",()=>stopPractice(false));
