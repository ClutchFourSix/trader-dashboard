(function(){
  const V28_NEWS_SOURCES={
    lynalden:{name:'Lyn Alden',score:86},
    hedgeye:{name:'Hedgeye',score:81},
    fxstreet:{name:'FXStreet',score:78},
    investinglive:{name:'investingLive',score:77},
    kobeissi:{name:'Kobeissi',score:69},
    coinbureau:{name:'Coin Bureau',score:71},
    realvision:{name:'Real Vision',score:74},
    zerohedge:{name:'ZeroHedge',score:54},
    cointelegraph:{name:'Cointelegraph',score:66}
  };
  const V28_SOCIAL=[
    {name:'Lyn Alden',score:86,focus:'Macro / credit / cycle',links:[['Site','https://www.lynalden.com/'],['X','https://x.com/LynAldenContact']]},
    {name:'FXStreet',score:78,focus:'FX / macro calendar',links:[['Site','https://www.fxstreet.com/news'],['X','https://x.com/FXStreetNews']]},
    {name:'Coin Bureau',score:71,focus:'Crypto / macro narrative',links:[['Site','https://coinbureau.com/'],['YouTube','https://www.youtube.com/@CoinBureau']]},
    {name:'ZeroHedge',score:54,focus:'Macro / market narrative',links:[['Site','https://www.zerohedge.com/'],['X','https://x.com/zerohedge']]},
    {name:'Cointelegraph',score:66,focus:'Crypto / ETF / markets',links:[['Site','https://cointelegraph.com/'],['X','https://x.com/Cointelegraph']]}
  ];
  const V28_FEEDS=[
    {url:'https://www.fxstreet.com/rss/news',source:'fxstreet'},
    {url:'https://feeds.feedburner.com/zerohedge/feed',source:'zerohedge'},
    {url:'https://cointelegraph.com/rss',source:'cointelegraph'},
    {url:'https://www.lynalden.com/feed/',source:'lynalden'}
  ];

  function v28Esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function v28WatchSymbols(){try{return Array.isArray(V11_ASSETS)?V11_ASSETS.map(a=>(a.symbol||'').toUpperCase()):[]}catch{return[]}}
  function v28ScoreHeadline(title,watchSymbols){
    const t=String(title||'').toLowerCase();
    let score=0;
    ['cpi','inflation','fed','fomc','rates','yield','jobs','nfp','pce','ppi','bitcoin','crypto','gold','oil','treasury','tariff','recession','payrolls'].forEach(k=>{if(t.includes(k))score+=3});
    watchSymbols.forEach(sym=>{const base=sym.toLowerCase().replace('usd','');if(base&&t.includes(base))score+=1});
    if(['surge','crash','spike','plunge','rally','selloff','warning','forecast','cuts','hike'].some(k=>t.includes(k)))score+=2;
    return score;
  }
  function v28IsRealArticle(item){
    const title=String(item?.title||'').trim();
    const link=String(item?.link||'').trim();
    const summary=String(item?.summary||'').trim();
    if(!title || title.length<16) return false;
    if(!link.startsWith('http')) return false;
    const badTitlePatterns=[/macro\s+stream/i,/news\s+desk/i,/secondary\s+coverage/i,/analysis\s+hub/i,/live\s+macro\s+board/i,/^open\s/i,/market\s+watch$/i,/latest\s+market\s+analysis$/i,/latest\s+macro\s+headlines$/i,/\bfeed\b/i,/\bstream\b/i,/\bdesk\b/i];
    const badSummaryPatterns=[/direct\s+site\s+fallback/i,/fallback/i,/landing\s+page/i,/archive/i,/secondary\s+public\s+fallback/i];
    if(badTitlePatterns.some(rx=>rx.test(title))) return false;
    if(badSummaryPatterns.some(rx=>rx.test(summary))) return false;
    return true;
  }
  function v28ComputeScore(s){
    const src=(V28_NEWS_SOURCES[s.source]?.score)||60;
    let story=55;
    const ageMin=Math.max(0,Math.round((Date.now()-s.time)/60000));
    if(ageMin<=30) story+=14;
    else if(ageMin<=120) story+=9;
    else if(ageMin<=360) story+=5;
    else if(ageMin<=1440) story+=2;
    else if(ageMin<=2880) story-=2;
    else if(ageMin<=4320) story-=6;
    else story-=12;
    story+=Math.min(12,s.relevanceScore||0);
    if(s.red) story+=15;
    story=Math.max(0,Math.min(100,Math.round(story)));
    return {...s,src,story,final:Math.round(src*0.52+story*0.48),ageMin};
  }
  function v28DedupeAndLimit(items,maxPerSource=2,maxTotal=10){
    const seen=new Set(),counts={},out=[];
    for(const item of items){
      const key=item.link||item.title;
      if(seen.has(key)) continue;
      seen.add(key);
      const src=item.source||'unknown'; counts[src]=counts[src]||0;
      if(counts[src]>=maxPerSource) continue;
      out.push(item); counts[src]++;
      if(out.length>=maxTotal) break;
    }
    return {items:out,counts};
  }
  async function v28FetchText(url,timeout=8000){
    const c=new AbortController();
    const t=setTimeout(()=>c.abort(),timeout);
    try{const r=await fetch(url,{cache:'no-store',signal:c.signal});clearTimeout(t);if(!r.ok)return null;return await r.text()}catch{clearTimeout(t);return null}
  }
  async function v28FetchViaProxies(url){
    const proxies=[
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    for(const p of proxies){const txt=await v28FetchText(p,9000);if(txt&&txt.length>50)return txt}
    return null;
  }
  function v28ParseRSS(xmlText,source,watchSymbols){
    try{
      const doc=new DOMParser().parseFromString(xmlText,'text/xml');
      return [...doc.querySelectorAll('item')].slice(0,12).map(item=>{
        const title=item.querySelector('title')?.textContent?.trim()||'';
        const link=item.querySelector('link')?.textContent?.trim()||'';
        const pub=item.querySelector('pubDate')?.textContent?.trim()||'';
        const desc=(item.querySelector('description')?.textContent||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        return {source,title,link,summary:desc.slice(0,260),time:pub?Date.parse(pub):Date.now(),red:/cpi|inflation|fed|fomc|nfp|jobs|rates|pce|ppi/i.test(title),relevanceScore:v28ScoreHeadline(title,watchSymbols)};
      }).filter(v28IsRealArticle);
    }catch{return[]}
  }
  async function v28FetchCoinBureau(watchSymbols){
    const html=await v28FetchViaProxies('https://coinbureau.com/');
    if(!html) return [];
    try{
      const doc=new DOMParser().parseFromString(html,'text/html');
      const anchors=[...doc.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href')||'',text:(a.textContent||'').replace(/\s+/g,' ').trim()})).filter(x=>x.href.includes('coinbureau.com/')&&x.text.length>24).slice(0,8);
      return anchors.map(a=>({source:'coinbureau',title:a.text,link:a.href,summary:'Crypto-focused market analysis and commentary.',time:Date.now()-180000,red:/bitcoin|crypto|etf|fed|rates/i.test(a.text),relevanceScore:v28ScoreHeadline(a.text,watchSymbols)})).filter(v28IsRealArticle);
    }catch{return[]}
  }

  function v28BuildSidePanel(counts,realCount){
    const leaderboard=Object.entries(V28_NEWS_SOURCES).sort((a,b)=>b[1].score-a[1].score).map(([key,s])=>`<tr><td>${v28Esc(s.name)}</td><td>${s.score}</td><td>${counts[key]||0}</td></tr>`).join('');
    return `<div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Top 10</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Best real articles first, recency second. Showing ${realCount} real stories.</div></div><div class="glass-sm section"><div class="section-title">Accurate Social Accounts</div><div class="list">${V28_SOCIAL.map(a=>`<div class="row"><div><div class="row-title">${v28Esc(a.name)}</div><div class="row-meta">${v28Esc(a.focus)} • score ${a.score}</div></div><div class="provider-badge-row">${a.links.map(([label,url])=>`<a class="story-link-chip" href="${v28Esc(url)}" target="_blank">${v28Esc(label)}</a>`).join('')}</div></div>`).join('')}</div></div></div>`;
  }

  async function refreshNews(){
    const watchSymbols=v28WatchSymbols();
    const rssResults=await Promise.all(V28_FEEDS.map(async f=>{const xml=await v28FetchViaProxies(f.url);return xml?v28ParseRSS(xml,f.source,watchSymbols):[]}));
    const coinBureau=await v28FetchCoinBureau(watchSymbols);
    V11_NEWS=[...rssResults.flat(),...coinBureau].filter(v28IsRealArticle);
    V11_NEWS_HEALTH=V11_NEWS.length?'Live':'Thin';
  }

  function renderNews(){
    const root=document.getElementById('newsIntelRoot');
    if(!root) return;
    const ranked=v28DedupeAndLimit((Array.isArray(V11_NEWS)?V11_NEWS:[]).map(v28ComputeScore).sort((a,b)=>b.final-a.final||a.ageMin-b.ageMin),2,10);
    const stories=ranked.items;
    const counts=ranked.counts;
    if(!stories.length){
      root.innerHTML=`<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Real Article Headlines Available</div><div class="subtle">The live fetchers did not return enough genuine article headlines right now.</div></div></div>${v28BuildSidePanel(counts,0)}</div>`;
      return;
    }
    root.innerHTML=`<div class="news-layout"><div class="story-stack">${stories.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${v28Esc(V28_NEWS_SOURCES[s.source]?.name||s.source)} • ${s.ageMin<60?`${s.ageMin}m ago`:`${Math.floor(s.ageMin/60)}h ${s.ageMin%60}m ago`}</div><div class="story-title"><a href="${v28Esc(s.link)}" target="_blank">${v28Esc(s.title)}</a></div><div class="story-summary">${v28Esc(s.summary||'')}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div></div>`).join('')}</div>${v28BuildSidePanel(counts,stories.length)}</div>`;
  }

  function rebindRefresh(){
    const btn=document.getElementById('refreshBtn');
    if(!btn) return;
    btn.onclick=async()=>{
      try{ if(typeof readInputs==='function') readInputs(); }catch{}
      try{ if(typeof refreshPrices==='function') await refreshPrices(); }catch{}
      try{ await refreshNews(); }catch{}
      try{ if(typeof renderClocks==='function') renderClocks(); }catch{}
      try{ if(typeof renderCommands==='function') renderCommands(); }catch{}
      try{ renderNews(); }catch{}
      try{ if(typeof renderRedFolder==='function') renderRedFolder(); }catch{}
      try{ if(typeof renderAssets==='function') renderAssets(); }catch{}
      try{ if(typeof renderCharts==='function') renderCharts(); }catch{}
      try{ if(typeof renderProviderPrep==='function') renderProviderPrep(); }catch{}
    };
  }

  async function fullRefreshOnce(){
    try{ await refreshNews(); }catch{}
    try{ renderNews(); }catch{}
    try{ if(typeof renderCommands==='function') renderCommands(); }catch{}
  }

  window.addEventListener('load',()=>{
    setTimeout(()=>{ rebindRefresh(); fullRefreshOnce(); },800);
    setTimeout(()=>{ fullRefreshOnce(); },2200);
  });
})();
