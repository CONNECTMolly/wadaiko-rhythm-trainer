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
      <button id="playExampleBtn" class="btn gold" type="button">👀 お手本を見る</button>
      <button id="stopExampleBtn" class="btn" type="button" disabled>停止</button>
    </div>
    <div id="exampleStatus" class="example-status">4拍カウント後、譜面を流しながら自動演奏します</div>
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

  function setIdle(message="4拍カウント後、譜面を流しながら自動演奏します"){
    playBtn.disabled=false;
    stopBtn.disabled=true;
    if(!practice&&!window.memoryCheckState)document.getElementById("startPracticeBtn").disabled=false;
    status.textContent=message;
  }

  function stopExample(message="お手本を停止しました"){
    if(exampleTimer){
      clearInterval(exampleTimer);
      exampleTimer=null;
    }
    exampleState=null;
    window.examplePlaybackState=null;
    if(!practice&&!window.memoryCheckState)document.getElementById("practice").classList.remove("practice-live");
    if(!practice&&!window.memoryCheckState)document.getElementById("judgement").textContent="準備OK";
    drawLane();
    setIdle(message);
  }

  function startExample(){
    stopExample();
    if(practice)stopPractice(false);
    if(window.memoryCheckState)window.stopMemoryCheck?.(false);

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
    const start=audioContext.currentTime+.35;
    const noteStart=start+beat*4;
    const events=[];

    chart.notes.forEach((type,index)=>{
      if(type)events.push({type,index,time:noteStart+index*step,status:"pending"});
    });

    exampleState={
      chart,
      bpm,
      start,
      noteStart,
      beat,
      step,
      clickIndex:0,
      eventIndex:0,
      events,
      end:noteStart+chart.notes.length*step+.35
    };
    window.examplePlaybackState=exampleState;

    playBtn.disabled=true;
    stopBtn.disabled=false;
    document.getElementById("startPracticeBtn").disabled=true;
    document.getElementById("practice").classList.add("practice-live");
    document.getElementById("resultPanel").classList.remove("show");
    document.getElementById("memoryResultPanel")?.classList.remove("show");
    document.getElementById("judgement").textContent="お手本";
    status.textContent="4拍カウント：1 / 4";
    arrangeMobilePracticeView();
    drawLane();

    const lookAhead=.12;
    exampleTimer=setInterval(()=>{
      if(!exampleState)return;
      const now=audioContext.currentTime;

      while(exampleState.clickIndex<4&&exampleState.start+exampleState.clickIndex*beat<now+lookAhead){
        const clickTime=exampleState.start+exampleState.clickIndex*beat;
        clickBeat(exampleState.clickIndex===0,clickTime);
        exampleState.clickIndex++;
      }

      if(now<exampleState.noteStart){
        const count=Math.min(4,Math.max(1,Math.floor((now-exampleState.start)/beat)+1));
        status.textContent=`4拍カウント：${count} / 4`;
      }else{
        status.textContent=`譜面を見ながらお手本再生中　BPM ${Math.round(bpm)}`;
      }

      while(exampleState.eventIndex<exampleState.events.length&&exampleState.events[exampleState.eventIndex].time<now+lookAhead){
        const event=exampleState.events[exampleState.eventIndex];
        playHit(event.type,event.time);
        flashAt(event.type,(event.time-now)*1000);
        exampleState.eventIndex++;
      }

      drawLane();
      if(now>=exampleState.end)stopExample("お手本の演奏が終わりました");
    },25);
  }

  window.startExamplePlayback=startExample;
  window.stopExamplePlayback=stopExample;
  playBtn.addEventListener("click",startExample);
  stopBtn.addEventListener("click",()=>stopExample());
  document.getElementById("startPracticeBtn").addEventListener("click",()=>{
    if(exampleState)stopExample("練習モードを開始します");
  });
  document.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click",()=>{
      if(tab.dataset.tab!=="practice"&&exampleState)stopExample();
    });
  });
  window.addEventListener("beforeunload",()=>stopExample(""));
})();