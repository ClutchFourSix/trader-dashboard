(function(){
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function qs(sel){return document.querySelector(sel)}
  async function tryFetchJson(path){
    try{
      const res = await fetch(path + '?v=' + Date.now(), {cache:'no-store'});
      if(!res.ok) return null;
      return await res.json();
    }catch{return null}
  }
  async function loadCachedFeed(){
    const primary = await tryFetchJson('./data/news-feed.json');
    if(primary && Array.isArray(primary.stories) && primary.stories.length) return primary;
    const seed = await tryFetchJson('./data/news-feed-seed.json');
    if(seed) return seed;
    return primary;
  }
  function ageLabel(ageMin){
    const m = Number(ageMin);
    if(!Number.isFinite(m)) return '-';
    if(m < 60) return `${m}m ago`;
    return `${Math.floor(m/60)}h ${m%60}m ago`;
  }
  function dedupeAndLimit(items, maxPerSource=2, maxTotal=10){
    const seen=new Set(), counts={}, out=[];
    for(const item of items){
      const key=item.link||item.title;
      if(seen.has(key)) continue;
      seen.add(key);
      const src=item.source||'unknown'; counts[src]=counts[src]||0;
      if(counts[src] >= maxPerSource) continue;
      out.push(item); counts[src]++;
      if(out.length >= maxTotal) break;
    }
    return {items: out, counts};
  }
  function sourceScores(){
    try { return (typeof V11_NEWS_SOURCES !== 'undefined' && V11_NEWS_SOURCES) ? V11_NEWS_SOURCES : {}; }
    catch { return {}; }
  }
  function renderCachedNews(data){
    const root = qs('#newsIntelRoot');
    if(!root) return;
    const stories = Array.isArray(data?.stories) ? data.stories.slice() : [];
    const ranked = stories.sort((a,b)=>(b.final_score||0)-(a.final_score||0) || (a.age_minutes||0)-(b.age_minutes||0));
    const pickedData = dedupeAndLimit(ranked, 2, 10);
    const picked = pickedData.items;
    const counts = pickedData.counts;
    const sources = sourceScores();
    const leaderboard = Object.entries(sources).sort((a,b)=>b[1].score-a[1].score).map(([k,s])=>`<tr><td>${esc(s.name)}</td><td>${s.score}</td><td>${counts[k]||0}</td></tr>`).join('');

    if(!picked.length){
      root.innerHTML = `<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Cached Stories Yet</div><div class="subtle">Neither the primary cache nor the seed cache contains stories yet.</div></div></div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Status</div><div class="subtle">Cache file loaded, but it contains no stories yet.</div></div></div></div>`;
      return;
    }

    root.innerHTML = `<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc(s.source_name || sources[s.source]?.name || s.source)} • ${ageLabel(s.age_minutes)}</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc((s.summary||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())}</div><div class="story-score ${(s.final_score||0)>=80?'high':(s.final_score||0)>=60?'mid':'low'}">Overall: ${s.final_score||0} | Source: ${s.source_score||0} | Story: ${s.story_score||0}</div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Source Scores</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Shown</th></tr></thead><tbody>${leaderboard}</tbody></table></div><div class="glass-sm section"><div class="section-title">Cache Status</div><div class="subtle">Generated: ${esc(data.generated_at || 'unknown')}<br>Source: ${esc(data.source || 'unknown')}<br>Using cached JSON feed with seed fallback.</div></div></div></div>`;
  }
  async function renderNewsFromCache(){
    const data = await loadCachedFeed();
    if(data) renderCachedNews(data);
  }
  window.addEventListener('load',()=>{
    setTimeout(renderNewsFromCache, 2200);
    setTimeout(renderNewsFromCache, 4200);
    const refresh = qs('#refreshBtn');
    if(refresh) refresh.addEventListener('click', ()=> setTimeout(renderNewsFromCache, 1200));
  });
})();
