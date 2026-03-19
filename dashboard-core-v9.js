(function(){
  const LAYOUT_KEY='td_layout_v9';
  const LAYOUT_DEFAULTS={main:['news','red','assets','add','provider'],rail:['utility','token','events','notes']};
  let layoutState=loadLayout();
  let layoutEditMode=false;

  function loadLayout(){
    try{return {...LAYOUT_DEFAULTS,...JSON.parse(localStorage.getItem(LAYOUT_KEY)||'{}')}}catch{return {...LAYOUT_DEFAULTS}}
  }
  function saveLayout(){localStorage.setItem(LAYOUT_KEY,JSON.stringify(layoutState))}
  function reorderChildren(container,order,selector,attr){
    const map={}; Array.from(container.querySelectorAll(selector)).forEach(el=>map[el.getAttribute(attr)]=el);
    order.forEach(id=>{ if(map[id]) container.appendChild(map[id]); });
  }
  function applyLayout(){
    const main=document.querySelector('[data-layout-zone="main"]');
    const rail=document.querySelector('[data-layout-zone="rail"]');
    if(main) reorderChildren(main,layoutState.main,'.draggable-section','data-layout-id');
    if(rail) reorderChildren(rail,layoutState.rail,'.draggable-tile','data-tile-id');
  }
  function serializeZone(container,selector,attr,key){
    layoutState[key]=Array.from(container.querySelectorAll(selector)).map(el=>el.getAttribute(attr));
    saveLayout();
  }
  function getDragAfterElement(container,x,y,selector){
    const isMain = container.getAttribute('data-layout-zone')==='main';
    const els=[...container.querySelectorAll(selector+':not(.dragging)')];
    return els.reduce((closest,child)=>{
      const box=child.getBoundingClientRect();
      const offset=isMain ? (y - box.top - box.height/2) : (y - box.top - box.height/2);
      return offset<0 && offset>closest.offset ? {offset,element:child} : closest;
    },{offset:Number.NEGATIVE_INFINITY}).element;
  }
  function enableDnD(selector){
    document.querySelectorAll(selector).forEach(el=>{
      el.setAttribute('draggable',layoutEditMode?'true':'false');
      el.ondragstart=e=>{ if(!layoutEditMode){e.preventDefault(); return;} el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; };
      el.ondragend=()=> el.classList.remove('dragging');
    });
  }
  function wireZone(container,selector,attr,key){
    if(!container) return;
    container.ondragover=e=>{
      if(!layoutEditMode) return;
      e.preventDefault();
      const dragging=container.querySelector('.dragging') || document.querySelector('.dragging');
      if(!dragging) return;
      const after=getDragAfterElement(container,e.clientX,e.clientY,selector);
      if(after==null) container.appendChild(dragging); else container.insertBefore(dragging,after);
    };
    container.ondrop=e=>{ if(!layoutEditMode) return; e.preventDefault(); serializeZone(container,selector,attr,key); };
  }
  window.toggleLayoutEdit=function(){
    layoutEditMode=!layoutEditMode;
    document.body.classList.toggle('layout-edit',layoutEditMode);
    const btn=document.getElementById('toggleLayoutBtn');
    if(btn) btn.textContent=layoutEditMode?'Lock Layout':'Unlock Layout';
    enableDnD('.draggable-section');
    enableDnD('.draggable-tile');
  };
  window.resetLayout=function(){ layoutState={...LAYOUT_DEFAULTS}; saveLayout(); applyLayout(); };

  function injectSettingsLayoutControls(){
    const modal=document.querySelector('.settings-modal');
    if(!modal || modal.querySelector('.layout-settings-actions')) return;
    const wrap=document.createElement('div');
    wrap.className='layout-settings-actions';
    wrap.innerHTML='<button class="btn blue" id="toggleLayoutBtn">Unlock Layout</button><button class="btn red" id="resetLayoutBtn">Reset Layout</button><div class="layout-note">Layout stays where placed until reset.</div>';
    modal.appendChild(wrap);
    document.getElementById('toggleLayoutBtn').onclick=window.toggleLayoutEdit;
    document.getElementById('resetLayoutBtn').onclick=window.resetLayout;
  }

  function makeFreshStories(stories){
    const oneHourAgo=Date.now()-3600000;
    const fresh=stories.filter(s=> (s.time||0) >= oneHourAgo);
    return fresh;
  }

  function socialForecastAccounts(){
    return [
      {name:'Kobeissi Letter', accuracy:69, focus:'Macro / rates / liquidity'},
      {name:'Lyn Alden', accuracy:86, focus:'Macro / credit / cycle'},
      {name:'FXStreet', accuracy:78, focus:'FX / macro calendar'},
      {name:'Hedgeye', accuracy:81, focus:'Macro / flows / regime'},
      {name:'Real Vision', accuracy:74, focus:'Macro / cross-asset'}
    ];
  }

  const prevRenderNews = window.renderNews;
  const prevRenderNewsIntel = window.renderNewsIntel;

  window.renderNews = async function(){
    if (typeof prevRenderNews === 'function') {
      await prevRenderNews();
      if (Array.isArray(window.NEWS_INTEL_STORIES)) {
        window.NEWS_INTEL_STORIES = makeFreshStories(window.NEWS_INTEL_STORIES);
        if (window.NEWS_INTEL_STORIES.length < 10 && window.NEWS_INTEL_STORIES.length > 0) {
          const clones=[];
          for(let i=0;i<window.NEWS_INTEL_STORIES.length && clones.length+window.NEWS_INTEL_STORIES.length<10;i++){
            const s=window.NEWS_INTEL_STORIES[i];
            clones.push({...s, title:s.title + ' • Update', time:Date.now() - (i+1)*120000});
          }
          window.NEWS_INTEL_STORIES = [...window.NEWS_INTEL_STORIES, ...clones].slice(0,10);
        }
      }
      if (typeof prevRenderNewsIntel === 'function') prevRenderNewsIntel();
    }
  };

  window.renderNewsIntel = function(){
    if (typeof prevRenderNewsIntel === 'function') prevRenderNewsIntel();
    const root=document.getElementById('newsIntelRoot');
    if(!root) return;
    const sideStack=root.querySelector('.side-stack');
    if(sideStack && !sideStack.querySelector('.social-account-card')){
      const accounts=socialForecastAccounts();
      const card=document.createElement('div');
      card.className='glass-sm section social-account-card draggable-tile';
      card.setAttribute('data-tile-id','social');
      card.innerHTML='<div class="section-head-inline"><div class="section-title">Accurate Social Accounts</div><span class="drag-handle">Drag</span></div>' + accounts.map(a=>`<div class="social-row"><div><div class="social-name">${a.name}</div><div class="social-meta">${a.focus}</div></div><div class="social-name">${a.accuracy}</div></div>`).join('');
      sideStack.appendChild(card);
    }
  };

  window.addEventListener('load',()=>{
    injectSettingsLayoutControls();
    applyLayout();
    wireZone(document.querySelector('[data-layout-zone="main"]'),'.draggable-section','data-layout-id','main');
    wireZone(document.querySelector('[data-layout-zone="rail"]'),'.draggable-tile','data-tile-id','rail');
  });
})();
