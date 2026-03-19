const V14_SOCIAL_FEEDS=[{name:'Lyn Alden',score:86,focus:'Macro / credit / cycle',links:[{label:'Site',url:'https://www.lynalden.com/'},{label:'X',url:'https://x.com/LynAldenContact'}]},{name:'Hedgeye',score:81,focus:'Macro / flows / regime',links:[{label:'Site',url:'https://app.hedgeye.com/'},{label:'X',url:'https://x.com/Hedgeye'}]},{name:'Kobeissi Letter',score:69,focus:'Macro / rates / liquidity',links:[{label:'Site',url:'https://www.thekobeissiletter.com/'},{label:'X',url:'https://x.com/KobeissiLetter'}]},{name:'Real Vision',score:74,focus:'Cross-asset / macro',links:[{label:'Site',url:'https://www.realvision.com/'},{label:'X',url:'https://x.com/RealVision'}]},{name:'FXStreet',score:78,focus:'FX / macro calendar',links:[{label:'Site',url:'https://www.fxstreet.com/news'},{label:'X',url:'https://x.com/FXStreetNews'}]}];
(function(){
  const layoutKey='td_layout_v14';
  let ghost=null,placeholder=null,draggingEl=null;
  function loadLayout(){try{const r=JSON.parse(localStorage.getItem(layoutKey)||'[]');return Array.isArray(r)&&r.length?r:null}catch{return null}}
  function saveLayout(order){localStorage.setItem(layoutKey,JSON.stringify(order))}
  function currentOrder(){const main=document.querySelector('[data-layout-zone="main"]');if(!main)return[];return Array.from(main.querySelectorAll('.draggable-section')).map(el=>el.dataset.layoutId)}
  function applySavedLayout(){const order=loadLayout();if(!order)return;const main=document.querySelector('[data-layout-zone="main"]');if(!main)return;const map={};Array.from(main.querySelectorAll('.draggable-section')).forEach(el=>map[el.dataset.layoutId]=el);order.forEach(id=>{if(map[id])main.appendChild(map[id])})}
  function makePlaceholder(el){const ph=document.createElement('div');ph.className='drag-placeholder glass';ph.style.height=el.getBoundingClientRect().height+'px';ph.style.gridColumn=getComputedStyle(el).gridColumn;return ph}
  function createGhost(el){const rect=el.getBoundingClientRect();const g=el.cloneNode(true);g.classList.add('drag-ghost');g.style.width=rect.width+'px';g.style.height=rect.height+'px';g.style.left=rect.left+'px';g.style.top=rect.top+'px';document.body.appendChild(g);return g}
  function moveGhost(x,y,offX,offY){if(!ghost)return;ghost.style.left=(x-offX)+'px';ghost.style.top=(y-offY)+'px'}
  function getClosestSection(y){const main=document.querySelector('[data-layout-zone="main"]');if(!main)return null;const els=[...main.querySelectorAll('.draggable-section:not(.dragging-hidden)')];return els.reduce((closest,el)=>{const box=el.getBoundingClientRect();const delta=Math.abs(y-(box.top+box.height/2));return delta<closest.delta?{delta,el}:closest},{delta:Infinity,el:null}).el}
  function startPointerDrag(section,ev){if(!document.body.classList.contains('layout-edit'))return;const main=document.querySelector('[data-layout-zone="main"]');if(!main)return;ev.preventDefault();const rect=section.getBoundingClientRect();const offX=ev.clientX-rect.left,offY=ev.clientY-rect.top;draggingEl=section;placeholder=makePlaceholder(section);section.classList.add('dragging-hidden');section.style.display='none';section.after(placeholder);ghost=createGhost(section);
    function onMove(e){moveGhost(e.clientX,e.clientY,offX,offY);const target=getClosestSection(e.clientY);if(target&&target!==draggingEl&&target!==placeholder){const box=target.getBoundingClientRect();if(e.clientY<box.top+box.height/2){main.insertBefore(placeholder,target)}else{main.insertBefore(placeholder,target.nextSibling)}}}
    function onUp(){document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);if(ghost)ghost.remove();ghost=null;draggingEl.style.display='';draggingEl.classList.remove('dragging-hidden');placeholder.replaceWith(draggingEl);draggingEl=null;placeholder=null;saveLayout(currentOrder())}
    document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp,{once:true});
  }
  function wirePointerDrag(){document.querySelectorAll('.draggable-section .section-head-inline').forEach(head=>{head.onpointerdown=(e)=>{const section=head.closest('.draggable-section');if(section)startPointerDrag(section,e)}})}

  function fallbackBundle(){const now=Date.now();return [
    {source:'fxstreet',title:'FXStreet Macro & FX News Desk',summary:'Open the direct news desk for current macro and FX headlines.',time:now-60000,red:false,link:'https://www.fxstreet.com/news',relevanceScore:8},
    {source:'coinbureau',title:'Coin Bureau Market Watch',summary:'Open Coin Bureau for crypto-sensitive market coverage and broader narrative context.',time:now-120000,red:false,link:'https://coinbureau.com/',relevanceScore:7},
    {source:'zerohedge',title:'ZeroHedge Macro Stream',summary:'Open ZeroHedge for broad macro, rates, and risk narrative coverage.',time:now-180000,red:false,link:'https://www.zerohedge.com/',relevanceScore:6},
    {source:'realvision',title:'Real Vision Macro Feed',summary:'Open Real Vision for cross-asset and macro commentary.',time:now-240000,red:false,link:'https://www.realvision.com/',relevanceScore:6},
    {source:'kobeissi',title:'Kobeissi Letter Desk',summary:'Open Kobeissi for macro, liquidity, and rates commentary.',time:now-300000,red:false,link:'https://www.thekobeissiletter.com/',relevanceScore:6},
    {source:'investinglive',title:'investingLive Feed',summary:'Open investingLive for market-moving macro updates.',time:now-360000,red:false,link:'https://www.investinglive.com/',relevanceScore:5},
    {source:'hedgeye',title:'Hedgeye Research Stream',summary:'Open Hedgeye for regime, flow, and macro views.',time:now-420000,red:false,link:'https://app.hedgeye.com/',relevanceScore:5},
    {source:'cointelegraph',title:'Cointelegraph News Desk',summary:'Open Cointelegraph for crypto, ETF, and digital-asset developments.',time:now-480000,red:false,link:'https://cointelegraph.com/',relevanceScore:5},
    {source:'lynalden',title:'Lyn Alden Research',summary:'Open Lyn Alden for cycle, debt, and macro analysis.',time:now-540000,red:false,link:'https://www.lynalden.com/',relevanceScore:5},
    {source:'fxstreet',title:'FXStreet Secondary Coverage',summary:'Secondary fallback card to keep the board populated when feeds fail.',time:now-600000,red:false,link:'https://www.fxstreet.com/news',relevanceScore:4}
  ]}
  function computeScore(s){const src=(window.V11_NEWS_SOURCES&&window.V11_NEWS_SOURCES[s.source])?window.V11_NEWS_SOURCES[s.source].score:60;let story=55;const ageMin=Math.round((Date.now()-s.time)/60000);if(ageMin<10)story+=15;else if(ageMin<60)story+=8;else story-=8;story+=Math.min(12,s.relevanceScore||0);if(s.red)story+=15;story=Math.max(0,Math.min(100,Math.round(story)));return {story,final:Math.round(src*0.45+story*0.55),src}}
  function buildNewsHtml(items){const ranked=items.map(s=>({...s,...computeScore(s)})).sort((a,b)=>b.final-a.final);const counts={};const picked=[];for(const item of ranked){counts[item.source]=counts[item.source]||0;if(counts[item.source]>=2)continue;picked.push(item);counts[item.source]++;if(picked.length>=10)break}
    const sources=window.V11_NEWS_SOURCES||{};
    const leaderboard=Object.entries(sources).sort((a,b)=>b[1].score-a[1].score).map(([key,s])=>`<tr><td>${s.name}</td><td>${s.score}</td><td>${picked.filter(x=>x.source===key).length}</td></tr>`).join('');
    return `<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-source-line">#${idx+1} • ${(sources[s.source]&&sources[s.source].name)?sources[s.source].name:s.source} • ${Math.max(0,Math.round((Date.now()-s.time)/60000))}m ago</div><div class="story-title">${s.link?`<a href="${s.link}" target="_blank">${s.title}</a>`:s.title}</div><div class="story-summary">${s.summary}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div><div class="story-link-row">${s.link?`<a class="story-link-chip" href="${s.link}" target="_blank">Open story</a>`:''}<span class="story-link-chip">${s.source}</span></div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Top 10</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="layout-note">Board targets 10 items. Maximum two per source. Live feed stories are used first, then curated fallbacks fill any remaining slots.</div><div class="source-pill-row">${Object.keys(counts).map(k=>`<span class="source-pill">${(sources[k]&&sources[k].name)?sources[k].name:k}</span>`).join('')}</div></div><div class="glass-sm section"><div class="section-title">Accurate Social Accounts</div><div class="social-card-grid">${V14_SOCIAL_FEEDS.map(a=>`<div class="social-account"><div class="row-title">${a.name}</div><div class="row-meta">${a.focus} • score ${a.score}</div><div class="social-links">${a.links.map(l=>`<a class="social-link" href="${l.url}" target="_blank">${l.label}</a>`).join('')}</div></div>`).join('')}</div></div></div></div>`}
  async function renderStandaloneNews(){
    let items=[];
    if(Array.isArray(window.V11_NEWS)&&window.V11_NEWS.length){items=window.V11_NEWS.filter(s=>(Date.now()-s.time)<=3600000)}
    const fallback=fallbackBundle();
    if(items.length<10){
      const seen=new Set(items.map(x=>x.title));
      for(const f of fallback){if(!seen.has(f.title)){items.push(f);seen.add(f.title)}if(items.length>=10)break}
    }
    const root=document.getElementById('newsIntelRoot');
    if(root) root.innerHTML=buildNewsHtml(items);
  }
  window.addEventListener('load',()=>{
    applySavedLayout();
    wirePointerDrag();
    setTimeout(renderStandaloneNews,1500);
    const refresh=document.getElementById('refreshBtn');
    if(refresh) refresh.addEventListener('click',()=>setTimeout(renderStandaloneNews,900));
  });
})();
