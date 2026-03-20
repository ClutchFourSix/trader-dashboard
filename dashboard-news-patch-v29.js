(function(){
  const V29_NEWS_SOURCES={
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
  const TILE_LAYOUT_KEYS={commands:'td_layout_v29_commands',clocks:'td_layout_v29_clocks',assets:'td_layout_v29_assets'};
  let ghost=null, placeholder=null, draggingEl=null;

  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}
  function loadJson(key, fallback){try{const r=JSON.parse(localStorage.getItem(key)||'null');return r??fallback}catch{return fallback}}
  function saveJson(key,val){localStorage.setItem(key,JSON.stringify(val))}
  function currentOrder(containerSelector,itemSelector,attr){return qsa(containerSelector+' '+itemSelector).map(el=>el.getAttribute(attr))}
  function applySavedOrder(containerSelector,itemSelector,attr,key,fallback){const container=qs(containerSelector);if(!container)return;const order=loadJson(key,fallback);const map={};qsa(containerSelector+' '+itemSelector).forEach(el=>map[el.getAttribute(attr)]=el);order.forEach(id=>{if(map[id])container.appendChild(map[id])})}

  function getCoreNews(){try{return Array.isArray(V11_NEWS)?V11_NEWS:[]}catch{return[]}}
  function setCoreNews(items){try{V11_NEWS=items;V11_NEWS_HEALTH=items.length?'Live':'Thin'}catch{}}

  function scoreHeadline(title,watchSymbols){
    const t=String(title||'').toLowerCase();
    let score=0;
    ['cpi','inflation','fed','fomc','rates','yield','jobs','nfp','pce','ppi','bitcoin','crypto','gold','oil','treasury','tariff','recession','payrolls','retail sales'].forEach(k=>{if(t.includes(k))score+=3});
    watchSymbols.forEach(sym=>{const base=sym.toLowerCase().replace('usd','');if(base&&t.includes(base))score+=1});
    if(['surge','crash','spike','plunge','rally','selloff','warning','forecast','cuts','hike'].some(k=>t.includes(k)))score+=2;
    return score;
  }
  function isRealArticle(item){
    const title=String(item?.title||'').trim();
    const link=String(item?.link||item?.url||'').trim();
    const summary=String(item?.summary||'').trim();
    if(!title || title.length<16) return false;
    if(!link.startsWith('http')) return false;
    const badTitlePatterns=[/macro\s+stream/i,/news\s+desk/i,/secondary\s+coverage/i,/analysis\s+hub/i,/live\s+macro\s+board/i,/^open\s/i,/market\s+watch$/i,/latest\s+market\s+analysis$/i,/latest\s+macro\s+headlines$/i,/\bfeed\b/i,/\bstream\b/i,/\bdesk\b/i];
    const badSummaryPatterns=[/direct\s+site\s+fallback/i,/fallback/i,/landing\s+page/i,/archive/i,/secondary\s+public\s+fallback/i];
    if(badTitlePatterns.some(rx=>rx.test(title))) return false;
    if(badSummaryPatterns.some(rx=>rx.test(summary))) return false;
    return true;
  }
  function computeScore(s){
    const src=(V29_NEWS_SOURCES[s.source]?.score)||60;
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
  function dedupeAndLimit(items,maxPerSource=2,maxTotal=10){
    const seen=new Set(),counts={},out=[];
    for(const item of items){
      const key=item.link||item.url||item.title;
      if(seen.has(key)) continue;
      seen.add(key);
      const src=item.source||'unknown'; counts[src]=counts[src]||0;
      if(counts[src]>=maxPerSource) continue;
      out.push(item); counts[src]++;
      if(out.length>=maxTotal) break;
    }
    return {items:out,counts};
  }

  async function refreshNews(){
    const watchSymbols=(typeof V11_ASSETS!=='undefined'&&Array.isArray(V11_ASSETS)?V11_ASSETS.map(a=>(a.symbol||'').toUpperCase()):[]);
    try{
      const res=await fetch('./news.json?v=' + Date.now(),{cache:'no-store'});
      if(!res.ok) throw new Error('news.json fetch failed');
      const data=await res.json();
      const items=(data.stories||[]).map(s=>({
        source:s.source,
        title:s.title,
        link:s.url,
        summary:s.summary||'',
        time:s.published_at?Date.parse(s.published_at):Date.now(),
        red:/cpi|inflation|fed|fomc|nfp|jobs|rates|pce|ppi|retail sales/i.test(s.title||''),
        relevanceScore:scoreHeadline(s.title,watchSymbols)
      })).filter(isRealArticle);
      setCoreNews(items);
    }catch{
      setCoreNews([]);
    }
  }

  function renderNews(){
    const root=document.getElementById('newsIntelRoot');
    if(!root) return;
    const ranked=dedupeAndLimit(getCoreNews().map(computeScore).sort((a,b)=>b.final-a.final||a.ageMin-b.ageMin),2,10);
    const stories=ranked.items;
    const counts=ranked.counts;
    const leaderboard=Object.entries(V29_NEWS_SOURCES).sort((a,b)=>b[1].score-a[1].score).map(([key,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${counts[key]||0}</td></tr>`).join('');
    if(!stories.length){
      root.innerHTML=`<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Real Article Headlines Available</div><div class="subtle">Static news feed is empty or has not refreshed yet.</div></div></div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Top 10</th></tr></thead><tbody>${leaderboard}</tbody></table></div></div></div>`;
      return;
    }
    root.innerHTML=`<div class="news-layout"><div class="story-stack">${stories.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc(V29_NEWS_SOURCES[s.source]?.name||s.source)} • ${s.ageMin<60?`${s.ageMin}m ago`:`${Math.floor(s.ageMin/60)}h ${s.ageMin%60}m ago`}</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc(s.summary||'')}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Top 10</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Best real articles first, recency second. Showing ${stories.length} real stories.</div></div></div></div>`;
  }

  function fixRedFolderTimezone(){
    if(typeof parseWeeklyEvents!=='function' || typeof renderRedFolder!=='function') return;
    window.parseWeeklyEvents=function(text){
      const lines=String(text||'').split('\n').map(x=>x.trim()).filter(Boolean),events=[];
      for(const line of lines){
        const parts=line.split('|');
        if(parts.length<2) continue;
        const [dateText,name,currency='']=parts;
        const [datePart,timePart]=dateText.trim().split(' ');
        if(!datePart||!timePart) continue;
        const [yy,mm,dd]=datePart.split('-').map(Number),[hh,mi]=timePart.split(':').map(Number);
        if(![yy,mm,dd,hh,mi].every(Number.isFinite)) continue;
        // Treat listed times as New York / ET wall time, not UTC.
        const utcMs=Date.UTC(yy,mm-1,dd,hh+4,mi,0);
        events.push({name:name.trim(),currency:currency.trim().toUpperCase(),date:new Date(utcMs),dateText:`${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`,timeText:`${String(hh).padStart(2,'0')}:${String(mi).padStart(2,'0')} ET`});
      }
      return events.sort((a,b)=>a.date-b.date);
    };
  }

  function createGhost(el){const rect=el.getBoundingClientRect();const g=el.cloneNode(true);g.classList.add('drag-ghost');g.style.width=rect.width+'px';g.style.height=rect.height+'px';g.style.left=rect.left+'px';g.style.top=rect.top+'px';document.body.appendChild(g);return {g,rect}}
  function moveGhost(x,y,offX,offY){if(!ghost)return;ghost.style.left=(x-offX)+'px';ghost.style.top=(y-offY)+'px'}
  function makePlaceholder(el,isTile){const ph=document.createElement('div');ph.className='drag-placeholder glass'+(isTile?' tile':'');ph.style.height=el.getBoundingClientRect().height+'px';ph.style.gridColumn=getComputedStyle(el).gridColumn;return ph}
  function closestByY(container, selector, y){const els=[...container.querySelectorAll(selector+':not(.dragging-hidden)')];return els.reduce((closest,el)=>{const box=el.getBoundingClientRect();const delta=Math.abs(y-(box.top+box.height/2));return delta<closest.delta?{delta,el}:closest},{delta:Infinity,el:null}).el}
  function startPointerDrag(el, ev, opts){if(!document.body.classList.contains('layout-edit'))return;const container=qs(opts.container);if(!container)return;ev.preventDefault();const {g,rect}=createGhost(el);const offX=ev.clientX-rect.left,offY=ev.clientY-rect.top;ghost=g;draggingEl=el;placeholder=makePlaceholder(el,!!opts.isTile);el.classList.add('dragging-hidden');el.style.display='none';el.after(placeholder);function onMove(e){moveGhost(e.clientX,e.clientY,offX,offY);const target=closestByY(container,opts.item,e.clientY);if(target&&target!==draggingEl&&target!==placeholder){const box=target.getBoundingClientRect();if(e.clientY<box.top+box.height/2){container.insertBefore(placeholder,target)}else{container.insertBefore(placeholder,target.nextSibling)}}}function onUp(){document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);if(ghost)ghost.remove();ghost=null;draggingEl.style.display='';draggingEl.classList.remove('dragging-hidden');placeholder.replaceWith(draggingEl);saveJson(opts.key,currentOrder(opts.container,opts.item,opts.attr));draggingEl=null;placeholder=null;}document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp,{once:true});}
  function currentOrder(containerSelector,itemSelector,attr){return qsa(containerSelector+' '+itemSelector).map(el=>el.getAttribute(attr))}
  function wireTileDrag(){qsa('.tile-drag-handle').forEach(handle=>{handle.onpointerdown=(e)=>{const tile=handle.closest('.draggable-tile');if(!tile)return;const zone=tile.closest('[data-tile-zone]');if(!zone)return;const zoneName=zone.getAttribute('data-tile-zone');startPointerDrag(tile,e,{container:`[data-tile-zone="${zoneName}"]`,item:'.draggable-tile',attr:'data-tile-id',key:TILE_LAYOUT_KEYS[zoneName],isTile:true})}})}
  function ensureTileHandles(){[['#commandStripInner .command-card','commands'],['#clockStrip .clock-card','clocks'],['#assetGrid .asset-card','assets']].forEach(([sel,zone])=>{qsa(sel).forEach((el,idx)=>{el.classList.add('draggable-tile');if(!el.getAttribute('data-tile-id'))el.setAttribute('data-tile-id',`${zone}-${idx}`);if(!el.querySelector('.tile-drag-handle')){const handle=document.createElement('div');handle.className='tile-drag-handle';handle.textContent='Tile';el.prepend(handle)}})})}
  function markZones(){const cmd=qs('.command-strip');if(cmd&&!qs('#commandStripInner')){cmd.id='commandStripInner';cmd.setAttribute('data-tile-zone','commands')}const clocks=qs('#clockStrip');if(clocks)clocks.setAttribute('data-tile-zone','clocks');const assets=qs('#assetGrid');if(assets)assets.setAttribute('data-tile-zone','assets')}

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
      try{ if(typeof renderAssets==='function') renderAssets(); ensureTileHandles(); wireTileDrag(); }catch{}
      try{ if(typeof renderCharts==='function') renderCharts(); }catch{}
      try{ if(typeof renderProviderPrep==='function') renderProviderPrep(); }catch{}
    };
  }

  window.addEventListener('load',()=>{
    setTimeout(()=>{
      fixRedFolderTimezone();
      markZones();
      ensureTileHandles();
      wireTileDrag();
      rebindRefresh();
    },800);
    setTimeout(async()=>{
      try{ await refreshNews(); }catch{}
      try{ renderNews(); }catch{}
      try{ if(typeof renderRedFolder==='function') renderRedFolder(); }catch{}
      try{ if(typeof renderAssets==='function') renderAssets(); ensureTileHandles(); wireTileDrag(); }catch{}
    },1400);
  });
})();
