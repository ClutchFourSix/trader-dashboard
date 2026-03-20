(function(){
  const SECTION_LAYOUT_KEY='td_layout_v26_sections';
  const TILE_LAYOUT_KEYS={commands:'td_layout_v26_commands',clocks:'td_layout_v26_clocks',assets:'td_layout_v26_assets'};
  const SECTION_SIZE_KEY='td_layout_v26_sizes';
  let ghost=null, placeholder=null, draggingEl=null;

  const NEWS_SOURCES={
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
  const SOCIAL=[
    {name:'Lyn Alden',score:86,focus:'Macro / credit / cycle',links:[['Site','https://www.lynalden.com/'],['X','https://x.com/LynAldenContact']]},
    {name:'FXStreet',score:78,focus:'FX / macro calendar',links:[['Site','https://www.fxstreet.com/news'],['X','https://x.com/FXStreetNews']]},
    {name:'Coin Bureau',score:71,focus:'Crypto / macro narrative',links:[['Site','https://coinbureau.com/'],['YouTube','https://www.youtube.com/@CoinBureau']]},
    {name:'ZeroHedge',score:54,focus:'Macro / market narrative',links:[['Site','https://www.zerohedge.com/'],['X','https://x.com/zerohedge']]},
    {name:'Cointelegraph',score:66,focus:'Crypto / ETF / markets',links:[['Site','https://cointelegraph.com/'],['X','https://x.com/Cointelegraph']]}
  ];
  const FEEDS=[
    {url:'https://www.fxstreet.com/rss/news',source:'fxstreet'},
    {url:'https://feeds.feedburner.com/zerohedge/feed',source:'zerohedge'},
    {url:'https://cointelegraph.com/rss',source:'cointelegraph'},
    {url:'https://www.lynalden.com/feed/',source:'lynalden'}
  ];
  let newsCache=[];

  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}
  function loadJson(key, fallback){try{const r=JSON.parse(localStorage.getItem(key)||'null');return r??fallback}catch{return fallback}}
  function saveJson(key,val){localStorage.setItem(key,JSON.stringify(val))}
  function currentOrder(containerSelector,itemSelector,attr){return qsa(containerSelector+' '+itemSelector).map(el=>el.getAttribute(attr))}
  function applySavedOrder(containerSelector,itemSelector,attr,key,fallback){const container=qs(containerSelector);if(!container)return;const order=loadJson(key,fallback);const map={};qsa(containerSelector+' '+itemSelector).forEach(el=>map[el.getAttribute(attr)]=el);order.forEach(id=>{if(map[id])container.appendChild(map[id])})}

  function createGhost(el){const rect=el.getBoundingClientRect();const g=el.cloneNode(true);g.classList.add('drag-ghost');g.style.width=rect.width+'px';g.style.height=rect.height+'px';g.style.left=rect.left+'px';g.style.top=rect.top+'px';document.body.appendChild(g);return {g,rect}}
  function moveGhost(x,y,offX,offY){if(!ghost)return;ghost.style.left=(x-offX)+'px';ghost.style.top=(y-offY)+'px'}
  function makePlaceholder(el,isTile){const ph=document.createElement('div');ph.className='drag-placeholder glass'+(isTile?' tile':'');ph.style.height=el.getBoundingClientRect().height+'px';ph.style.gridColumn=getComputedStyle(el).gridColumn;return ph}
  function closestByY(container, selector, y){const els=[...container.querySelectorAll(selector+':not(.dragging-hidden)')];return els.reduce((closest,el)=>{const box=el.getBoundingClientRect();const delta=Math.abs(y-(box.top+box.height/2));return delta<closest.delta?{delta,el}:closest},{delta:Infinity,el:null}).el}
  function startPointerDrag(el, ev, opts){if(!document.body.classList.contains('layout-edit'))return;const container=qs(opts.container);if(!container)return;ev.preventDefault();const {g,rect}=createGhost(el);const offX=ev.clientX-rect.left,offY=ev.clientY-rect.top;ghost=g;draggingEl=el;placeholder=makePlaceholder(el,!!opts.isTile);el.classList.add('dragging-hidden');el.style.display='none';el.after(placeholder);function onMove(e){moveGhost(e.clientX,e.clientY,offX,offY);const target=closestByY(container,opts.item,e.clientY);if(target&&target!==draggingEl&&target!==placeholder){const box=target.getBoundingClientRect();if(e.clientY<box.top+box.height/2){container.insertBefore(placeholder,target)}else{container.insertBefore(placeholder,target.nextSibling)}}}function onUp(){document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);if(ghost)ghost.remove();ghost=null;draggingEl.style.display='';draggingEl.classList.remove('dragging-hidden');placeholder.replaceWith(draggingEl);saveJson(opts.key,currentOrder(opts.container,opts.item,opts.attr));draggingEl=null;placeholder=null;}document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp,{once:true});}
  function wireSectionDrag(){qsa('.draggable-section .section-head-inline').forEach(head=>{head.onpointerdown=(e)=>{const sec=head.closest('.draggable-section');if(sec)startPointerDrag(sec,e,{container:'[data-layout-zone="main"]',item:'.draggable-section',attr:'data-layout-id',key:SECTION_LAYOUT_KEY})}})}
  function wireTileDrag(){qsa('.tile-drag-handle').forEach(handle=>{handle.onpointerdown=(e)=>{const tile=handle.closest('.draggable-tile');if(!tile)return;const zone=tile.closest('[data-tile-zone]');if(!zone)return;const zoneName=zone.getAttribute('data-tile-zone');startPointerDrag(tile,e,{container:`[data-tile-zone="${zoneName}"]`,item:'.draggable-tile',attr:'data-tile-id',key:TILE_LAYOUT_KEYS[zoneName],isTile:true})}})}
  function ensureTileHandles(){[['#commandStripInner .command-card','commands'],['#clockStrip .clock-card','clocks'],['#assetGrid .asset-card','assets']].forEach(([sel,zone])=>{qsa(sel).forEach((el,idx)=>{el.classList.add('draggable-tile');if(!el.getAttribute('data-tile-id'))el.setAttribute('data-tile-id',`${zone}-${idx}`);if(!el.querySelector('.tile-drag-handle')){const handle=document.createElement('div');handle.className='tile-drag-handle';handle.textContent='Tile';el.prepend(handle)}})})}
  function markZones(){const cmd=qs('.command-strip');if(cmd&&!qs('#commandStripInner')){cmd.id='commandStripInner';cmd.setAttribute('data-tile-zone','commands')}const clocks=qs('#clockStrip');if(clocks)clocks.setAttribute('data-tile-zone','clocks');const assets=qs('#assetGrid');if(assets)assets.setAttribute('data-tile-zone','assets')}
  function applySavedSectionSizes(){const sizes=loadJson(SECTION_SIZE_KEY,{});qsa('.resizable-section').forEach(el=>{const meta=sizes[el.dataset.layoutId];if(!meta)return;if(meta.height)el.style.minHeight=meta.height;if(meta.size)el.dataset.size=meta.size;})}
  function saveSectionSizes(){const sizes={};qsa('.resizable-section').forEach(el=>{sizes[el.dataset.layoutId]={height:el.style.minHeight||'',size:el.dataset.size||'md'}});saveJson(SECTION_SIZE_KEY,sizes)}
  function installResizePersistence(){qsa('.resizable-section').forEach(sec=>{sec.addEventListener('mouseup',saveSectionSizes);sec.addEventListener('touchend',()=>setTimeout(saveSectionSizes,50))})}

  function scoreHeadline(title,watchSymbols){const t=String(title||'').toLowerCase();let score=0;['cpi','inflation','fed','fomc','rates','yield','jobs','nfp','pce','ppi','bitcoin','crypto','gold','oil','treasury'].forEach(k=>{if(t.includes(k))score+=3});watchSymbols.forEach(sym=>{const base=sym.toLowerCase().replace('usd','');if(base&&t.includes(base))score+=1});if(['surge','crash','spike','plunge','rally','selloff'].some(k=>t.includes(k)))score+=2;return score}
  function computeScore(s){const src=(NEWS_SOURCES[s.source]?.score)||60;let story=55;const ageMin=Math.round((Date.now()-s.time)/60000);if(ageMin<=30)story+=14;else if(ageMin<=120)story+=9;else if(ageMin<=360)story+=4;else if(ageMin<=1440)story+=1;else if(ageMin<=2880)story-=4;else story-=10;story+=Math.min(12,s.relevanceScore||0);if(s.red)story+=15;story=Math.max(0,Math.min(100,Math.round(story)));return {...s,src,story,final:Math.round(src*0.5+story*0.5),ageMin}}
  function isRealArticle(item){const title=String(item?.title||'').trim();const link=String(item?.link||'').trim();const summary=String(item?.summary||'').trim();if(!title||title.length<12)return false;if(!link.startsWith('http'))return false;const badTitlePatterns=[/macro\s+stream/i,/news\s+desk/i,/market\s+watch$/i,/latest\s+market\s+analysis$/i,/latest\s+macro\s+headlines$/i,/secondary\s+coverage/i,/analysis\s+hub$/i,/live\s+macro\s+board$/i,/\bfeed\b/i,/\bstream\b/i,/\bdesk\b/i,/^open\s/i];const badSummaryPatterns=[/direct\s+site\s+fallback/i,/fallback/i,/landing\s+page/i,/archive/i,/secondary\s+public\s+fallback/i];if(badTitlePatterns.some(rx=>rx.test(title)))return false;if(badSummaryPatterns.some(rx=>rx.test(summary)))return false;return true}
  function dedupeAndLimit(items,maxPerSource=2,maxTotal=10){const seen=new Set(),counts={},out=[];for(const item of items){const key=item.link||item.title;if(seen.has(key))continue;seen.add(key);const src=item.source||'unknown';counts[src]=counts[src]||0;if(counts[src]>=maxPerSource)continue;out.push(item);counts[src]++;if(out.length>=maxTotal)break}return {items:out,counts}}
  async function fetchText(url,timeout=7000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});clearTimeout(t);if(!r.ok)return null;return await r.text();}catch{clearTimeout(t);return null}}
  async function fetchViaProxies(url){const proxies=[`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`];for(const p of proxies){const txt=await fetchText(p,8000);if(txt&&txt.length>50)return txt}return null}
  function parseRSS(xmlText,source,watchSymbols){try{const doc=new DOMParser().parseFromString(xmlText,'text/xml');const items=[...doc.querySelectorAll('item')].slice(0,10).map(item=>{const title=item.querySelector('title')?.textContent?.trim()||'';const link=item.querySelector('link')?.textContent?.trim()||'';const pub=item.querySelector('pubDate')?.textContent?.trim()||'';const desc=(item.querySelector('description')?.textContent||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();return {source,title,link,summary:desc.slice(0,260),time:pub?Date.parse(pub):Date.now(),red:/cpi|inflation|fed|fomc|nfp|jobs|rates|pce|ppi/i.test(title),relevanceScore:scoreHeadline(title,watchSymbols)}}).filter(isRealArticle);return items}catch{return []}}
  async function fetchCoinBureauArticles(watchSymbols){const html=await fetchViaProxies('https://coinbureau.com/');if(!html)return[];try{const doc=new DOMParser().parseFromString(html,'text/html');const anchors=[...doc.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href')||'',text:(a.textContent||'').replace(/\s+/g,' ').trim()})).filter(x=>x.href.includes('coinbureau.com/')&&x.text.length>24).slice(0,8);return anchors.map(a=>({source:'coinbureau',title:a.text,link:a.href,summary:'Crypto-focused market analysis and commentary.',time:Date.now()-180000,red:/bitcoin|crypto|etf|fed|rates/i.test(a.text),relevanceScore:scoreHeadline(a.text,watchSymbols)})).filter(isRealArticle)}catch{return[]}}
  async function refreshActualNews(){const watchSymbols=(typeof V11_ASSETS!=='undefined'&&Array.isArray(V11_ASSETS)?V11_ASSETS.map(a=>(a.symbol||'').toUpperCase()):[]);const rssResults=await Promise.all(FEEDS.map(async f=>{const xml=await fetchViaProxies(f.url);return xml?parseRSS(xml,f.source,watchSymbols):[]}));const cb=await fetchCoinBureauArticles(watchSymbols);newsCache=[...rssResults.flat(),...cb].filter(isRealArticle)}
  function buildSidePanel(counts,realCount){const leaderboard=Object.entries(NEWS_SOURCES).sort((a,b)=>b[1].score-a[1].score).map(([k,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${counts[k]||0}</td></tr>`).join('');return `<div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Best real articles first, recency second. Showing ${realCount} real stories.</div></div><div class="glass-sm section"><div class="section-title">Accurate Social Accounts</div><div class="list">${SOCIAL.map(a=>`<div class="row"><div><div class="row-title">${esc(a.name)}</div><div class="row-meta">${esc(a.focus)} • score ${a.score}</div></div><div class="provider-badge-row">${a.links.map(([label,url])=>`<a class="story-link-chip" href="${esc(url)}" target="_blank">${esc(label)}</a>`).join('')}</div></div>`).join('')}</div></div></div>`}
  function renderNewsQualityFirst(){const root=qs('#newsIntelRoot');if(!root)return;const filtered=[...newsCache].map(computeScore).sort((a,b)=>b.final-a.final||a.ageMin-b.ageMin);const pickedData=dedupeAndLimit(filtered,2,10);const picked=pickedData.items;const counts=pickedData.counts;if(!picked.length){root.innerHTML=`<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Real Article Headlines Available</div><div class="subtle">The current feeds did not return enough genuine article headlines. No placeholder site cards were inserted.</div></div></div>${buildSidePanel(counts,0)}</div>`;return;}root.innerHTML=`<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc(NEWS_SOURCES[s.source]?.name||s.source)} • ${s.ageMin<60?`${s.ageMin}m ago`:`${Math.floor(s.ageMin/60)}h ${s.ageMin%60}m ago`}</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc(s.summary||'')}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div></div>`).join('')}</div>${buildSidePanel(counts,picked.length)}</div>`}

  function initResizables(){qsa('.draggable-section').forEach(sec=>sec.classList.add('resizable-section')); applySavedSectionSizes(); installResizePersistence();}

  window.addEventListener('load',()=>{
    markZones();
    applySavedOrder('[data-layout-zone="main"]','.draggable-section','data-layout-id',SECTION_LAYOUT_KEY,['news','red','assets','charts','add','provider']);
    wireSectionDrag();
    initResizables();
    setTimeout(()=>{ensureTileHandles(); applySavedOrder('[data-tile-zone="commands"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.commands,['commands-0','commands-1','commands-2','commands-3','commands-4']); applySavedOrder('[data-tile-zone="clocks"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.clocks,['clocks-0','clocks-1','clocks-2','clocks-3','clocks-4','clocks-5']); wireTileDrag();},1000);
    setTimeout(async()=>{await refreshActualNews(); renderNewsQualityFirst();},1200);
    const refresh=qs('#refreshBtn'); if(refresh) refresh.addEventListener('click',async()=>{await refreshActualNews(); setTimeout(renderNewsQualityFirst,50)});
  });
})();
