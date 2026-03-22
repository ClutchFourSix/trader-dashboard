(function(){
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function qs(sel){return document.querySelector(sel)}
  let observer = null;

  async function tryFetch(path){
    try{
      const res = await fetch(path + '?v=' + Date.now(), {cache:'no-store'});
      if(!res.ok) return null;
      return await res.json();
    }catch{return null}
  }

  async function loadFeed(){
    const primary = await tryFetch('./data/news-feed.json');
    if(primary && Array.isArray(primary.stories) && primary.stories.length) return primary;
    const fresh = await tryFetch('./data/news-feed-fallback.json');
    if(fresh && Array.isArray(fresh.stories) && fresh.stories.length) return fresh;
    const seed = await tryFetch('./data/news-feed-seed.json');
    return seed;
  }

  async function loadScores(){
    return await tryFetch('./data/source-scores.json');
  }

  function ageLabel(ageMin){
    const m = Number(ageMin);
    if(!Number.isFinite(m)) return '-';
    if(m < 60) return `${m}m ago`;
    if(m < 1440) return `${Math.floor(m/60)}h ${m%60}m ago`;
    return `${Math.floor(m/1440)}d ${Math.floor((m%1440)/60)}h ago`;
  }

  function pickTopStories(items, maxTotal=10){
    const seen=new Set();
    const counts={};
    const out=[];
    let maxPerSource=2;
    const ranked = items.slice().sort((a,b)=>(b.final_score||0)-(a.final_score||0) || (a.age_minutes||0)-(b.age_minutes||0));

    while(out.length < Math.min(maxTotal, ranked.length) && maxPerSource <= 10){
      out.length = 0;
      Object.keys(counts).forEach(k=>delete counts[k]);
      seen.clear();
      for(const item of ranked){
        const key=item.link||item.title;
        if(seen.has(key)) continue;
        seen.add(key);
        const src=item.source||'unknown';
        counts[src]=counts[src]||0;
        if(counts[src] >= maxPerSource) continue;
        out.push(item);
        counts[src]++;
        if(out.length >= maxTotal) break;
      }
      if(out.length >= Math.min(maxTotal, ranked.length)) break;
      maxPerSource += 1;
    }
    return {items: out, counts, maxPerSourceUsed: maxPerSource};
  }

  function renderHtml(feed, scores){
    const stories = Array.isArray(feed?.stories) ? feed.stories.slice() : [];
    const sources = scores?.sources || {};
    const pickedData = pickTopStories(stories, 10);
    const picked = pickedData.items;
    const counts = pickedData.counts;
    const leaders = Object.entries(sources)
      .sort((a,b)=>(b[1].rolling_score||0)-(a[1].rolling_score||0))
      .slice(0,8)
      .map(([k,v])=>`<tr><td>${esc(v.name||k)}</td><td>${v.rolling_score||0}</td><td>${v.stories_evaluated||0}</td></tr>`).join('');

    if(!picked.length){
      return `<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Cached Stories Available</div><div class="subtle">The backend news renderer is active, but no cached stories were available in the primary, fresh fallback, or seed feeds.</div></div></div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Top Sources</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Seen</th></tr></thead><tbody>${leaders}</tbody></table></div></div></div>`;
    }

    return `<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc(s.source_name || sources[s.source]?.name || s.source)} • ${ageLabel(s.age_minutes)}</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc((s.summary||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())}</div><div class="story-score ${(s.final_score||0)>=80?'high':(s.final_score||0)>=60?'mid':'low'}">Overall: ${s.final_score||0} | Source: ${s.source_score||0} | Story: ${s.story_score||0}</div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Top Sources</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Seen</th></tr></thead><tbody>${leaders}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Status</div><div class="subtle">Generated: ${esc(feed.generated_at||'unknown')}<br>Score update: ${esc(scores?.generated_at||'unknown')}<br>Stories shown: ${picked.length}<br>Per-source cap used: ${pickedData.maxPerSourceUsed}<br>Renderer: locked backend mode</div></div></div></div>`;
  }

  async function paint(){
    const root = qs('#newsIntelRoot');
    if(!root) return;
    const feed = await loadFeed();
    const scores = await loadScores();
    const html = renderHtml(feed || {stories:[]}, scores || {sources:{}});
    root.innerHTML = html;
    lockRoot(root, html);
  }

  function lockRoot(root, html){
    if(observer) observer.disconnect();
    observer = new MutationObserver(() => {
      const text = root.textContent || '';
      const overwritten = /open fxstreet|open site|loading|no real article headlines available/i.test(text);
      const missing = !root.querySelector('.story');
      if(overwritten || missing){
        observer.disconnect();
        root.innerHTML = html;
        lockRoot(root, html);
      }
    });
    observer.observe(root, {childList:true, subtree:true, characterData:true});
  }

  window.addEventListener('load',()=>{
    setTimeout(paint, 1200);
    setTimeout(paint, 2600);
    setTimeout(paint, 5000);
    const refresh = qs('#refreshBtn');
    if(refresh) refresh.addEventListener('click', ()=> setTimeout(paint, 800));
  });
})();
