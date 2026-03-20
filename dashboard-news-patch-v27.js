(function(){
  const V27_NEWS_SOURCES={
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

  function v27Esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function v27WatchSymbols(){try{return Array.isArray(V11_ASSETS)?V11_ASSETS.map(a=>(a.symbol||'').toUpperCase()):[]}catch{return[]}}
  function v27GetNewsRoot(){return document.getElementById('newsIntelRoot')}
  function v27ScoreHeadline(title,watchSymbols){
    const t=String(title||'').toLowerCase();
    let score=0;
    ['cpi','inflation','fed','fomc','rates','yield','jobs','nfp','pce','ppi','bitcoin','crypto','gold','oil','treasury','tariff','recession','payrolls'].forEach(k=>{if(t.includes(k))score+=3});
    watchSymbols.forEach(sym=>{const base=sym.toLowerCase().replace('usd','');if(base&&t.includes(base))score+=1});
    if(['surge','crash','spike','plunge','rally','selloff','warning','forecast','cuts','hike'].some(k=>t.includes(k)))score+=2;
    return score;
  }
  function v27IsRealArticle(item){
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
  function v27ComputeScore(s){
    const src=(V27_NEWS_SOURCES[s.source]?.score)||60;
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
  function v27DedupeAndLimit(items,maxPerSource=2,maxTotal=10){
    const seen=new Set(),counts={},out=[];
    for(const item of items){
      const key=item.link||item.title;
      if(seen.has(key)) continue;
      seen.add(key);
      const src=item.source||'unknown';
      counts[src]=counts[src]||0;
      if(counts[src]>=maxPerSource) continue;
      out.push(item); counts[src]++;
      if(out.length>=maxTotal) break;
    }
    return {items:out,counts};
  }
  async function v27FetchText(url,timeout=8000){
    const c=new AbortController();
    const t=setTimeout(()=>c.abort(),timeout);
    try{const r=await fetch(url,{cache:'no-store',signal:c.signal});clearTimeout(t);if(!r.ok)return null;return await r.text()}catch{clearTimeout(t);return null}
  }
  async function v27FetchViaProxies(url){
    const proxies=[
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    for(const p of proxies){const txt=await v27FetchText(p,9000);if(txt&&txt.length>50)return txt}
    return null;
  }
  function v27ParseRSS(xmlText,source,watchSymbols){
    try{
      const doc=new DOMParser().parseFromString(xmlText,'text/xml');
      const items=[...doc.querySelectorAll('item')].slice(0,12).map(item=>{
        const title=item.querySelector('title')?.textContent?.trim()||'';
        const link=item.querySelector('link')?.textContent?.trim()||'';
        const pub=item.querySelector('pubDate')?.textContent?.trim()||'';
        const desc=(item.querySelector('description')?.textContent||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        return {source,title,link,summary:desc.slice(0,260),time:pub?Date.parse(pub):Date.now(),red:/cpi|inflation|fed|fomc|nfp|jobs|rates|pce|ppi/i.test(title),relevanceScore:v27ScoreHeadline(title,watchSymbols)};
      }).filter(v27IsRealArticle);
      return items;
    }catch{return[]}
  }
  async function v27FetchCoinBureau(watchSymbols){
    const html=await v27FetchViaProxies('https://coinbureau.com/');
    if(!html) return [];
    try{
      const doc=new DOMParser().parseFromString(html,'text/html');
      const anchors=[...doc.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href')||'',text:(a.textContent||'').replace(/\s+/g,' ').trim()})).filter(x=>x.href.includes('coinbureau.com/')&&x.text.length>24).slice(0,8);
      return anchors.map(a=>({source:'coinbureau',title:a.text,link:a.href,summary:'Crypto-focused market analysis and commentary.',time:Date.now()-180000,red:/bitcoin|crypto|etf|fed|rates/i.test(a.text),relevanceScore:v27ScoreHeadline(a.text,watchSymbols)})).filter(v27IsRealArticle);
    }catch{return[]}
  }

  async function refreshNews(){
    const watchSymbols=v27WatchSymbols();
    const feeds=[
      {url:'https://www.fxstreet.com/rss/news',source:'fxstreet'},
      {url:'https://feeds.feedburner.com/zerohedge/feed',source:'zerohedge'},
      {url:'https://cointelegraph.com/rss',source:'cointelegraph'},
      {url:'https://www.lynalden.com/feed/',source:'lynalden'}
    ];
    const rssResults=await Promise.all(feeds.map(async f=>{const xml=await v27FetchViaProxies(f.url);return xml?v27ParseRSS(xml,f.source,watchSymbols):[]}));
    const coinBureau=await v27FetchCoinBureau(watchSymbols);
    V11_NEWS=[...rssResults.flat(),...coinBureau].filter(v27IsRealArticle);
    V11_NEWS_HEALTH=V11_NEWS.length?'Live':'Thin';
  }

  function renderNews(){
    const root=v27GetNewsRoot();
    if(!root) return;
    const ranked=v27DedupeAndLimit((Array.isArray(V11_NEWS)?V11_NEWS:[]).map(v27ComputeScore).sort((a,b)=>b.final-a.final||a.ageMin-b.ageMin),2,10);
    const stories=ranked.items;
    const counts=ranked.counts;
    const leaderboard=Object.entries(V27_NEWS_SOURCES).sort((a,b)=>b[1].score-a[1].score).map(([key,s])=>`<tr><td>${v27Esc(s.name)}</td><td>${s.score}</td><td>${counts[key]||0}</td></tr>`).join('');
    if(!stories.length){
      root.innerHTML=`<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Real Article Headlines Available</div><div class="subtle">The live fetchers did not return enough genuine article headlines right now.</div></div></div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Best real articles first, recency second. Showing 0 real stories.</div></div></div></div>`;
      return;
    }
    root.innerHTML=`<div class="news-layout"><div class="story-stack">${stories.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${v27Esc(V27_NEWS_SOURCES[s.source]?.name||s.source)} • ${s.ageMin<60?`${s.ageMin}m ago`:`${Math.floor(s.ageMin/60)}h ${s.ageMin%60}m ago`}</div><div class="story-title"><a href="${v27Esc(s.link)}" target="_blank">${v27Esc(s.title)}</a></div><div class="story-summary">${v27Esc(s.summary||'')}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Best real articles first, recency second. Showing ${stories.length} real stories.</div></div><div class="glass-sm section"><div class="section-title">Accurate Social Accounts</div><div class="list">${SOCIAL.map(a=>`<div class="row"><div><div class="row-title">${v27Esc(a.name)}</div><div class="row-meta">${v27Esc(a.focus)} • score ${a.score}</div></div><div class="provider-badge-row">${a.links.map(([label,url])=>`<a class="story-link-chip" href="${v27Esc(url)}" target="_blank">${v27Esc(label)}</a>`).join('')}</div></div>`).join('')}</div></div></div></div>`;
  }

  function initResizables(){qsa('.draggable-section').forEach(sec=>sec.classList.add('resizable-section')); const sizes=loadJson(SECTION_SIZE_KEY,{}); qsa('.resizable-section').forEach(el=>{const meta=sizes[el.dataset.layoutId]; if(!meta)return; if(meta.height)el.style.minHeight=meta.height; if(meta.size)el.dataset.size=meta.size;}); qsa('.resizable-section').forEach(sec=>{sec.addEventListener('mouseup',()=>{const out={};qsa('.resizable-section').forEach(el=>out[el.dataset.layoutId]={height:el.style.minHeight||'',size:el.dataset.size||'md'});saveJson(SECTION_SIZE_KEY,out)}); sec.addEventListener('touchend',()=>setTimeout(()=>{const out={};qsa('.resizable-section').forEach(el=>out[el.dataset.layoutId]={height:el.style.minHeight||'',size:el.dataset.size||'md'});saveJson(SECTION_SIZE_KEY,out)},50));})}

  window.addEventListener('load',()=>{
    markZones();
    applySavedOrder('[data-layout-zone="main"]','.draggable-section','data-layout-id',SECTION_LAYOUT_KEY,['news','red','assets','charts','add','provider']);
    wireSectionDrag();
    initResizables();
    setTimeout(()=>{ensureTileHandles(); applySavedOrder('[data-tile-zone="commands"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.commands,['commands-0','commands-1','commands-2','commands-3','commands-4']); applySavedOrder('[data-tile-zone="clocks"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.clocks,['clocks-0','clocks-1','clocks-2','clocks-3','clocks-4','clocks-5']); wireTileDrag();},1000);
    setTimeout(async()=>{await refreshNews(); renderNews();},1200);
    const refresh=qs('#refreshBtn'); if(refresh) refresh.addEventListener('click',async()=>{await refreshNews(); renderNews();});
  });
})();
