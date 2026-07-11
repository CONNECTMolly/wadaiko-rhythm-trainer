function applyCalib(cfg){
  document.querySelectorAll(".drum-svg").forEach(svg=>{
    const left = svg.querySelector('[data-rim="left"]');
    const right = svg.querySelector('[data-rim="right"]');
    if(left) left.setAttribute("transform", `translate(${cfg.leftX} ${cfg.leftY}) rotate(${cfg.leftRot})`);
    if(right) right.setAttribute("transform", `translate(${cfg.rightX} ${cfg.rightY}) rotate(${cfg.rightRot})`);
  });
}
function updateDisplayTuning(){
  $("spacingValue").textContent = `${$("spacingInput").value}%`;
  $("noteSizeValue").textContent = `${$("noteSizeInput").value}%`;
  drawLane();
}
function updateBpm(){const c=selectedChart();$("effectiveBpm").textContent=c?Math.round(c.bpm*Number($("speedSelect").value||1)):"-";drawLane()}
$("practiceSelect").onchange=()=>{updateBpm();drawLane()};$("speedSelect").onchange=updateBpm;$("spacingInput").oninput=updateDisplayTuning;$("noteSizeInput").oninput=updateDisplayTuning;
if($("toggleCalibBtn")){
  $("toggleCalibBtn").onclick=()=>{
    $("calibPanel").classList.toggle("show");
    $("toggleCalibBtn").textContent=$("calibPanel").classList.contains("show")?"位置調整を閉じる":"位置調整モード";
  };
  ["calibLeftX","calibLeftY","calibLeftRot","calibRightX","calibRightY","calibRightRot"].forEach(id=>{
    $(id).oninput=()=>{
      $(id+"Val").textContent=$(id).value;
      applyCalib(readCalibFromControls());
    };
  });
  $("saveCalibBtn").onclick=()=>{
    const cfg=readCalibFromControls();
    saveCalib(cfg);
    applyCalib(cfg);
    alert("位置調整を保存しました。");
  };
  $("resetCalibBtn").onclick=()=>{
    loadCalibToControls(DEFAULT_CALIB);
    saveCalib(DEFAULT_CALIB);
    applyCalib(DEFAULT_CALIB);
  };
}
if($("toggleEditBtn")){
  $("toggleEditBtn").onclick=()=>{
    editMode=!editMode;
    updateEditUI();
    if(currentChart)renderChart(currentChart,$("generatedChart"));
  };
  document.querySelectorAll(".edit-note-btn").forEach(btn=>{
    btn.onclick=()=>{
      selectedEditNote=btn.dataset.editNote;
      updateEditUI();
    };
  });
}

function buildPractice(c){
  const speed=Number($("speedSelect").value||1);
  const bpm=c.bpm*speed,beat=60/bpm,step=beat*4/c.division,start=audio().currentTime+.2,countIn=4*beat;
  const events=[];c.notes.forEach((type,index)=>{if(type)events.push({type,index,time:start+countIn+index*step,status:"pending",chord:{L:false,R:false,times:[]}})});
  return{chart:c,bpm,beat,step,start,countIn,events,end:start+countIn+c.notes.length*step+1,total:events.length,great:0,good:0,miss:0,combo:0,weighted:0,raf:null,done:false}
}

function arrangeMobilePracticeView(){
  if(!window.matchMedia("(max-width: 860px)").matches)return;
  requestAnimationFrame(()=>{
    const laneCard=document.querySelector("#practice .lane-card");
    const drumCard=document.querySelector("#practice .drum-card");
    if(!laneCard||!drumCard)return;
    const stickyHeight=laneCard.getBoundingClientRect().height;
    const target=window.scrollY+drumCard.getBoundingClientRect().top-stickyHeight-8;
    window.scrollTo({top:Math.max(0,target),behavior:"smooth"});
  });
}
function startPractice(){
  stopPractice(false);const c=selectedChart();if(!c){alert("先に曲を保存してください。");return}if(!c.notes.some(Boolean)){alert("音符がありません。");return}
  practice=buildPractice(c);
  $("practice").classList.add("practice-live");
  $("resultPanel").classList.remove("show");
  $("startPracticeBtn").disabled=true;$("stopPracticeBtn").disabled=false;
  resetHud();$("judgement").textContent="カウント";
  arrangeMobilePracticeView();
  scheduleClicks(practice.start,practice.bpm,4+practice.chart.bars*4);
  if(chosenAudio){audioEl=new Audio(URL.createObjectURL(chosenAudio));audioEl.playbackRate=Number($("speedSelect").value||1);const off=Number($("offsetInput").value||0)/1000;
    setTimeout(()=>audioEl?.play().catch(()=>{}),Math.max(0,(practice.start+practice.countIn-audio().currentTime+off)*1000))}
  loopPractice()
}
function stopPractice(show=true){
  if(scheduler){clearInterval(scheduler);scheduler=null}if(practice?.raf)cancelAnimationFrame(practice.raf);
  if(audioEl){audioEl.pause();URL.revokeObjectURL(audioEl.src);audioEl=null}
  if(practice&&show&&!practice.done)finishPractice();practice=null;$("practice").classList.remove("practice-live");$("startPracticeBtn").disabled=false;$("stopPracticeBtn").disabled=true
}
$("startPracticeBtn").onclick=startPractice;$("stopPracticeBtn").onclick=()=>stopPractice(true);
function loopPractice(){
  if(!practice)return;const now=audio().currentTime;
  practice.events.forEach(e=>{if(e.status==="pending"&&now>e.time+.155){e.status="miss";practice.miss++;practice.combo=0;judgeText("不可","#8a3d3d")}});
  updateHud();drawLane();if(now>practice.end||practice.events.every(e=>e.status!=="pending")){finishPractice();return}
  practice.raf=requestAnimationFrame(loopPractice)
}
function match(expected,input,mode){
  if(mode==="strict")return expected===input;
  if(["donL","donR"].includes(expected))return["donL","donR"].includes(input);
  if(["kaL","kaR"].includes(expected))return["kaL","kaR"].includes(input);return false
}
