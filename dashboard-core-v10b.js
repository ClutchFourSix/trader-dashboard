(function(){
  function loadStoredAssets(){
    try{const raw=localStorage.getItem('td_assets_fixed'); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[];}catch{return[]}
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
  function restoreCharts(){
    const root=document.getElementById('chartGrid');
    if(!root) return;
    const assets=loadStoredAssets().slice(0,4);
    root.innerHTML = assets.length ? assets.map(a=>{
      const tv=chartSymbolForAsset(a);
      const interval=(document.getElementById('settingChartInterval')&&document.getElementById('settingChartInterval').value)||'15';
      return `<div class="chart-frame"><div class="chart-title">${a.symbol}</div><iframe src="https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tv)}&interval=${encodeURIComponent(interval)}&theme=dark&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&style=1&timezone=Etc%2FUTC&withdateranges=1&hidevolume=1&allow_symbol_change=0"></iframe></div>`;
    }).join('') : '<div class="glass-sm section">No assets available for charts yet.</div>';
  }
  window.addEventListener('load',()=>{
    restoreCharts();
    });
})();
