(function(){
  const SECTION_LAYOUT_KEY='td_layout_v21_sections';
  const SECTION_SIZE_KEY='td_layout_v21_sizes';
  let ghost=null, placeholder=null, draggingEl=null;

  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}
  function loadJson(key, fallback){try{const r=JSON.parse(localStorage.getItem(key)||'null');return r??fallback}catch{return fallback}}
  function saveJson(key,val){localStorage.setItem(key,JSON.stringify(val))}

  function applySavedSectionOrder(){
    const main=qs('[data-layout-zone="main"]');
    if(!main) return;
    const order=loadJson(SECTION_LAYOUT_KEY,['news','red','assets','charts','add','provider']);
    const map={};
    qsa('[data-layout-zone="main"] .draggable-section').forEach(el=>map[el.dataset.layoutId]=el);
    order.forEach(id=>{if(map[id]) main.appendChild(map[id])});
  }
  function currentSectionOrder(){return qsa('[data-layout-zone="main"] .draggable-section').map(el=>el.dataset.layoutId)}
  function applySavedSectionSizes(){
    const sizes=loadJson(SECTION_SIZE_KEY,{});
    qsa('.resizable-section').forEach(el=>{
      const id=el.dataset.layoutId;
      const meta=sizes[id];
      if(!meta) return;
      if(meta.height) el.style.minHeight=meta.height;
      if(meta.size) el.dataset.size=meta.size;
    });
  }
  function saveSectionSizes(){
    const sizes={};
    qsa('.resizable-section').forEach(el=>{
      sizes[el.dataset.layoutId]={height:el.style.minHeight||'',size:el.dataset.size||'md'};
    });
    saveJson(SECTION_SIZE_KEY,sizes);
  }

  function createGhost(el){
    const rect=el.getBoundingClientRect();
    const g=el.cloneNode(true);
    g.classList.add('drag-ghost');
    g.style.width=rect.width+'px';
    g.style.height=rect.height+'px';
    g.style.left=rect.left+'px';
    g.style.top=rect.top+'px';
    document.body.appendChild(g);
    return {g,rect};
  }
  function moveGhost(x,y,offX,offY){if(!ghost)return;ghost.style.left=(x-offX)+'px';ghost.style.top=(y-offY)+'px'}
  function makePlaceholder(el){const ph=document.createElement('div');ph.className='drag-placeholder glass';ph.style.height=el.getBoundingClientRect().height+'px';ph.style.gridColumn=getComputedStyle(el).gridColumn;return ph}
  function closestByY(container,y){
    const els=[...container.querySelectorAll('.draggable-section:not(.dragging-hidden)')];
    return els.reduce((closest,el)=>{
      const box=el.getBoundingClientRect();
      const delta=Math.abs(y-(box.top+box.height/2));
      return delta<closest.delta?{delta,el}:closest;
    },{delta:Infinity,el:null}).el;
  }
  function startPointerDrag(section,ev){
    if(!document.body.classList.contains('layout-edit')) return;
    const main=qs('[data-layout-zone="main"]');
    if(!main) return;
    ev.preventDefault();
    const {g,rect}=createGhost(section);
    const offX=ev.clientX-rect.left, offY=ev.clientY-rect.top;
    ghost=g; draggingEl=section; placeholder=makePlaceholder(section);
    section.classList.add('dragging-hidden'); section.style.display='none'; section.after(placeholder);
    function onMove(e){
      moveGhost(e.clientX,e.clientY,offX,offY);
      const target=closestByY(main,e.clientY);
      if(target&&target!==draggingEl&&target!==placeholder){
        const box=target.getBoundingClientRect();
        if(e.clientY<box.top+box.height/2) main.insertBefore(placeholder,target); else main.insertBefore(placeholder,target.nextSibling);
      }
    }
    function onUp(){
      document.removeEventListener('pointermove',onMove);
      document.removeEventListener('pointerup',onUp);
      if(ghost) ghost.remove(); ghost=null;
      draggingEl.style.display=''; draggingEl.classList.remove('dragging-hidden');
      placeholder.replaceWith(draggingEl);
      draggingEl=null; placeholder=null;
      saveJson(SECTION_LAYOUT_KEY,currentSectionOrder());
    }
    document.addEventListener('pointermove',onMove);
    document.addEventListener('pointerup',onUp,{once:true});
  }
  function wireSectionDrag(){
    qsa('.draggable-section .section-head-inline').forEach(head=>{
      head.onpointerdown=(e)=>{const sec=head.closest('.draggable-section'); if(sec) startPointerDrag(sec,e)};
    });
  }

  function installResizePersistence(){
    qsa('.resizable-section').forEach(sec=>{
      sec.addEventListener('mouseup', saveSectionSizes);
      sec.addEventListener('touchend', ()=>setTimeout(saveSectionSizes,50));
    });
  }

  function isRealArticle(item){
    const title=String(item?.title||'').trim();
    const link=String(item?.link||'').trim();
    const summary=String(item?.summary||'').trim();
    if(!title || title.length < 12) return false;
    if(!link.startsWith('http')) return false;
    const badTitlePatterns=[/macro\s+stream/i,/news\s+desk/i,/market\s+watch$/i,/latest\s+market\s+analysis$/i,/latest\s+macro\s+headlines$/i,/secondary\s+coverage/i,/analysis\s+hub$/i,/live\s+macro\s+board$/i,/\bfeed\b/i,/\bstream\b/i,/\bdesk\b/i];
    const badSummaryPatterns=[/direct\s+site\s+fallback/i,/fallback/i,/landing\s+page/i,/archive/i,/secondary\s+public\s+fallback/i];
    if(badTitlePatterns.some(rx=>rx.test(title))) return false;
    if(badSummaryPatterns.some(rx=>rx.test(summary))) return false;
    return true;
  }
  function computeScore(s){
    const sources=(window.V11_NEWS_SOURCES||{});
    const src=sources[s.source]?.score||60;
    let story=55;
    const ageMin=Math.round((Date.now()-s.time)/60000);
    if(ageMin<10) story+=15; else if(ageMin<60) story+=8; else story-=8;
    story+=Math.min(12,s.relevanceScore||0);
    if(s.red) story+=15;
    story=Math.max(0,Math.min(100,Math.round(story)));
    return {...s,src,story,final:Math.round(src*.45+story*.55)};
  }
  function dedupeAndLimit(items,maxPerSource=2,maxTotal=10){
    const seen=new Set(), counts={}, out=[];
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
  function buildSidePanel(counts,realCount){
    const sources=window.V11_NEWS_SOURCES||{};
    const leaderboard=Object.entries(sources).sort((a,b)=>b[1].score-a[1].score).map(([k,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${counts[k]||0}</td></tr>`).join('');
    return `<div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Original article-style board. Real article headlines only. ${realCount<10?`Showing ${realCount} real stories right now.`:'Showing up to 10 real stories.'}</div></div></div>`;
  }
  function renderOriginalStyleNews(){
    const root=qs('#newsIntelRoot');
    if(!root) return;
    const live=Array.isArray(window.V11_NEWS)?window.V11_NEWS:[];
    const filtered=live.filter(s=>(Date.now()-s.time)<=3600000).filter(isRealArticle).map(computeScore).sort((a,b)=>b.final-a.final);
    const pickedData=dedupeAndLimit(filtered,2,10);
    const picked=pickedData.items; const counts=pickedData.counts;
    if(!picked.length){
      root.innerHTML=`<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Real Article Headlines Available</div><div class="subtle">The live feeds did not return enough genuine article headlines right now. No generic site cards were inserted.</div></div></div>${buildSidePanel(counts,0)}</div>`;
      return;
    }
    root.innerHTML=`<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc((window.V11_NEWS_SOURCES||{})[s.source]?.name||s.source)} • ${Math.max(0,Math.round((Date.now()-s.time)/60000))}m ago</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc(s.summary||'')}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div></div>`).join('')}</div>${buildSidePanel(counts,picked.length)}</div>`;
  }

  window.addEventListener('load',()=>{
    qsa('.draggable-section').forEach(sec=>sec.classList.add('resizable-section'));
    applySavedSectionOrder();
    applySavedSectionSizes();
    wireSectionDrag();
    installResizePersistence();
    setTimeout(renderOriginalStyleNews,700);
    setTimeout(renderOriginalStyleNews,1800);
    const refresh=qs('#refreshBtn'); if(refresh) refresh.addEventListener('click',()=>setTimeout(renderOriginalStyleNews,900));
  });
})();
