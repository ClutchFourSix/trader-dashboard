(function(){
  const SECTION_LAYOUT_KEY='td_layout_v31_sections';
  const TILE_LAYOUT_KEYS={commands:'td_layout_v31_commands',clocks:'td_layout_v31_clocks',assets:'td_layout_v31_assets'};
  const SECTION_SIZE_KEY='td_layout_v31_sizes';
  let ghost=null, placeholder=null, draggingEl=null;

  function getCoreNews(){ try { return (typeof V11_NEWS !== 'undefined' && Array.isArray(V11_NEWS)) ? V11_NEWS : []; } catch { return []; } }
  function getSourceScores(){ try { return (typeof V11_NEWS_SOURCES !== 'undefined' && V11_NEWS_SOURCES) ? V11_NEWS_SOURCES : {}; } catch { return {}; } }
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

  function startPointerDrag(el, ev, opts){
    if(!document.body.classList.contains('layout-edit')) return;
    const container=qs(opts.container); if(!container) return;
    ev.preventDefault();
    const {g,rect}=createGhost(el); const offX=ev.clientX-rect.left, offY=ev.clientY-rect.top;
    ghost=g; draggingEl=el; placeholder=makePlaceholder(el,!!opts.isTile);
    el.classList.add('dragging-hidden'); el.style.display='none'; el.after(placeholder);
    function onMove(e){
      moveGhost(e.clientX,e.clientY,offX,offY);
      const target=closestByY(container,opts.item,e.clientY);
      if(target&&target!==draggingEl&&target!==placeholder){const box=target.getBoundingClientRect(); if(e.clientY<box.top+box.height/2){container.insertBefore(placeholder,target)}else{container.insertBefore(placeholder,target.nextSibling)}}
    }
    function onUp(){
      document.removeEventListener('pointermove',onMove);
      document.removeEventListener('pointerup',onUp);
      if(ghost) ghost.remove(); ghost=null;
      draggingEl.style.display=''; draggingEl.classList.remove('dragging-hidden');
      placeholder.replaceWith(draggingEl);
      saveJson(opts.key,currentOrder(opts.container,opts.item,opts.attr));
      draggingEl=null; placeholder=null;
    }
    document.addEventListener('pointermove',onMove);
    document.addEventListener('pointerup',onUp,{once:true});
  }

  function wireSectionDrag(){qsa('.draggable-section .section-head-inline').forEach(head=>{head.onpointerdown=(e)=>{const sec=head.closest('.draggable-section');if(sec)startPointerDrag(sec,e,{container:'[data-layout-zone="main"]',item:'.draggable-section',attr:'data-layout-id',key:SECTION_LAYOUT_KEY})}})}
  function wireTileDrag(){qsa('.tile-drag-handle').forEach(handle=>{handle.onpointerdown=(e)=>{const tile=handle.closest('.draggable-tile');if(!tile)return;const zone=tile.closest('[data-tile-zone]');if(!zone)return;const zoneName=zone.getAttribute('data-tile-zone');startPointerDrag(tile,e,{container:`[data-tile-zone="${zoneName}"]`,item:'.draggable-tile',attr:'data-tile-id',key:TILE_LAYOUT_KEYS[zoneName],isTile:true})}})}
  function ensureTileHandles(){[['#commandStripInner .command-card','commands'],['#clockStrip .clock-card','clocks'],['#assetGrid .asset-card','assets']].forEach(([sel,zone])=>{qsa(sel).forEach((el,idx)=>{el.classList.add('draggable-tile'); if(!el.getAttribute('data-tile-id')) el.setAttribute('data-tile-id',`${zone}-${idx}`); if(!el.querySelector('.tile-drag-handle')){const handle=document.createElement('div');handle.className='tile-drag-handle';handle.textContent='Tile';el.prepend(handle)}})})}
  function markZones(){const cmd=qs('.command-strip'); if(cmd&&!qs('#commandStripInner')){cmd.id='commandStripInner';cmd.setAttribute('data-tile-zone','commands')} const clocks=qs('#clockStrip'); if(clocks) clocks.setAttribute('data-tile-zone','clocks'); const assets=qs('#assetGrid'); if(assets) assets.setAttribute('data-tile-zone','assets');}

  function applySavedSectionSizes(){const sizes=loadJson(SECTION_SIZE_KEY,{});qsa('.resizable-section').forEach(el=>{const meta=sizes[el.dataset.layoutId]; if(!meta) return; if(meta.height) el.style.minHeight=meta.height; if(meta.size) el.dataset.size=meta.size;});}
  function saveSectionSizes(){const sizes={}; qsa('.resizable-section').forEach(el=>{sizes[el.dataset.layoutId]={height:el.style.minHeight||'',size:el.dataset.size||'md'}}); saveJson(SECTION_SIZE_KEY,sizes);}
  function installResizePersistence(){qsa('.resizable-section').forEach(sec=>{sec.addEventListener('mouseup', saveSectionSizes); sec.addEventListener('touchend', ()=>setTimeout(saveSectionSizes,50));})}

  function isWeekendClosedNow(){
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ny = new Date(utc + (-4 * 3600000));
    const day = ny.getUTCDay();
    const hour = ny.getUTCHours();
    if(day === 6) return true;
    if(day === 0 && hour < 17) return true;
    return false;
  }

  function patchWeekendClocks(){
    if(!isWeekendClosedNow()) return;
    qsa('#clockStrip .clock-card').forEach(card=>{
      card.classList.add('market-closed-weekend');
      const status = card.querySelector('.clock-status, .market-status, .status-pill');
      if(status) status.textContent = 'Closed';
      let note = card.querySelector('.weekend-note');
      if(!note){ note=document.createElement('div'); note.className='weekend-note'; card.appendChild(note); }
      note.textContent='Weekend shutdown';
    });
  }

  function normalizeNumbers(){
    qsa('#assetGrid .asset-card .metric-value, #assetGrid .asset-card .metric .value, #assetGrid .asset-card [data-role="value"]').forEach(el=>{
      el.textContent = String(el.textContent||'').replace(/\s+/g,' ').replace(/\n+/g,' ');
    });
  }

  function isRealArticle(item){
    const title=String(item?.title||'').trim();
    const link=String(item?.link||'').trim();
    const summary=String(item?.summary||'').trim();
    if(!title || title.length < 10) return false;
    if(!link.startsWith('http')) return false;
    const badTitlePatterns=[/macro\s+stream/i,/news\s+desk$/i,/secondary\s+coverage/i,/analysis\s+hub$/i,/live\s+macro\s+board$/i,/^open\s/i];
    const badSummaryPatterns=[/direct\s+site\s+fallback/i,/landing\s+page/i,/secondary\s+public\s+fallback/i];
    if(badTitlePatterns.some(rx=>rx.test(title))) return false;
    if(badSummaryPatterns.some(rx=>rx.test(summary))) return false;
    return true;
  }

  function computeScore(s){
    const sources=getSourceScores();
    const src=sources[s.source]?.score||60;
    let story=55;
    const ageMin=Math.round((Date.now()-s.time)/60000);
    if(ageMin <= 30) story += 14;
    else if(ageMin <= 120) story += 9;
    else if(ageMin <= 360) story += 4;
    else if(ageMin <= 1440) story += 1;
    else if(ageMin <= 4320) story -= 6;
    else story -= 18;
    story += Math.min(12,s.relevanceScore||0);
    if(s.red) story += 15;
    story=Math.max(0,Math.min(100,Math.round(story)));
    return {...s,src,story,final:Math.round(src*0.5+story*0.5),ageMin};
  }

  function dedupeAndLimit(items,maxPerSource=2,maxTotal=10){const seen=new Set(), counts={}, out=[]; for(const item of items){const key=item.link||item.title; if(seen.has(key)) continue; seen.add(key); const src=item.source||'unknown'; counts[src]=counts[src]||0; if(counts[src]>=maxPerSource) continue; out.push(item); counts[src]++; if(out.length>=maxTotal) break;} return {items:out,counts};}
  function buildSidePanel(counts,realCount,staleDropped){const sources=getSourceScores(); const leaderboard=Object.entries(sources).sort((a,b)=>b[1].score-a[1].score).map(([k,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${counts[k]||0}</td></tr>`).join(''); return `<div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Best real articles first, recency second. Showing ${realCount} stories.</div>${staleDropped>0?`<div class="news-stale-warning">Dropped ${staleDropped} stale stories older than 72 hours.</div>`:''}</div></div>`;}

  function renderNewsQualityFirst(){
    const root=qs('#newsIntelRoot'); if(!root) return;
    const live=getCoreNews();
    const real = live.filter(isRealArticle);
    const fresh = real.filter(x=>((Date.now()-x.time)/60000) <= 4320);
    const staleDropped = Math.max(0, real.length - fresh.length);
    const filtered=fresh.map(computeScore).sort((a,b)=> b.final - a.final || a.ageMin - b.ageMin);
    const pickedData=dedupeAndLimit(filtered,2,10);
    const picked=pickedData.items; const counts=pickedData.counts;
    if(!picked.length){
      root.innerHTML=`<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Recent Real Article Headlines Available</div><div class="subtle">No recent genuine article headlines passed the scan. Older stale stories were intentionally dropped.</div></div></div>${buildSidePanel(counts,0,staleDropped)}</div>`;
      return;
    }
    root.innerHTML=`<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc(getSourceScores()[s.source]?.name||s.source)} • ${s.ageMin<60?`${s.ageMin}m ago`:`${Math.floor(s.ageMin/60)}h ${s.ageMin%60}m ago`}</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc(s.summary||'')}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div></div>`).join('')}</div>${buildSidePanel(counts,picked.length,staleDropped)}</div>`;
  }

  function initResizables(){qsa('.draggable-section').forEach(sec=>sec.classList.add('resizable-section')); applySavedSectionSizes(); installResizePersistence();}

  window.addEventListener('load',()=>{
    markZones();
    applySavedOrder('[data-layout-zone="main"]','.draggable-section','data-layout-id',SECTION_LAYOUT_KEY,['news','red','assets','charts','add','provider']);
    wireSectionDrag();
    initResizables();
    setTimeout(()=>{ensureTileHandles(); applySavedOrder('[data-tile-zone="commands"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.commands,['commands-0','commands-1','commands-2','commands-3','commands-4']); applySavedOrder('[data-tile-zone="clocks"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.clocks,['clocks-0','clocks-1','clocks-2','clocks-3','clocks-4','clocks-5']); applySavedOrder('[data-tile-zone="assets"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.assets,[]); wireTileDrag(); normalizeNumbers(); patchWeekendClocks();},1000);
    setTimeout(()=>{renderNewsQualityFirst(); patchWeekendClocks(); normalizeNumbers();},1800);
    setTimeout(()=>{renderNewsQualityFirst(); patchWeekendClocks(); normalizeNumbers();},3600);
    const refresh=qs('#refreshBtn'); if(refresh) refresh.addEventListener('click',()=>setTimeout(()=>{renderNewsQualityFirst(); patchWeekendClocks(); normalizeNumbers();},1000));
  });
})();
