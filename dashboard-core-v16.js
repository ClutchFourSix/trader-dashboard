(function(){
  const PUBLIC_FALLBACKS=[
    {source:'fxstreet',title:'FXStreet Macro & FX News Desk',summary:'Open macro and FX news coverage from a public news desk.',time:Date.now()-60000,link:'https://www.fxstreet.com/news',relevanceScore:8},
    {source:'coinbureau',title:'Coin Bureau Market Watch',summary:'Public crypto-market coverage and macro-sensitive narrative context.',time:Date.now()-120000,link:'https://coinbureau.com/',relevanceScore:7},
    {source:'zerohedge',title:'ZeroHedge Macro Stream',summary:'Public macro, rates, and risk narrative coverage.',time:Date.now()-180000,link:'https://www.zerohedge.com/',relevanceScore:6},
    {source:'cointelegraph',title:'Cointelegraph News Desk',summary:'Public crypto, ETF, and digital-asset developments.',time:Date.now()-240000,link:'https://cointelegraph.com/',relevanceScore:6},
    {source:'lynalden',title:'Lyn Alden Research',summary:'Public research archive and macro commentary.',time:Date.now()-300000,link:'https://www.lynalden.com/',relevanceScore:5},
    {source:'fxstreet',title:'FXStreet Secondary Coverage',summary:'Secondary public fallback card to keep the board populated.',time:Date.now()-360000,link:'https://www.fxstreet.com/news',relevanceScore:4},
    {source:'coinbureau',title:'Coin Bureau Analysis Hub',summary:'Public analysis landing page for crypto-sensitive narratives.',time:Date.now()-420000,link:'https://coinbureau.com/',relevanceScore:4},
    {source:'zerohedge',title:'ZeroHedge Market Coverage',summary:'Public market coverage and commentary archive.',time:Date.now()-480000,link:'https://www.zerohedge.com/',relevanceScore:4},
    {source:'cointelegraph',title:'Cointelegraph Markets Coverage',summary:'Public markets and digital-asset updates.',time:Date.now()-540000,link:'https://cointelegraph.com/',relevanceScore:4},
    {source:'fxstreet',title:'FXStreet Live Macro Board',summary:'Public board for macro-sensitive stories and releases.',time:Date.now()-600000,link:'https://www.fxstreet.com/news',relevanceScore:3}
  ];
  const BLOCKED_SOURCES=new Set(['hedgeye','realvision','investinglive','kobeissi']);
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function computeScore(s){const sources=(window.V11_NEWS_SOURCES||{});const src=sources[s.source]?.score||60;let story=55;const ageMin=Math.round((Date.now()-s.time)/60000);if(ageMin<10)story+=15;else if(ageMin<60)story+=8;else story-=8;story+=Math.min(12,s.relevanceScore||0);story=Math.max(0,Math.min(100,Math.round(story)));return {...s,src,story,final:Math.round(src*.45+story*.55)}}
  function publicOnly(items){
    return items.filter(s=>{
      const link=String(s.link||'');
      if(!link.startsWith('http')) return false;
      if(BLOCKED_SOURCES.has(String(s.source||'').toLowerCase())) return false;
      return true;
    });
  }
  function socialPanel(){
    const accounts=[
      {name:'Lyn Alden',score:86,focus:'Macro / credit / cycle',links:[['Site','https://www.lynalden.com/'],['X','https://x.com/LynAldenContact']]},
      {name:'FXStreet',score:78,focus:'FX / macro calendar',links:[['Site','https://www.fxstreet.com/news'],['X','https://x.com/FXStreetNews']]},
      {name:'Coin Bureau',score:71,focus:'Crypto / macro narrative',links:[['Site','https://coinbureau.com/'],['YouTube','https://www.youtube.com/@CoinBureau']]},
      {name:'ZeroHedge',score:54,focus:'Macro / market narrative',links:[['Site','https://www.zerohedge.com/'],['X','https://x.com/zerohedge']]},
      {name:'Cointelegraph',score:66,focus:'Crypto / ETF / markets',links:[['Site','https://cointelegraph.com/'],['X','https://x.com/Cointelegraph']]}
    ];
    return `<div class="glass-sm section"><div class="section-title">Open Social / Public Feeds</div><div class="social-card-grid">${accounts.map(a=>`<div class="social-account"><div class="row-title">${esc(a.name)}</div><div class="row-meta">${esc(a.focus)} • score ${a.score}</div><div class="social-links">${a.links.map(([label,url])=>`<a class="social-link" href="${esc(url)}" target="_blank">${esc(label)}</a>`).join('')}</div></div>`).join('')}</div></div>`;
  }
  function buildBoard(){
    let items=[];
    if(Array.isArray(window.V11_NEWS)&&window.V11_NEWS.length){items=window.V11_NEWS.filter(s=>(Date.now()-s.time)<=3600000).map(computeScore)}
    items=publicOnly(items);
    const seen=new Set(items.map(x=>x.title));
    for(const fb of PUBLIC_FALLBACKS.map(computeScore)){
      if(!seen.has(fb.title)){items.push(fb);seen.add(fb.title)}
      if(items.length>=10) break;
    }
    items=items.sort((a,b)=>b.final-a.final).slice(0,10);
    const root=document.getElementById('newsIntelRoot');
    if(!root) return;
    const sources=window.V11_NEWS_SOURCES||{};
    const shownCounts={}; items.forEach(i=>{shownCounts[i.source]=(shownCounts[i.source]||0)+1});
    const leaderboard=Object.entries(sources).sort((a,b)=>b[1].score-a[1].score).map(([k,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${shownCounts[k]||0}</td></tr>`).join('');
    root.innerHTML=`<div class="news-layout"><div class="story-stack">${items.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-source-line">#${idx+1} • ${esc(sources[s.source]?.name||s.source)} • ${Math.max(0,Math.round((Date.now()-s.time)/60000))}m ago</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc(s.summary)}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div><div class="story-link-row"><a class="story-link-chip" href="${esc(s.link)}" target="_blank">Open story</a><span class="story-link-chip">public link</span></div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="layout-note">Main board excludes paywalled/homepage-only premium sources. Only public/open links are shown here.</div></div>${socialPanel()}</div></div>`;
  }
  function forceBoard(){buildBoard()}
  window.addEventListener('load',()=>{setTimeout(forceBoard,500);setTimeout(forceBoard,1300);setTimeout(forceBoard,2500);const refresh=document.getElementById('refreshBtn');if(refresh)refresh.addEventListener('click',()=>setTimeout(forceBoard,700));const root=document.getElementById('newsIntelRoot');if(root){const obs=new MutationObserver(()=>{if(root.querySelectorAll('.story').length<10)setTimeout(forceBoard,50)});obs.observe(root,{childList:true,subtree:true});}});
})();
