(()=>{
  let exampleTimer=null;
  let exampleState=null;

  const style=document.createElement("style");
  style.textContent=`
    .example-controls{
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:8px;
      margin:8px 0 10px;
    }
    .example-controls .btn{min-height:48px}
    .example-status{
      min-height:1.3em;
      margin:2px 0 8px;
      color:var(--muted);
      font-size:.85rem;
      font-weight:800;
      text-align:center;
    }
    @media(max-width:420px){
      .example-controls{grid-template-columns:minmax(0,1fr) 88px}
      .example-controls .btn{padding-left:9px;padding-right:9px}
    }
  `;
  document.head.appendChild(style);

  const practiceControls=document.querySelector("#practice .practice-start-controls");
  if(!practiceControls)return;

  const wrapper=document.createElement("div");
  wrapper.innerHTML=`
    <div class="example-controls">
      <button id="playExampleBtn" class="btn gold" type="button">🔊 お手本を聞く</button>
      <button id="stopExampleBtn" class="btn" type="button" disabled>停止</button>
    </div>
    <div id="exampleStatus" class="example-status">選択中の譜面を4拍カウント後に自動演奏します</div>
  `;
  practiceControls.parentNode.insertBefore(wrapper,practiceControls);

  const playBtn=document.getElementById("playExampleBtn");
  const stopBtn=document.getElementById("stopExampleBtn");
  const status=document.getElementById("exampleStatus");

  function flashAt(type,delayMs){
    window.setTimeout(()=>{
      document.querySelectorAll(`[data-hit="${type}"]`).forEach(el=>{
        el.classList.add("flash");
        window.setTimeout(()=>el.classList.remove("flash"),90);
      });
    },Math.max(0,delayMs));
  }

  function setIdle(message="選択中の譜面を4拍カウント後に自動演奏します"){
    playBtn.disabled=false;
    stopBtn.disabled=true;
    if(!practice)document.getElementById("startPracticeBtn").disabled=false;
    status.textContent=message;
  }

  function stopExample(message="お手本を停止しました"){
    if(exampleTimer){
      clearInterval(exampleTimer);
      exampleTimer=null;
    }
    exampleState=null;
    setIdle(message);
  }

  function startExample(){
    stopExample();
    if(practice)stopPractice(false);

    const chart=selectedChart();
    if(!chart){
      alert("お手本を再生する曲を選んでください。");
      return;
    }
    if(!chart.notes.some(Boolean)){
      alert("選択した曲に音符がありません。");
      return;
    }

    const audioContext=audio();
    const speed=Number(document.getElementById("speedSelect").value||1);
    const bpm=chart.bpm*speed;
    const beat=60/bpm;
    const step=beat*4/chart.division;
    const start=audioContext.currentTime+.25;
    const noteStart=start+beat*4;
    const events=[];

    chart.notes.forEach((type,index)=>{
      if(type)events.push({type,time:noteStart+index*step});
    });

    exampleState={
      start,
      noteStart,
      beat,
      clickIndex:0,
      eventIndex:0,
      events,
      end:noteStart+chart.notes.length*step+.35
    };

    playBtn.disabled=true;
    stopBtn.disabled=false;
    document.getElementById("startPracticeBtn").disabled=true;
    status.textContent="4拍カウント：1 / 4";

    const lookAhead=.12;
    exampleTimer=setInterval(()=>{
      if(!exampleState)return;
      const now=audioContext.currentTime;

      while(exampleState.clickIndex<4 && exampleState.start+exampleState.clickIndex*beat<now+lookAhead){
        const clickTime=exampleState.start+exampleState.clickIndex*beat;
        clickBeat(exampleState.clickIndex===0,clickTime);
        exampleState.clickIndex++;
      }

      if(now<exampleState.noteStart){
        const count=Math.min(4,Math.max(1,Math.floor((now-exampleState.start)/beat)+1));
        status.textContent=`4拍カウント：${count} / 4`;
      }else{
        status.textContent=`お手本を演奏中　BPM ${Math.round(bpm)}`;
      }

      while(exampleState.eventIndex<exampleState.events.length && exampleState.events[exampleState.eventIndex].time<now+lookAhead){
        const event=exampleState.events[exampleState.eventIndex];
        playHit(event.type,event.time);
        flashAt(event.type,(event.time-now)*1000);
        exampleState.eventIndex++;
      }

      if(now>=exampleState.end){
        stopExample("お手本の演奏が終わりました");
      }
    },25);
  }

  playBtn.addEventListener("click",startExample);
  stopBtn.addEventListener("click",()=>stopExample());
  document.getElementById("startPracticeBtn").addEventListener("click",()=>stopExample("練習モードを開始します"));
  document.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click",()=>{
      if(tab.dataset.tab!=="practice" && exampleState)stopExample();
    });
  });
  window.addEventListener("beforeunload",()=>stopExample(""));
})();
