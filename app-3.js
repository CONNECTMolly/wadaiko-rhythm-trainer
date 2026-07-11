function renderChart(c,root){
  root.innerHTML="";
  const cellsPerBeat=c.division/4;
  const minCell=c.division===32?34:42;
  for(let bar=0;bar<c.bars;bar++){
    const m=document.createElement("div");m.className="measure";m.innerHTML=`<div class="measure-title">第${bar+1}小節（${c.division}分）</div>`;
    const g=document.createElement("div");g.className="step-grid";
    g.style.gridTemplateColumns=`repeat(${c.division},minmax(${minCell}px,1fr))`;
    for(let s=0;s<c.division;s++){
      const i=bar*c.division+s,cell=document.createElement("div");
      cell.className="step"+(s%cellsPerBeat===0?" beat-start":"")+(editMode?" editable":"");
      cell.dataset.type=c.notes[i];
      cell.innerHTML=`<span class="num">${s+1}</span><span>${labels[c.notes[i]]}</span>`;
      if(editMode){
        cell.onclick=()=>{
          if(!currentChart)return;
          currentChart.notes[i]=selectedEditNote;
          renderChart(currentChart,$("generatedChart"));
          refreshGeneratedSummary();
        };
      }
      g.appendChild(cell)
    }
    m.appendChild(g);root.appendChild(m)
  }
}
function saveCurrent(){
  if(!currentChart)return;const arr=getCharts(),i=arr.findIndex(c=>c.id===currentChart.id);if(i>=0)arr[i]=currentChart;else arr.push(currentChart);
  setCharts(arr);renderSaved();refreshPractice();refreshGeneratedSummary();alert("曲を保存しました。")
}
$("saveBtn").onclick=saveCurrent;
$("exportBtn").onclick=()=>{
  if(!currentChart)return;const b=new Blob([JSON.stringify(currentChart,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(b);a.download=(currentChart.title.replace(/[\\/:*?"<>|]/g,"_")||"wadaiko")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
};
$("importInput").onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;try{currentChart=normalize(JSON.parse(await f.text()));currentChart.id=uid();showGenerated();alert("読み込みました。保存すると一覧へ追加されます。")}catch{alert("JSONを読み込めませんでした。")}e.target.value=""
};
function renderSaved(){
  const root=$("savedList"),arr=getCharts();root.innerHTML="";
  if(!arr.length){root.innerHTML='<p class="muted">保存された曲はまだありません。</p>';return}
  arr.forEach(c=>{
    const row=document.createElement("div");row.className="saved-item";
    const builtin=isBuiltInChart(c.id);
    const badge=builtin?' <span style="display:inline-block;padding:2px 7px;border-radius:999px;background:#d5a43e;color:#25170e;font-size:.7rem;font-weight:900">標準搭載</span>':'';
    row.innerHTML=`<div><b>${escapeHtml(c.title)}</b>${badge}<div class="small muted">BPM ${c.bpm} ／ ${c.bars}小節 ／ ${c.division}分クオンタイズ</div></div>`;
    const box=document.createElement("div");box.className="inline";
    const load=document.createElement("button");load.className="btn";load.textContent="確認・修正";load.onclick=()=>{currentChart=c;showGenerated();window.scrollTo({top:$("generatedPanel").offsetTop-20,behavior:"smooth"})};
    const del=document.createElement("button");
    if(builtin){
      del.className="btn";
      del.textContent="初期状態";
      del.onclick=()=>{
        if(confirm("標準搭載の譜面を初期状態に戻しますか？")){
          setCharts(getStoredCharts().filter(x=>x.id!==c.id));
          renderSaved();refreshPractice();
        }
      };
    }else{
      del.className="btn danger";
      del.textContent="削除";
      del.onclick=()=>{
        if(confirm("削除しますか？")){
          setCharts(getStoredCharts().filter(x=>x.id!==c.id));
          renderSaved();refreshPractice();
        }
      };
    }
    box.append(load,del);row.appendChild(box);root.appendChild(row)
  })
}

function refreshPractice(){
  const sel=$("practiceSelect"),arr=getCharts(),old=sel.value;sel.innerHTML="";
  if(!arr.length){const o=document.createElement("option");o.textContent="保存した曲がありません";o.value="";sel.appendChild(o)}
  else arr.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=`${c.title}（BPM ${c.bpm}）`;sel.appendChild(o)});
  if(arr.some(c=>c.id===old))sel.value=old;
  else if(arr.some(c=>c.id==="builtin-matsuri-2026-07-11"))sel.value="builtin-matsuri-2026-07-11";
  updateBpm()
}
function selectedChart(){return getCharts().find(c=>c.id===$("practiceSelect").value)||null}

const CALIB_STORE="wadaikoCalibV1";
const DEFAULT_CALIB={leftX:64,leftY:112,leftRot:-32,rightX:255,rightY:112,rightRot:32};
function getCalib(){
  try{return {...DEFAULT_CALIB,...JSON.parse(localStorage.getItem(CALIB_STORE)||"{}")} }catch{return {...DEFAULT_CALIB}}
}
function saveCalib(cfg){localStorage.setItem(CALIB_STORE,JSON.stringify(cfg))}
function setSlider(id,val){if($(id)){$(id).value=val;$(id+"Val").textContent=val}}
function loadCalibToControls(cfg){
  setSlider("calibLeftX", Math.round(cfg.leftX-DEFAULT_CALIB.leftX));
  setSlider("calibLeftY", Math.round(cfg.leftY-DEFAULT_CALIB.leftY));
  setSlider("calibLeftRot", Math.round(cfg.leftRot));
  setSlider("calibRightX", Math.round(cfg.rightX-DEFAULT_CALIB.rightX));
  setSlider("calibRightY", Math.round(cfg.rightY-DEFAULT_CALIB.rightY));
  setSlider("calibRightRot", Math.round(cfg.rightRot));
}
function readCalibFromControls(){
  return {
    leftX: DEFAULT_CALIB.leftX + Number($("calibLeftX").value||0),
    leftY: DEFAULT_CALIB.leftY + Number($("calibLeftY").value||0),
    leftRot: Number($("calibLeftRot").value||DEFAULT_CALIB.leftRot),
    rightX: DEFAULT_CALIB.rightX + Number($("calibRightX").value||0),
    rightY: DEFAULT_CALIB.rightY + Number($("calibRightY").value||0),
    rightRot: Number($("calibRightRot").value||DEFAULT_CALIB.rightRot)
  };
}
