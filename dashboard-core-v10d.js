(function(){
  const LAYOUT_KEY='td_layout_v10d';
  const DEFAULT_ORDER=['news','red','assets','charts','add','provider'];
  let layoutEditMode=false;
  let layoutOrder=loadOrder();

  function loadOrder(){
    try{const v=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'[]'); return Array.isArray(v)&&v.length?v:DEFAULT_ORDER.slice();}
    catch{return DEFAULT_ORDER.slice();}
  }
  function saveOrder(){ localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutOrder)); }
  function applyOrder(){
    const main=document.querySelector('[data-layout-zone="main"]');
    if(!main) return;
    const map={};
    Array.from(main.querySelectorAll('.draggable-section')).forEach(el=>map[el.getAttribute('data-layout-id')]=el);
    layoutOrder.forEach(id=>{ if(map[id]) main.appendChild(map[id]); });
  }
  function enableDnD(){
    document.querySelectorAll('.draggable-section').forEach(el=>{
      el.setAttribute('draggable', layoutEditMode ? 'true' : 'false');
      el.ondragstart=e=>{ if(!layoutEditMode){e.preventDefault();return;} el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; };
      el.ondragend=()=> el.classList.remove('dragging');
    });
  }
  function getDragAfterElement(container,y){
    const els=[...container.querySelectorAll('.draggable-section:not(.dragging)')];
    return els.reduce((closest,child)=>{
      const box=child.getBoundingClientRect();
      const offset=y-box.top-box.height/2;
      return offset<0 && offset>closest.offset ? {offset,element:child} : closest;
    },{offset:Number.NEGATIVE_INFINITY}).element;
  }
  function wireMainZone(){
    const main=document.querySelector('[data-layout-zone="main"]');
    if(!main) return;
    main.ondragover=e=>{
      if(!layoutEditMode) return;
      e.preventDefault();
      const dragging=document.querySelector('.draggable-section.dragging');
      if(!dragging) return;
      const after=getDragAfterElement(main,e.clientY);
      if(after==null) main.appendChild(dragging); else main.insertBefore(dragging,after);
    };
    main.ondrop=e=>{
      if(!layoutEditMode) return;
      e.preventDefault();
      layoutOrder=Array.from(main.querySelectorAll('.draggable-section')).map(el=>el.getAttribute('data-layout-id'));
      saveOrder();
    };
  }
  window.toggleLayoutEdit=function(){
    layoutEditMode=!layoutEditMode;
    document.body.classList.toggle('layout-edit',layoutEditMode);
    const btn=document.getElementById('toggleLayoutBtn');
    if(btn) btn.textContent=layoutEditMode?'Lock Layout':'Unlock Layout';
    enableDnD();
  };
  window.resetLayout=function(){ layoutOrder=DEFAULT_ORDER.slice(); saveOrder(); applyOrder(); };

  function loadStoredAssets(){
    for(const key of ['td_assets_fixed','td_assets_v8','td_assets_core_v7']){
      try{const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):null; if(Array.isArray(arr)&&arr.length) return arr;}catch{}
    }
    return [];
  }
  function chartSymbolForAsset(asset){
    const symbol=((asset&&asset.symbol)||'').toUpperCase();
    const crypto={BTCUSD:1,ETHUSD:1,SOLUSD:1,XRPUSD:1,ADAUSD:1,DOGEUSD:1};
    if(crypto[symbol]) return `BINANCE:${symbol.replace('USD','')}USDT`;
    if(symbol in {EURUSD:1,GBPUSD:1,USDJPY:1,AUDUSD:1,NZDUSD:1,USDCHF:1,USDCAD:1,XAUUSD:1,USOIL:1}) return `OANDA:${symbol}`;
    if(symbol==='ES'||symbol==='MES') return 'AMEX:SPY';
    if(symbol==='NQ'||symbol==='MNQ') return 'NASDAQ:QQQ';
    if(symbol==='GC'||symbol==='MGC') return 'OANDA:XAUUSD';
    if(symbol==='CL'||symbol==='MCL') return 'OANDA:WTICOUSD';
    return symbol || 'OANDA:EURUSD';
  }
  function getChartInterval(){
    const el=document.getElementById('settingChartInterval');
    return (el && el.value) || '15';
  }
  function restoreCharts(){
    const root=document.getElementById('chartGrid');
    if(!root) return;
    const assets=loadStoredAssets().slice(0,4);
    root.innerHTML = assets.length ? assets.map(a=>{
      const tv=chartSymbolForAsset(a);
      const interval=getChartInterval();
      return `<div class="chart-frame"><div class="chart-title">${a.symbol}</div><iframe loading="lazy" src="https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tv)}&interval=${encodeURIComponent(interval)}&theme=dark&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&style=1&timezone=Etc%2FUTC&withdateranges=1&hidevolume=1&allow_symbol_change=0"></iframe></div>`;
    }).join('') : '<div class="glass-sm section">No assets available for charts yet.</div>';
  }
  function injectSettingsLayoutControls(){
    const modal=document.querySelector('.settings-modal');
    if(!modal || modal.querySelector('.layout-settings-actions')) return;
    const wrap=document.createElement('div');
    wrap.className='layout-settings-actions';
    wrap.innerHTML='<button class="btn blue" id="toggleLayoutBtn">Unlock Layout</button><button class="btn red" id="resetLayoutBtn">Reset Layout</button><div class="layout-note">Container positions stay until reset.</div>';
    modal.appendChild(wrap);
    document.getElementById('toggleLayoutBtn').onclick=window.toggleLayoutEdit;
    document.getElementById('resetLayoutBtn').onclick=window.resetLayout;
  }

  window.addEventListener('load',()=>{
    injectSettingsLayoutControls();
    applyOrder();
    wireMainZone();
    enableDnD();
    restoreCharts();
    const addBtn=document.getElementById('addAssetBtn');
    if(addBtn) addBtn.addEventListener('click', ()=> setTimeout(restoreCharts, 1200));
    const saveBtn=document.getElementById('saveSettingsBtn');
    if(saveBtn) saveBtn.addEventListener('click', ()=> setTimeout(restoreCharts, 250));
  });
})();
