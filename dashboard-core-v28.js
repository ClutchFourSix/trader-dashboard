(function(){
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
  function qs(sel){return document.querySelector(sel)}
  let locked = false;
  let observer = null;

  async function loadJson(path){
    try{
      const res = await fetch(path + '?v=' + Date.now(), {cache:'no-store'});
      if(!res.ok) return null;
      return await res.json();
    }catch{return null}
  }

  async function loadFeed(){
    let feed = await loadJson('./data/news-feed.json');
    if(feed && Array.isArray(feed.stories) && feed.stories.length) return feed;
    feed = await loadJson('./data/news-feed-seed.json');
    return feed;
  }

  async function loadScores(){
    return await loadJson('./data/source-scores.json');
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

  function renderHtml(feed, scores){
    const stories = Array.isArray(feed?.stories) ? feed.stories.slice() : [];
    const sources = scores?.sources || {};
    stories.sort((a,b)=>(b.final_score||0)-(a.final_score||0) || (a.age_minutes||0)-(b.age_minutes||0));
    const pickedData = dedupeAndLimit(stories, 2, 10);
    const picked = pickedData.items;
    const counts = pickedData.counts;
    const leaders = Object.entries(sources)
      .sort((a,b)=>(b[1].rolling_score||0)-(a[1].rolling_score||0))
      .slice(0,8)
      .map(([k,v])=>`<tr><td>${esc(v.name||k)}</td><td>${v.rolling_score||0}</td><td>${v.stories_evaluated||0}</td></tr>`).join('');

    if(!picked.length){
      return `<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Cached Stories Available</div><div class="subtle">The backend news renderer is active, but the cache still has no stories.</div></div></div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Top Sources</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Seen</th></tr></thead><tbody>${leaders}</tbody></table></div></div></div>`;
    }

    return `<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc(s.source_name || sources[s.source]?.name || s.source)} • ${ageLabel(s.age_minutes)}</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc((s.summary||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())}</div><div class="story-score ${(s.final_score||0)>=80?'high':(s.final_score||0)>=60?'mid':'low'}">Overall: ${s.final_score||0} | Source: ${s.source_score||0} | Story: ${s.story_score||0}</div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Top Sources</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Seen</th></tr></thead><tbody>${leaders}</tbody></table></div><div class="glass-sm section"><div class="section-title">Feed Status</div><div class="subtle">Generated: ${esc(feed.generated_at||'unknown')}<br>Score update: ${esc(scores?.generated_at||'unknown')}<br>Stories shown: ${picked.length}<br>Renderer: locked backend mode</div></div></div></div>`;
  }

  async function paint(){
    const root = qs('#newsIntelRoot');
    if(!root) return;
    const feed = await loadFeed();
    const scores = await loadScores();
    const html = renderHtml(feed, scores || {sources:{}});
    locked = true;
    root.innerHTML = html;
    lockRoot(root, html);
  }

  function lockRoot(root, html){
    if(observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if(!locked) return;
      const hasStory = root.querySelector('.story, .section-title');
      const text = root.textContent || '';
      if(!hasStory || /no news|loading|open fxstreet|open site/i.test(text)){
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
