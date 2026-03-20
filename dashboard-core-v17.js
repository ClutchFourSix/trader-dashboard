const V17_SOCIAL_FEEDS=[{name:'Lyn Alden',score:86,focus:'Macro / credit / cycle',links:[['Site','https://www.lynalden.com/'],['X','https://x.com/LynAldenContact']]},{name:'Hedgeye',score:81,focus:'Macro / flows / regime',links:[['Site','https://app.hedgeye.com/'],['X','https://x.com/Hedgeye']]},{name:'Kobeissi Letter',score:69,focus:'Macro / rates / liquidity',links:[['Site','https://www.thekobeissiletter.com/'],['X','https://x.com/KobeissiLetter']]},{name:'Real Vision',score:74,focus:'Cross-asset / macro',links:[['Site','https://www.realvision.com/'],['X','https://x.com/RealVision']]},{name:'FXStreet',score:78,focus:'FX / macro calendar',links:[['Site','https://www.fxstreet.com/news'],['X','https://x.com/FXStreetNews']]}];
(function(){
  const SECTION_LAYOUT_KEY='td_layout_v17_sections';
  const TILE_LAYOUT_KEYS={commands:'td_layout_v17_commands',clocks:'td_layout_v17_clocks',assets:'td_layout_v17_assets'};
  let ghost=null,placeholder=null,draggingEl=null,dragZone=null;

  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}

  function loadLayout(key, fallback){try{const r=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(r)&&r.length?r:fallback.slice()}catch{return fallback.slice()}}
  function saveLayout(key, order){localStorage.setItem(key, JSON.stringify(order))}

  function applySavedOrder(containerSelector,itemSelector,attr,key,fallback){const container=qs(containerSelector);if(!container)return;const order=loadLayout(key,fallback);const map={};qsa(containerSelector+' '+itemSelector).forEach(el=>map[el.getAttribute(attr)]=el);order.forEach(id=>{if(map[id])container.appendChild(map[id])})}
  function currentOrder(containerSelector,itemSelector,attr){return qsa(containerSelector+' '+itemSelector).map(el=>el.getAttribute(attr))}

  function createGhost(el){const rect=el.getBoundingClientRect();const g=el.cloneNode(true);g.classList.add('drag-ghost');g.style.width=rect.width+'px';g.style.height=rect.height+'px';g.style.left=rect.left+'px';g.style.top=rect.top+'px';document.body.appendChild(g);return {g,rect}}
  function moveGhost(x,y,offX,offY){if(!ghost)return;ghost.style.left=(x-offX)+'px';ghost.style.top=(y-offY)+'px'}
  function makePlaceholder(el,isTile){const ph=document.createElement('div');ph.className='drag-placeholder glass'+(isTile?' tile':'');ph.style.height=el.getBoundingClientRect().height+'px';ph.style.gridColumn=getComputedStyle(el).gridColumn;return ph}
  function closestByY(container, selector, y){const els=[...container.querySelectorAll(selector+':not(.dragging-hidden)')];return els.reduce((closest,el)=>{const box=el.getBoundingClientRect();const delta=Math.abs(y-(box.top+box.height/2));return delta<closest.delta?{delta,el}:closest},{delta:Infinity,el:null}).el}
  function startPointerDrag(el, ev, opts){if(!document.body.classList.contains('layout-edit'))return;const container=qs(opts.container);if(!container)return;ev.preventDefault();const {g,rect}=createGhost(el);const offX=ev.clientX-rect.left, offY=ev.clientY-rect.top;ghost=g;draggingEl=el;dragZone=opts;placeholder=makePlaceholder(el,!!opts.isTile);el.classList.add('dragging-hidden');el.style.display='none';el.after(placeholder);
    function onMove(e){moveGhost(e.clientX,e.clientY,offX,offY);const target=closestByY(container,opts.item,e.clientY);if(target&&target!==draggingEl&&target!==placeholder){const box=target.getBoundingClientRect();if(e.clientY<box.top+box.height/2){container.insertBefore(placeholder,target)}else{container.insertBefore(placeholder,target.nextSibling)}}}
    function onUp(){document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);if(ghost)ghost.remove();ghost=null;draggingEl.style.display='';draggingEl.classList.remove('dragging-hidden');placeholder.replaceWith(draggingEl);const order=currentOrder(opts.container,opts.item,opts.attr);saveLayout(opts.key,order);draggingEl=null;placeholder=null;dragZone=null}
    document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp,{once:true});
  }

  function wireSectionDrag(){qsa('.draggable-section .section-head-inline').forEach(head=>{head.onpointerdown=(e)=>{const sec=head.closest('.draggable-section');if(sec)startPointerDrag(sec,e,{container:'[data-layout-zone="main"]',item:'.draggable-section',attr:'data-layout-id',key:SECTION_LAYOUT_KEY})}})}
  function wireTileDrag(){qsa('.tile-drag-handle').forEach(handle=>{handle.onpointerdown=(e)=>{const tile=handle.closest('.draggable-tile');if(!tile)return;const zone=tile.closest('[data-tile-zone]');if(!zone)return;startPointerDrag(tile,e,{container:`[data-tile-zone="${zone.getAttribute('data-tile-zone')}"]`,item:'.draggable-tile',attr:'data-tile-id',key:TILE_LAYOUT_KEYS[zone.getAttribute('data-tile-zone')],isTile:true})}})}

  function moveSection(id,dir){const container=qs('[data-layout-zone="main"]');if(!container)return;const items=qsa('[data-layout-zone="main"] .draggable-section');const index=items.findIndex(x=>x.getAttribute('data-layout-id')===id);if(index<0)return;let target=index;if(dir==='up')target=Math.max(0,index-1);if(dir==='down')target=Math.min(items.length-1,index+1);if(dir==='top')target=0;if(dir==='bottom')target=items.length-1;if(target===index)return;const el=items[index];items.splice(index,1);items.splice(target,0,el);items.forEach(i=>container.appendChild(i));saveLayout(SECTION_LAYOUT_KEY,currentOrder('[data-layout-zone="main"]','.draggable-section','data-layout-id'))}
  function injectSectionMoveButtons(){qsa('.draggable-section .section-head-inline').forEach(head=>{if(head.querySelector('.layout-move-bar'))return;const id=head.closest('.draggable-section').getAttribute('data-layout-id');const bar=document.createElement('div');bar.className='layout-move-bar';bar.innerHTML=`<button class="move-btn" data-move-id="${id}" data-move-dir="up">Up</button><button class="move-btn" data-move-id="${id}" data-move-dir="down">Down</button><button class="move-btn" data-move-id="${id}" data-move-dir="top">Top</button><button class="move-btn" data-move-id="${id}" data-move-dir="bottom">Bottom</button>`;head.appendChild(bar)});qsa('[data-move-id]').forEach(btn=>btn.onclick=()=>moveSection(btn.dataset.moveId,btn.dataset.moveDir))}

  function ensureTileHandles(){
    [['#commandStripInner .command-card','commands'],['#clockStrip .clock-card','clocks'],['#assetGrid .asset-card','assets']].forEach(([sel,zone])=>{
      qsa(sel).forEach((el,idx)=>{
        el.classList.add('draggable-tile');
        if(!el.getAttribute('data-tile-id')) el.setAttribute('data-tile-id',`${zone}-${idx}`);
        if(!el.querySelector('.tile-drag-handle')){const handle=document.createElement('div');handle.className='tile-drag-handle';handle.textContent='Tile';el.prepend(handle)}
      })
    })
  }

  function fallbackArticleBundle(){const now=Date.now();return [
    {source:'fxstreet',title:'FXStreet: Macro and FX headlines',summary:'Public macro and FX headline stream.',time:now-60000,link:'https://www.fxstreet.com/news',relevanceScore:8},
    {source:'coinbureau',title:'Coin Bureau: latest market analysis',summary:'Public crypto-market coverage and macro-sensitive narrative context.',time:now-120000,link:'https://coinbureau.com/',relevanceScore:7},
    {source:'zerohedge',title:'ZeroHedge: latest macro headlines',summary:'Public macro, rates, and risk narrative coverage.',time:now-180000,link:'https://www.zerohedge.com/',relevanceScore:6},
    {source:'cointelegraph',title:'Cointelegraph: latest market headlines',summary:'Public crypto, ETF, and digital-asset developments.',time:now-240000,link:'https://cointelegraph.com/',relevanceScore:6},
    {source:'lynalden',title:'Lyn Alden: latest public research',summary:'Public research archive and macro commentary.',time:now-300000,link:'https://www.lynalden.com/',relevanceScore:5},
    {source:'fxstreet',title:'FXStreet: economic calendar focus',summary:'Public board for macro-sensitive stories and releases.',time:now-360000,link:'https://www.fxstreet.com/news',relevanceScore:5},
    {source:'coinbureau',title:'Coin Bureau: macro narrative update',summary:'Public analysis landing page for crypto-sensitive narratives.',time:now-420000,link:'https://coinbureau.com/',relevanceScore:4},
    {source:'zerohedge',title:'ZeroHedge: market commentary',summary:'Public market coverage and commentary archive.',time:now-480000,link:'https://www.zerohedge.com/',relevanceScore:4},
    {source:'cointelegraph',title:'Cointelegraph: ETF and crypto moves',summary:'Public markets and digital-asset updates.',time:now-540000,link:'https://cointelegraph.com/',relevanceScore:4},
    {source:'fxstreet',title:'FXStreet: rates and CPI monitor',summary:'Public rates and macro monitor.',time:now-600000,link:'https://www.fxstreet.com/news',relevanceScore:4}
  ]}

  function computeScore(s){const sources=(window.V11_NEWS_SOURCES||{});const src=sources[s.source]?.score||60;let story=55;const ageMin=Math.round((Date.now()-s.time)/60000);if(ageMin<10)story+=15;else if(ageMin<60)story+=8;else story-=8;story+=Math.min(12,s.relevanceScore||0);story=Math.max(0,Math.min(100,Math.round(story)));return {...s,src,story,final:Math.round(src*0.45+story*0.55)}}
  function publicHeadlineOnly(items){return items.filter(s=>{const link=String(s.link||'');const title=String(s.title||'').trim();if(!link.startsWith('http')) return false;if(!title || title.length<8) return false;return true;})}

  function buildHeadlineBoard(){let live=[];if(Array.isArray(window.V11_NEWS)&&window.V11_NEWS.length){live=window.V11_NEWS.filter(s=>(Date.now()-s.time)<=3600000).map(computeScore)}let items=publicHeadlineOnly(live);const seen=new Set(items.map(x=>x.title));for(const fb of fallbackArticleBundle().map(computeScore)){if(!seen.has(fb.title)){items.push(fb);seen.add(fb.title)}if(items.length>=10)break}items=items.sort((a,b)=>b.final-a.final).slice(0,10);const root=qs('#newsIntelRoot');if(!root)return;const sources=window.V11_NEWS_SOURCES||{};const counts={};items.forEach(i=>counts[i.source]=(counts[i.source]||0)+1);const leaderboard=Object.entries(sources).sort((a,b)=>b[1].score-a[1].score).map(([k,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${counts[k]||0}</td></tr>`).join('');root.innerHTML=`<div class="news-layout"><div class="story-stack">${items.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-source-line">#${idx+1} • ${esc(sources[s.source]?.name||s.source)} • ${Math.max(0,Math.round((Date.now()-s.time)/60000))}m ago</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc(s.summary)}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div><div class="story-link-row"><a class="story-link-chip" href="${esc(s.link)}" target="_blank">Open story</a></div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="news-empty-note">Headline-only main board. Public/open links only. No fake desk cards. If live feeds are thin, fallback headlines are used.</div></div><div class="glass-sm section"><div class="section-title">Accurate Social Accounts</div><div class="social-card-grid">${V17_SOCIAL_FEEDS.map(a=>`<div class="social-account"><div class="row-title">${esc(a.name)}</div><div class="row-meta">${esc(a.focus)} • score ${a.score}</div><div class="social-links">${a.links.map(([label,url])=>`<a class="social-link" href="${esc(url)}" target="_blank">${esc(label)}</a>`).join('')}</div></div>`).join('')}</div></div></div></div>`}

  function markZones(){const cmd=qs('.command-strip'); if(cmd&&!qs('#commandStripInner')){cmd.id='commandStripInner';cmd.setAttribute('data-tile-zone','commands')} const clocks=qs('#clockStrip'); if(clocks) clocks.setAttribute('data-tile-zone','clocks'); const assets=qs('#assetGrid'); if(assets) assets.setAttribute('data-tile-zone','assets');}

  function forceHeadlineBoard(){buildHeadlineBoard();ensureTileHandles();wireTileDrag()}

  window.addEventListener('load',()=>{
    markZones();
    applySavedOrder('[data-layout-zone="main"]','.draggable-section','data-layout-id',SECTION_LAYOUT_KEY,['news','red','assets','charts','add','provider']);
    injectSectionMoveButtons();
    wireSectionDrag();
    ensureTileHandles();
    applySavedOrder('[data-tile-zone="commands"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.commands,['commands-0','commands-1','commands-2','commands-3','commands-4']);
    applySavedOrder('[data-tile-zone="clocks"]','.draggable-tile','data-tile-id',TILE_LAYOUT_KEYS.clocks,['clocks-0','clocks-1','clocks-2','clocks-3','clocks-4','clocks-5']);
    wireTileDrag();
    setTimeout(forceHeadlineBoard,700);
    setTimeout(forceHeadlineBoard,1800);
    const refresh=qs('#refreshBtn'); if(refresh) refresh.addEventListener('click',()=>setTimeout(forceHeadlineBoard,900));
    const newsRoot=qs('#newsIntelRoot'); if(newsRoot){const obs=new MutationObserver(()=>{if(newsRoot.querySelectorAll('.story').length<8)setTimeout(forceHeadlineBoard,80)});obs.observe(newsRoot,{childList:true,subtree:true})}
  });
})();
