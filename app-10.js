(()=>{
  const MEMORY_STORE="wadaikoMemoryScoresV1";

  const style=document.createElement("style");
  style.textContent=`
    .memory-result h3{margin:0 0 10px;text-align:center}
    .memory-grade{text-align:center;font-size:1.15rem;font-weight:900;margin-bottom:12px}
    .memory-score-big{text-align:center;font-size:2.7rem;line-height:1;font-weight:950;color:#a62b27;margin:8px 0 14px}
    .memory-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}
    .memory-summary-box{padding:10px 6px;border-radius:12px;background:#f2eadc;text-align:center;font-size:.76rem;font-weight:800}
    .memory-summary-box strong{display:block;font-size:1.2rem;margin-top:3px;color:#2c201b}
    .memory-breakdown{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 16px}
    .memory-breakdown>div{padding:11px;border-radius:12px;background:#2c2622;color:#fff;text-align:center;font-size:.78rem;font-weight:800}
    .memory-breakdown strong{display:block;font-size:1.3rem;color:#f4c35a;margin-top:3px}
    .memory-compare-title{margin:18px 0 8px;font-weight:900}
    .memory-compare-wrap{overflow-x:auto;padding-bottom:8px}
    .memory-measure{min-width:780px;margin-bottom:14px;border:1px solid #d8c5a6;border-radius:12px;overflow:hidden;background:#fff}
    .memory-measure-title{padding:7px 10px;background:#4a3a31;color:#fff;font-size:.78rem;font-weight:900}
    .memory-row{display:grid;align-items:stretch}
    .memory-row-label{position:sticky;left:0;z-index:2;background:#efe4cf;padding:7px 8px;font-size:.72rem;font-weight:900;border-right:2px solid #a88c68}
    .memory-cells{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(32px,1fr)}
    .memory-cell{min-height:42px;display:grid;place-items:center;border-right:1px solid #e5d9c6;border-bottom:1px solid #e5d9c6;font-size:.65rem;font-weight:900;text-align:center;padding:2px;box-sizing:border-box}
    .memory-cell.empty{color:#b9aa97;background:#fffdf8}
    .memory-cell.correct{background:#d9f0df;color:#1f6332}
    .memory-cell.hand{background:#fff0bd;color:#7a5a00}
    .memory-cell.sound{background:#f4d3d0;color:#8a2e29}
    .memory-cell.missing{background:#dedede;color:#555}
    .memory-cell.extra{background:#ead8f4;color:#6a3480}
    .memory-legend{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 14px;font-size:.75rem;font-weight:800}
    .memory-legend span{padding:5px 8px;border-radius:999px}
    .memory-result-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:15px}
    .memory-history{text-align:center;color:var(--muted);font-size:.82rem;font-weight:800;margin:8px 0}
    @media(max-width:720px){
      .memory-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .memory-breakdown{grid-template-columns:1fr}
      .memory-result-actions{grid-template-columns:1fr}
      .memory-measure{min-width:680px}
    }
  `;
  document.head.appendChild(style);

  function family(type){
    if(["donL","donR","bigDon"].includes(type))return"don";
    if(["kaL","kaR","bigKa"].includes(type))return"ka";
    return"";
  }
  function isBig(type){return type==="bigDon"||type==="bigKa"}
  function hitUnits(type){return isBig(type)?2:type?1:0}
  function label(type){return{donL:"面左",donR:"面右",kaL:"縁左",kaR:"縁右",bigDon:"両面",bigKa:"両縁","":"・"}[type]||"・"}
  function getMemoryScores(){try{return JSON.parse(localStorage.getItem(MEMORY_STORE)||"{}")}catch{return{}}}
  function setMemoryScores(value){localStorage.setItem(MEMORY_STORE,JSON.stringify(value))}

  function evaluate(state,actual,handMode){
    const expected=state.chart.notes;
    const statuses=[];
    let correct=0,hand=0,sound=0,missing=0,extra=0,extraTaps=0;
    let soundPoints=0;
    const timingErrors=[];
    let expectedCount=0;

    for(let i=0;i<expected.length;i++){
      const exp=expected[i]||"";
      const act=actual.notes[i]||"";
      const hits=actual.groups.get(i)||[];
      let status="empty";
      if(exp)expectedCount++;

      if(!exp&&!act){status="empty"}
      else if(!exp&&act){status="extra";extra++}
      else if(exp&&!act){status="missing";missing++}
      else{
        const sameExact=exp===act;
        const sameSound=family(exp)===family(act);
        const relaxedCorrect=handMode==="sound"&&sameSound&&isBig(exp)===isBig(act);
        if(sameExact||relaxedCorrect){status="correct";correct++;soundPoints+=1}
        else if(sameSound){status="hand";hand++;soundPoints+=.6}
        else{status="sound";sound++}
      }

      if(hits.length){
        const allowed=exp?hitUnits(exp):1;
        extraTaps+=Math.max(0,hits.length-allowed);
      }

      if(exp&&act&&family(exp)===family(act)&&hits.length){
        const target=state.recordStart+i*state.step;
        const relevant=hits.filter(hit=>family(hit.type)===family(exp));
        const source=relevant.length?relevant:hits;
        const times=isBig(exp)&&source.length>=2?source.slice(0,2).map(hit=>hit.time):[source.slice().sort((a,b)=>Math.abs(a.time-target)-Math.abs(b.time-target))[0].time];
        const played=times.reduce((sum,time)=>sum+time,0)/times.length;
        timingErrors.push(Math.abs(played-target)*1000);
      }
      statuses.push(status);
    }

    const actualSlots=actual.notes.filter(Boolean).length;
    const soundScore=expectedCount?Math.round(soundPoints/expectedCount*100):0;
    const positionDen=Math.max(1,expectedCount+extra+extraTaps);
    const positionScore=Math.max(0,Math.round((1-(missing+extra+extraTaps)/positionDen)*100));
    const averageTiming=timingErrors.length?timingErrors.reduce((a,b)=>a+b,0)/timingErrors.length:0;
    const timingLimit=Math.max(40,state.step*1000/2);
    const timingScore=timingErrors.length?Math.max(0,Math.round((1-Math.min(averageTiming,timingLimit)/timingLimit)*100)):0;
    const total=Math.round(soundScore*.5+positionScore*.4+timingScore*.1);
    const perfect=correct===expectedCount&&hand===0&&sound===0&&missing===0&&extra===0&&extraTaps===0;
    const grade=perfect?"完全暗譜！":total>=90?"ほぼ暗譜できています":total>=75?"あと少し":"お手本を確認しましょう";

    return{
      chart:state.chart,
      expected,
      actual:actual.notes,
      statuses,
      correct,hand,sound,missing,extra,extraTaps,
      expectedCount,actualSlots,
      soundScore,positionScore,timingScore,total,perfect,grade,
      averageTiming:Math.round(averageTiming),
      speed:Number($("speedSelect").value||1),
      guide:state.guide,
      timestamp:new Date().toISOString()
    };
  }

  function saveResult(result){
    const all=getMemoryScores();
    const old=all[result.chart.id]||{best:0,perfectCount:0,recent:[]};
    const record={
      best:Math.max(old.best||0,result.total),
      perfectCount:(old.perfectCount||0)+(result.perfect?1:0),
      lastAt:result.timestamp,
      recent:[{score:result.total,at:result.timestamp,perfect:result.perfect},...(old.recent||[])].slice(0,5)
    };
    all[result.chart.id]=record;
    setMemoryScores(all);
    return record;
  }

  function cellClass(status){return["empty","correct","hand","sound","missing","extra"].includes(status)?status:"empty"}

  function renderComparison(result){
    const parts=[];
    for(let bar=0;bar<result.chart.bars;bar++){
      const start=bar*result.chart.division;
      const end=start+result.chart.division;
      const expectedCells=result.expected.slice(start,end).map((type,index)=>{
        const status=result.statuses[start+index];
        return`<div class="memory-cell ${cellClass(status)}">${label(type)}</div>`;
      }).join("");
      const actualCells=result.actual.slice(start,end).map((type,index)=>{
        const status=result.statuses[start+index];
        const text=status==="missing"?"×":label(type);
        return`<div class="memory-cell ${cellClass(status)}">${text}</div>`;
      }).join("");
      parts.push(`
        <div class="memory-measure">
          <div class="memory-measure-title">第${bar+1}小節</div>
          <div class="memory-row" style="grid-template-columns:62px 1fr"><div class="memory-row-label">正解</div><div class="memory-cells">${expectedCells}</div></div>
          <div class="memory-row" style="grid-template-columns:62px 1fr"><div class="memory-row-label">あなた</div><div class="memory-cells">${actualCells}</div></div>
        </div>`);
    }
    return parts.join("");
  }

  function renderResult(result,record){
    const panel=$("memoryResultPanel");
    panel.dataset.hasResult="1";
    panel.innerHTML=`
      <h3>${escapeHtml(result.chart.title)}｜暗譜チェック結果</h3>
      <div class="memory-grade">${result.grade}</div>
      <div class="memory-score-big">${result.total}<span style="font-size:1rem"> / 100</span></div>
      <div class="memory-history">最高暗譜率 ${record.best}点 ／ 完全暗譜 ${record.perfectCount}回</div>
      <div class="memory-breakdown">
        <div>音順記憶<strong>${result.soundScore}%</strong></div>
        <div>リズム再現<strong>${result.positionScore}%</strong></div>
        <div>タイミング精度<strong>${result.timingScore}%</strong></div>
      </div>
      <div class="memory-summary-grid">
        <div class="memory-summary-box">正解<strong>${result.correct}</strong></div>
        <div class="memory-summary-box">左右・打ち方違い<strong>${result.hand}</strong></div>
        <div class="memory-summary-box">音違い<strong>${result.sound}</strong></div>
        <div class="memory-summary-box">抜け<strong>${result.missing}</strong></div>
        <div class="memory-summary-box">余計な位置<strong>${result.extra}</strong></div>
        <div class="memory-summary-box">重ね打ち<strong>${result.extraTaps}</strong></div>
        <div class="memory-summary-box">平均ズレ<strong>${result.averageTiming}ms</strong></div>
        <div class="memory-summary-box">ガイド<strong>${result.guide==="metronome"?"拍あり":"4拍のみ"}</strong></div>
      </div>
      <div class="memory-compare-title">正解譜面と自分の演奏</div>
      <div class="memory-legend">
        <span style="background:#d9f0df;color:#1f6332">緑：正解</span>
        <span style="background:#fff0bd;color:#7a5a00">黄：左右・打ち方違い</span>
        <span style="background:#f4d3d0;color:#8a2e29">赤：音違い</span>
        <span style="background:#dedede;color:#555">灰：抜け</span>
        <span style="background:#ead8f4;color:#6a3480">紫：余計</span>
      </div>
      <div class="memory-compare-wrap">${renderComparison(result)}</div>
      <div class="memory-result-actions">
        <button id="retryMemoryBtn" class="btn primary" type="button">もう一度暗譜チェック</button>
        <button id="reviewExampleBtn" class="btn gold" type="button">お手本を見る</button>
        <button id="normalPracticeFromMemoryBtn" class="btn secondary" type="button">譜面を見て練習</button>
      </div>
    `;
    panel.classList.add("show");
    $("retryMemoryBtn").onclick=()=>window.startMemoryCheck?.();
    $("reviewExampleBtn").onclick=()=>window.startExamplePlayback?.();
    $("normalPracticeFromMemoryBtn").onclick=()=>{
      window.setPracticeMode?.("normal");
      $("startPracticeBtn").click();
    };
    panel.scrollIntoView({behavior:"smooth",block:"start"});
  }

  window.evaluateMemoryResult=(state,actual,mode,handMode)=>{
    const result=evaluate(state,actual,handMode);
    const record=saveResult(result);
    renderResult(result,record);
  };
})();