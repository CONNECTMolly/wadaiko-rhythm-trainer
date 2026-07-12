(()=>{
  const MEMORY_STORE="wadaikoMemoryScoresV1";

  const style=document.createElement("style");
  style.textContent=`
    .memory-mode-box{margin-top:14px;padding:14px;border:2px solid #dcc7a7;border-radius:14px;background:#fffaf0}
    .memory-mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .memory-mode-note{margin:10px 0 0;color:var(--muted);font-size:.88rem;line-height:1.6}
    .memory-status-line{margin-top:9px;text-align:center;font-weight:850;color:#8b2e28;min-height:1.4em}
    .memory-result{display:none;margin-top:14px;padding:16px;border-radius:16px;background:#fffdf8;border:2px solid #d8c6aa}
    .memory-result.show{display:block}
    .memory-live .hud{visibility:hidden}
    .memory-live .result{display:none!important}
    .memory-live .example-controls{opacity:.45;pointer-events:none}
    @media(max-width:600px){.memory-mode-grid{grid-template-columns:1fr}.memory-result{padding:12px}}
  `;
  document.head.appendChild(style);

  const settingsCard=document.querySelector("#practice > .card");
  const settingsInline=settingsCard?.querySelector(".inline");
  if(!settingsCard)return;

  const modeBox=document.createElement("div");
  modeBox.className="memory-mode-box";
  modeBox.innerHTML=`
    <div class="memory-mode-grid">
      <label class="field">練習モード
        <select id="practiceModeSelect">
          <option value="normal" selected>譜面を見て練習</option>
          <option value="memory">暗譜チェック</option>
        </select>
      </label>
      <label id="memoryGuideField" class="field" style="display:none">暗譜中のガイド音
        <select id="memoryGuideSelect">
          <option value="metronome" selected>拍あり（メトロノーム）</option>
          <option value="silent">完全暗譜（最初の4拍のみ）</option>
        </select>
      </label>
    </div>
    <p id="memoryModeDescription" class="memory-mode-note">流れてくる譜面を見ながら、タイミングと左右を練習します。</p>
    <div id="memoryStatusLine" class="memory-status-line"></div>
  `;
  settingsCard.insertBefore(modeBox,settingsInline||null);

  const normalResult=$("resultPanel");
  const memoryResult=document.createElement("div");
  memoryResult.id="memoryResultPanel";
  memoryResult.className="memory-result";
  normalResult.insertAdjacentElement("afterend",memoryResult);

  const modeSelect=$("practiceModeSelect");
  const guideField=$("memoryGuideField");
  const guideSelect=$("memoryGuideSelect");
  const description=$("memoryModeDescription");
  const statusLine=$("memoryStatusLine");
  const startBtn=$("startPracticeBtn");
  const stopBtn=$("stopPracticeBtn");
  const originalStartPractice=startPractice;
  const originalStopPractice=stopPractice;

  function setLocked(locked){
    [$("practiceSelect"),$("speedSelect"),$("handMode"),modeSelect,guideSelect].forEach(el=>{if(el)el.disabled=locked});
  }

  function updateModeUI(){
    const memoryMode=modeSelect.value==="memory";
    guideField.style.display=memoryMode?"flex":"none";
    description.textContent=memoryMode
      ?"譜面・判定・スコアを隠して演奏し、終了後に正解譜面と比較します。"
      :"流れてくる譜面を見ながら、タイミングと左右を練習します。";
    startBtn.textContent=memoryMode?"暗譜チェック開始":"練習スタート";
    statusLine.textContent=memoryMode?"お手本を確認したあと、譜面を見ずに挑戦できます。":"";
    memoryResult.classList.toggle("show",memoryMode&&memoryResult.dataset.hasResult==="1");
    if(!memoryMode)memoryResult.classList.remove("show");
    normalResult.classList.remove("show");
    drawLane();
  }

  function buildActual(state){
    const notes=Array(state.chart.notes.length).fill("");
    const groups=new Map();
    state.raw.forEach(hit=>{
      const index=clamp(Math.round((hit.time-state.recordStart)/state.step),0,notes.length-1);
      if(!groups.has(index))groups.set(index,[]);
      groups.get(index).push(hit);
    });
    groups.forEach((hits,index)=>{
      hits.sort((a,b)=>a.time-b.time);
      const pairNear=(left,right)=>{
        const L=hits.filter(hit=>hit.type===left),R=hits.filter(hit=>hit.type===right);
        return L.some(a=>R.some(b=>Math.abs(a.time-b.time)<=.1));
      };
      if(pairNear("donL","donR"))notes[index]="bigDon";
      else if(pairNear("kaL","kaR"))notes[index]="bigKa";
      else{
        const target=state.recordStart+index*state.step;
        notes[index]=hits.slice().sort((a,b)=>Math.abs(a.time-target)-Math.abs(b.time-target))[0]?.type||"";
      }
    });
    return{notes,groups};
  }

  function cleanupMemoryState(state){
    if(state?.raf)cancelAnimationFrame(state.raf);
    if(scheduler){clearInterval(scheduler);scheduler=null}
    window.memoryCheckState=null;
    $("practice").classList.remove("practice-live","memory-live");
    startBtn.disabled=false;
    stopBtn.disabled=true;
    setLocked(false);
    drawLane();
  }

  function finishMemoryCheck(showResult=true){
    const state=window.memoryCheckState;
    if(!state||state.done)return;
    state.done=true;
    const actual=buildActual(state);
    cleanupMemoryState(state);
    $("judgement").textContent=showResult?"採点完了":"準備OK";
    statusLine.textContent=showResult?"暗譜チェックが終わりました。結果を確認してください。":"";
    if(showResult&&typeof window.evaluateMemoryResult==="function"){
      window.evaluateMemoryResult(state,actual,modeSelect.value,$("handMode").value);
    }
  }

  function updateMemoryCheck(){
    const state=window.memoryCheckState;
    if(!state)return;
    const now=audio().currentTime;
    if(now<state.start){
      $("judgement").textContent="準備";
      statusLine.textContent="開始準備中";
    }else if(now<state.recordStart){
      const count=Math.min(4,Math.max(1,Math.floor((now-state.start)/state.beat)+1));
      $("judgement").textContent=`カウント ${count}`;
      statusLine.textContent=`4拍カウント：${count} / 4`;
    }else{
      const bar=Math.min(state.chart.bars,Math.floor((now-state.recordStart)/(state.beat*4))+1);
      $("judgement").textContent="暗譜中";
      statusLine.textContent=`譜面を見ずに演奏中　${bar} / ${state.chart.bars}小節`;
    }
    drawLane();
    if(now>=state.end){finishMemoryCheck(true);return}
    state.raf=requestAnimationFrame(updateMemoryCheck);
  }

  function startMemoryCheck(){
    window.stopExamplePlayback?.("");
    if(practice)originalStopPractice(false);
    const chart=selectedChart();
    if(!chart){alert("暗譜チェックする曲を選んでください。");return}
    if(!chart.notes.some(Boolean)){alert("選択した曲に音符がありません。");return}

    const speed=Number($("speedSelect").value||1);
    const bpm=chart.bpm*speed;
    const beat=60/bpm;
    const step=beat*4/chart.division;
    const start=audio().currentTime+.5;
    const recordStart=start+beat*4;
    const end=recordStart+chart.notes.length*step;
    const state={chart,bpm,beat,step,start,recordStart,end,raw:[],guide:guideSelect.value,raf:null,done:false};
    window.memoryCheckState=state;

    memoryResult.classList.remove("show");
    normalResult.classList.remove("show");
    $("practice").classList.add("practice-live","memory-live");
    startBtn.disabled=true;
    stopBtn.disabled=false;
    setLocked(true);
    resetHud();
    $("judgement").textContent="準備";
    statusLine.textContent="暗譜チェックを開始します";
    const clickCount=guideSelect.value==="metronome"?4+chart.bars*4:4;
    scheduleClicks(start,bpm,clickCount);
    arrangeMobilePracticeView();
    updateMemoryCheck();
  }

  window.memoryCheckHit=(type,time)=>{
    const state=window.memoryCheckState;
    if(!state||state.done)return;
    if(time>=state.recordStart&&time<=state.end)state.raw.push({type,time});
  };
  window.startMemoryCheck=startMemoryCheck;
  window.stopMemoryCheck=(showResult=true)=>{
    if(!window.memoryCheckState)return;
    finishMemoryCheck(showResult);
  };
  window.setPracticeMode=mode=>{
    modeSelect.value=mode;
    updateModeUI();
  };

  startBtn.onclick=()=>{
    if(modeSelect.value==="memory")startMemoryCheck();
    else{
      window.stopMemoryCheck?.(false);
      memoryResult.classList.remove("show");
      originalStartPractice();
    }
  };
  stopBtn.onclick=()=>{
    if(window.memoryCheckState)finishMemoryCheck(true);
    else originalStopPractice(true);
  };
  modeSelect.onchange=()=>{
    if(window.memoryCheckState)finishMemoryCheck(false);
    if(practice)originalStopPractice(false);
    window.stopExamplePlayback?.("");
    updateModeUI();
  };

  document.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click",()=>{
      if(tab.dataset.tab!=="practice"&&window.memoryCheckState)finishMemoryCheck(false);
    });
  });

  const helpCard=document.querySelector("#help .card");
  if(helpCard){
    const section=document.createElement("div");
    section.innerHTML=`<h3>暗譜チェック</h3><p>譜面を表示せずに演奏を記録し、終了後に正解譜面と比較します。拍ありと、4拍後に無音になる完全暗譜を選べます。</p>`;
    helpCard.appendChild(section);
  }

  updateModeUI();
})();