function updateEditUI(){
  if($("editModeStatus"))$("editModeStatus").textContent=editMode?"オン":"オフ";
  if($("toggleEditBtn"))$("toggleEditBtn").textContent=editMode?"譜面修正を閉じる":"譜面修正モード";
  document.querySelectorAll(".edit-note-btn").forEach(btn=>btn.classList.toggle("selected", btn.dataset.editNote===selectedEditNote));
}

function scheduleClicks(start,bpm,count){
  if(scheduler)clearInterval(scheduler);let next=0;const beat=60/bpm;
  scheduler=setInterval(()=>{const a=audio();while(next<count&&start+next*beat<a.currentTime+.12){clickBeat(next%4===0,start+next*beat);next++}
  if(next>=count&&a.currentTime>start+count*beat+.2){clearInterval(scheduler);scheduler=null}},25)
}

function startRecording(){
  const title=$("titleInput").value.trim()||"無題";
  const bpm=clamp(Number($("bpmInput").value)||100,30,300);
  const bars=clamp(Number($("barsInput").value)||4,1,32);
  const division=Number($("quantizeInput").value)===32?32:16;
  const countBeats=4;
  const a=audio(),beat=60/bpm,start=a.currentTime+.65,recordStart=start+countBeats*beat,end=recordStart+bars*4*beat;
  recording={title,bpm,bars,division,countBeats,start,recordStart,end,raw:[],raf:null};
  currentChart=null;$("generatedPanel").classList.remove("show");$("hitStream").innerHTML="";
  $("recordBtn").disabled=true;$("stopRecordBtn").disabled=false;$("clearRecordBtn").disabled=true;
  scheduleClicks(start,bpm,countBeats+bars*4);
  updateRecording();
}
function updateRecording(){
  if(!recording)return;const now=audio().currentTime;
  const beat=60/recording.bpm;
  const dots=[...document.querySelectorAll(".count-beat")];
  if(now<recording.start){
    $("recordStatus").textContent="準備";
    $("recordProgress").textContent="4拍カウント待ち";
    dots.forEach(d=>d.className="count-beat");
  }else if(now<recording.recordStart){
    const countIndex=Math.min(3,Math.floor((now-recording.start)/beat));
    $("recordStatus").textContent="カウント中";
    $("recordProgress").textContent=`${countIndex+1} / 4拍`;
    dots.forEach((d,i)=>{
      d.className="count-beat";
      if(i<countIndex)d.classList.add("done");
      if(i===countIndex)d.classList.add("active");
    });
  }else{
    dots.forEach(d=>d.className="count-beat done");
    const elapsed=now-recording.recordStart,bar=Math.min(recording.bars,Math.floor(elapsed/(beat*4))+1);
    $("recordStatus").textContent="記録中";
    $("recordProgress").textContent=`${bar} / ${recording.bars}小節`;
  }
  if(now>=recording.end){finishRecording();return}
  recording.raf=requestAnimationFrame(updateRecording)
}
function stopRecording(){if(recording)finishRecording()}
function finishRecording(){
  if(!recording)return;const rec=recording;recording=null;if(rec.raf)cancelAnimationFrame(rec.raf);if(scheduler){clearInterval(scheduler);scheduler=null}
  const notes=Array(rec.bars*rec.division).fill("");
  const step=(60/rec.bpm)*4/rec.division;
  const grouped=new Map();
  rec.raw.forEach(h=>{const idx=clamp(Math.round((h.time-rec.recordStart)/step),0,notes.length-1);if(!grouped.has(idx))grouped.set(idx,[]);grouped.get(idx).push(h)});
  grouped.forEach((hits,idx)=>{
    hits.sort((a,b)=>a.time-b.time);
    const pairNear=(a,b)=>{const A=hits.filter(h=>h.type===a),B=hits.filter(h=>h.type===b);return A.some(x=>B.some(y=>Math.abs(x.time-y.time)<=.1))};
    if(pairNear("donL","donR"))notes[idx]="bigDon";
    else if(pairNear("kaL","kaR"))notes[idx]="bigKa";
    else{
      const target=rec.recordStart+idx*step;
      notes[idx]=hits.slice().sort((a,b)=>Math.abs(a.time-target)-Math.abs(b.time-target))[0].type;
    }
  });
  currentChart=normalize({id:uid(),title:rec.title,bpm:rec.bpm,bars:rec.bars,division:rec.division,notes,rawHits:rec.raw.length});
  $("recordStatus").textContent="登録完了";$("recordProgress").textContent=`${rec.bars}小節`;document.querySelectorAll(".count-beat").forEach(d=>d.className="count-beat done");
  $("recordBtn").disabled=false;$("stopRecordBtn").disabled=true;$("clearRecordBtn").disabled=false;
  showGenerated();
}
function cancelCurrent(){
  if(recording){if(recording.raf)cancelAnimationFrame(recording.raf);recording=null}
  if(scheduler){clearInterval(scheduler);scheduler=null}
  currentChart=null;$("hitStream").innerHTML="";$("recordStatus").textContent="待機中";
  $("recordProgress").textContent=`0 / ${$("barsInput").value||4}小節`;document.querySelectorAll(".count-beat").forEach(d=>d.className="count-beat");
  $("generatedPanel").classList.remove("show");$("recordBtn").disabled=false;$("stopRecordBtn").disabled=true;$("clearRecordBtn").disabled=true
}
$("recordBtn").onclick=startRecording;$("stopRecordBtn").onclick=stopRecording;$("clearRecordBtn").onclick=cancelCurrent;$("redoBtn").onclick=cancelCurrent;

function addHitChip(type){
  const chip=document.createElement("div");chip.className=`hit-chip ${type.startsWith("don")?"hit-don":"hit-ka"}`;chip.textContent=labels[type].replace("カッ","カ");
  $("hitStream").appendChild(chip);while($("hitStream").children.length>12)$("hitStream").firstChild.remove()
}
function showGenerated(){
  if(!currentChart)return;$("generatedPanel").classList.add("show");refreshGeneratedSummary();renderChart(currentChart,$("generatedChart"));updateEditUI()
}
