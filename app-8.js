(()=>{
  const CLEANUP_KEY="wadaikoStandardChartDuplicateCleanupV1";
  if(localStorage.getItem(CLEANUP_KEY)==="done")return;

  try{
    const stored=JSON.parse(localStorage.getItem(STORE)||"[]");
    const standardTitles=new Set(["ひよく","まつり2026-07-11"]);
    const cleaned=stored.filter(chart=>{
      const title=String(chart?.title||"").trim();
      return !standardTitles.has(title);
    });
    localStorage.setItem(STORE,JSON.stringify(cleaned));
    localStorage.setItem(CLEANUP_KEY,"done");
  }catch(error){
    console.warn("標準譜面の重複整理に失敗しました",error);
  }
})();
