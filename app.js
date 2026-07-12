(()=>{
  const files=["app-1.js","app-2.js","app-3.js","app-4.js","app-5.js","app-7.js","app-6.js"];
  const loadNext=index=>{
    if(index>=files.length)return;
    const script=document.createElement("script");
    script.src=`./${files[index]}`;
    script.onload=()=>loadNext(index+1);
    script.onerror=()=>console.error(`読み込みに失敗しました: ${files[index]}`);
    document.head.appendChild(script);
  };
  loadNext(0);
})();
