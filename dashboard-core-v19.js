(function(){
  const SOCIAL=[
    {name:'Lyn Alden',score:86,focus:'Macro / credit / cycle',links:[['Site','https://www.lynalden.com/'],['X','https://x.com/LynAldenContact']]},
    {name:'Hedgeye',score:81,focus:'Macro / flows / regime',links:[['Site','https://app.hedgeye.com/'],['X','https://x.com/Hedgeye']]},
    {name:'Kobeissi Letter',score:69,focus:'Macro / rates / liquidity',links:[['Site','https://www.thekobeissiletter.com/'],['X','https://x.com/KobeissiLetter']]},
    {name:'Real Vision',score:74,focus:'Cross-asset / macro',links:[['Site','https://www.realvision.com/'],['X','https://x.com/RealVision']]},
    {name:'FXStreet',score:78,focus:'FX / macro calendar',links:[['Site','https://www.fxstreet.com/news'],['X','https://x.com/FXStreetNews']]}
  ];
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function isRealArticle(item){
    const title=String(item?.title||'').trim();
    const link=String(item?.link||'').trim();
    if(!title || title.length < 12) return false;
    if(!link.startsWith('http')) return false;
    const badTitlePatterns=[/macro\s+stream/i,/news\s+desk/i,/market\s+watch$/i,/latest\s+market\s+analysis$/i,/latest\s+macro\s+headlines$/i,/secondary\s+coverage/i,/analysis\s+hub$/i,/live\s+macro\s+board$/i,/\bfeed\b/i,/\bstream\b/i,/\bdesk\b/i];
    return !badTitlePatterns.some(rx=>rx.test(title));
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
      const k=item.link||item.title;
      if(seen.has(k)) continue;
      seen.add(k);
      const src=item.source||'unknown';
      counts[src]=counts[src]||0;
      if(counts[src]>=maxPerSource) continue;
      out.push(item); counts[src]++;
      if(out.length>=maxTotal) break;
    }
    return {items:out,counts};
  }
  function sidePanel(counts,realCount){
    const sources=window.V11_NEWS_SOURCES||{};
    const leaderboard=Object.entries(sources).sort((a,b)=>b[1].score-a[1].score).map(([k,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${counts[k]||0}</td></tr>`).join('');
    return `<div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Rules</div><div class="subtle">Real article headlines only. Public/open links only. ${realCount<10?`Showing ${realCount} real stories right now.`:'Showing up to 10 real stories.'}</div></div><div class="glass-sm section"><div class="section-title">Accurate Social Accounts</div><div class="list">${SOCIAL.map(a=>`<div class="row"><div><div class="row-title">${esc(a.name)}</div><div class="row-meta">${esc(a.focus)} • score ${a.score}</div></div><div class="provider-badge-row">${a.links.map(([label,url])=>`<a class="story-link-chip" href="${esc(url)}" target="_blank">${esc(label)}</a>`).join('')}</div></div>`).join('')}</div></div></div>`;
  }
  function renderV10StyleNews(){
    const root=document.getElementById('newsIntelRoot');
    if(!root) return;
    const live=Array.isArray(window.V11_NEWS)?window.V11_NEWS:[];
    const filtered=live.filter(s=>(Date.now()-s.time)<=3600000).filter(isRealArticle).map(computeScore).sort((a,b)=>b.final-a.final);
    const pickedData=dedupeAndLimit(filtered,2,10);
    const picked=pickedData.items;
    const counts=pickedData.counts;
    if(!picked.length){
      root.innerHTML=`<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Real Article Headlines Available</div><div class="subtle">The live feeds did not return enough genuine article headlines right now. I did not replace them with generic site cards.</div></div></div>${sidePanel(counts,0)}</div>`;
      return;
    }
    root.innerHTML=`<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc((window.V11_NEWS_SOURCES||{})[s.source]?.name||s.source)} • ${Math.max(0,Math.round((Date.now()-s.time)/60000))}m ago</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc(s.summary||'')}</div><div class="story-score ${s.final>=80?'high':s.final>=60?'mid':'low'}">Overall: ${s.final} | Source: ${s.src} | Story: ${s.story}</div></div>`).join('')}</div>${sidePanel(counts,picked.length)}</div>`;
  }
  window.addEventListener('load',()=>{
    setTimeout(renderV10StyleNews,700);
    setTimeout(renderV10StyleNews,1800);
    const refresh=document.getElementById('refreshBtn');
    if(refresh) refresh.addEventListener('click',()=>setTimeout(renderV10StyleNews,900));
    const root=document.getElementById('newsIntelRoot');
    if(root){const obs=new MutationObserver(()=>setTimeout(renderV10StyleNews,80));obs.observe(root,{childList:true,subtree:true});}
  });
})();
