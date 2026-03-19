const V12_SOCIAL_ACCOUNTS=[{name:'Lyn Alden',score:86,focus:'Macro / credit / cycle'},{name:'Hedgeye',score:81,focus:'Macro / flows / regime'},{name:'Kobeissi Letter',score:69,focus:'Macro / rates / liquidity'},{name:'Real Vision',score:74,focus:'Cross-asset / macro'},{name:'FXStreet',score:78,focus:'FX / macro calendar'}];
(function(){
  const LAYOUT_KEY='td_layout_v12';
  let layout=loadLayout();
  let edit=false;
  function loadLayout(){try{const r=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'[]');return Array.isArray(r)&&r.length?r:['news','red','assets','charts','add','provider']}catch{return ['news','red','assets','charts','add','provider']}}
  function saveLayout(){localStorage.setItem(LAYOUT_KEY,JSON.stringify(layout))}
  function applyLayout(){const main=document.querySelector('[data-layout-zone="main"]');if(!main)return;const map={};Array.from(main.querySelectorAll('.draggable-section')).forEach(el=>map[el.dataset.layoutId]=el);layout.forEach(id=>{if(map[id])main.appendChild(map[id])})}
  function toggleLayoutEdit(){edit=!edit;document.body.classList.toggle('layout-edit',edit);const btn=document.getElementById('toggleLayoutBtn');if(btn)btn.textContent=edit?'Lock Layout':'Unlock Layout'}
  function resetLayout(){layout=['news','red','assets','charts','add','provider'];saveLayout();applyLayout()}
  function moveSection(id,dir){const idx=layout.indexOf(id);if(idx<0)return;let next=idx;if(dir==='up')next=Math.max(0,idx-1);if(dir==='down')next=Math.min(layout.length-1,idx+1);if(dir==='top')next=0;if(dir==='bottom')next=layout.length-1;if(next===idx)return;layout.splice(idx,1);layout.splice(next,0,id);saveLayout();applyLayout()}
  window.toggleLayoutEdit=toggleLayoutEdit;window.resetLayout=resetLayout;
  function wireMoveButtons(){document.querySelectorAll('[data-move-id]').forEach(btn=>{btn.onclick=()=>moveSection(btn.dataset.moveId,btn.dataset.moveDir)})}

  function fallbackNewsBundle(){
    const now=Date.now();
    return [
      {source:'fxstreet',title:'Open FXStreet',summary:'Direct site fallback for macro and FX headlines.',time:now-60000,red:false,link:'https://www.fxstreet.com/news',relevanceScore:7},
      {source:'coinbureau',title:'Open Coin Bureau',summary:'Direct site fallback for crypto-sensitive coverage.',time:now-120000,red:false,link:'https://coinbureau.com/',relevanceScore:6},
      {source:'zerohedge',title:'Open ZeroHedge',summary:'Direct site fallback for broad macro narrative coverage.',time:now-180000,red:false,link:'https://www.zerohedge.com/',relevanceScore:5},
      {source:'realvision',title:'Open Real Vision',summary:'Direct site fallback for higher-signal macro and market commentary.',time:now-240000,red:false,link:'https://www.realvision.com/',relevanceScore:5},
      {source:'kobeissi',title:'Open Kobeissi Letter',summary:'Direct site fallback for macro and rates commentary.',time:now-300000,red:false,link:'https://www.thekobeissiletter.com/',relevanceScore:5},
      {source:'investinglive',title:'Open investingLive',summary:'Direct site fallback for market-moving macro items.',time:now-360000,red:false,link:'https://www.investinglive.com/',relevanceScore:4},
      {source:'hedgeye',title:'Open Hedgeye',summary:'Direct site fallback for regime and flow commentary.',time:now-420000,red:false,link:'https://app.hedgeye.com/',relevanceScore:4},
      {source:'cointelegraph',title:'Open Cointelegraph',summary:'Direct site fallback for crypto and ETF developments.',time:now-480000,red:false,link:'https://cointelegraph.com/',relevanceScore:4},
      {source:'lynalden',title:'Open Lyn Alden',summary:'Direct site fallback for cycle and credit analysis.',time:now-540000,red:false,link:'https://www.lynalden.com/',relevanceScore:4},
      {source:'fxstreet',title:'FXStreet Live News Desk',summary:'Secondary fallback story to maintain a fuller board when feeds fail.',time:now-600000,red:false,link:'https://www.fxstreet.com/news',relevanceScore:3}
    ];
  }

  function scoreStory(s){
    const src=(window.V11_NEWS_SOURCES&&window.V11_NEWS_SOURCES[s.source])?window.V11_NEWS_SOURCES[s.source].score:60;
    const ageMin=Math.max(0,Math.round((Date.now()-s.time)/60000));
    let story=55;
    if(ageMin<10) story+=15; else if(ageMin<60) story+=8; else story-=10;
    story+=Math.min(12,s.relevanceScore||0);
    if(s.red) story+=15;
    story=Math.max(0,Math.min(100,Math.round(story)));
    return {src,story,final:Math.round(src*0.45+story*0.55)};
  }

  async function v12RefreshNews(){
    if(typeof window.refreshNews==='function'){
      try{ await window.refreshNews(); }catch{}
    }
    let items=Array.isArray(window.V11_NEWS)?window.V11_NEWS.slice():[];
    items=items.filter(s=>(Date.now()-s.time)<=3600000);
    if(items.length<6){
      const fallback=fallbackNewsBundle();
      items=[...items,...fallback];
    }
    const counts={};
    items=items.map(s=>({ ...s, ...scoreStory(s)})).sort((a,b)=>b.final-a.final).filter(s=>{counts[s.source]=counts[s.source]||0;if(counts[s.source]>=2)return false;counts[s.source]++;return true}).slice(0,10);
    window.V11_NEWS=items;
    window.V11_NEWS_HEALTH=items.length?'Live / Fallback Mix':'Fallback';
    if(typeof window.renderNews==='function') window.renderNews();
    renderSocialBox();
  }

  function renderSocialBox(){
    const side=document.querySelector('#newsIntelRoot .side-stack');
    if(!side) return;
    if(side.querySelector('.v12-social-box')) return;
    const card=document.createElement('div');
    card.className='glass-sm section v12-social-box';
    card.innerHTML=`<div class="section-title">Accurate Social Accounts</div><div class="list">${V12_SOCIAL_ACCOUNTS.map(a=>`<div class="row"><div><div class="row-title">${a.name}</div><div class="row-meta">${a.focus}</div></div><div class="row-title">${a.score}</div></div>`).join('')}</div>`;
    side.appendChild(card);
  }

  function augmentSectionHeaders(){
    document.querySelectorAll('.draggable-section').forEach(sec=>{
      const head=sec.querySelector('.section-head-inline');
      if(!head || head.querySelector('.layout-move-bar')) return;
      const id=sec.dataset.layoutId;
      const bar=document.createElement('div');
      bar.className='layout-move-bar';
      bar.innerHTML=`<button class="move-btn" data-move-id="${id}" data-move-dir="up">Up</button><button class="move-btn" data-move-id="${id}" data-move-dir="down">Down</button><button class="move-btn" data-move-id="${id}" data-move-dir="top">Top</button><button class="move-btn" data-move-id="${id}" data-move-dir="bottom">Bottom</button>`;
      head.appendChild(bar);
    });
    wireMoveButtons();
  }

  function injectSettingsPatch(){
    const modal=document.querySelector('.settings-modal');
    if(!modal) return;
    const note=modal.querySelector('.layout-note');
    if(note) note.textContent='Touch-friendly movement uses Up / Down / Top / Bottom controls.';
  }

  window.addEventListener('load',()=>{
    applyLayout();
    augmentSectionHeaders();
    injectSettingsPatch();
    setTimeout(v12RefreshNews,1200);
    const refresh=document.getElementById('refreshBtn');
    if(refresh) refresh.addEventListener('click',()=>setTimeout(v12RefreshNews,1200));
  });
})();
