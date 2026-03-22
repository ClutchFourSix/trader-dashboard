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
    if(primary && Array.isArray(primary.stories) && primary.stories.length) return {...primary, _feed_label:'primary'};
    const fresh = await tryFetch('./data/news-feed-fallback.json');
    if(fresh && Array.isArray(fresh.stories) && fresh.stories.length) return {...fresh, _feed_label:'fresh-fallback'};
    const seed = await tryFetch('./data/news-feed-seed.json');
    return seed ? {...seed, _feed_label:'seed'} : {stories:[], _feed_label:'empty'};
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

  function freshnessBucket(ageMin){
    const m = Number(ageMin);
    if(m <= 180) return 'hot';
    if(m <= 1440) return 'warm';
    if(m <= 4320) return 'cool';
    return 'stale';
  }

  function recencyBoost(ageMin){
    const m = Number(ageMin);
    if(m <= 180) return 18;
    if(m <= 720) return 12;
    if(m <= 1440) return 8;
    if(m <= 4320) return 4;
    if(m <= 10080) return 1;
    return -6;
  }

  function rerankStories(stories){
    return stories.map(s=>{
      const baseFinal = Number(s.final_score || 0);
      const sourceScore = Number(s.source_score || 0);
      const storyScore = Number(s.story_score || 0);
      const ageMin = Number(s.age_minutes || 999999);
      const reranked = Math.round(baseFinal * 0.55 + sourceScore * 0.15 + storyScore * 0.1 + recencyBoost(ageMin) * 1.2);
      return {...s, reranked_score: reranked};
    }).sort((a,b)=> (b.reranked_score||0) - (a.reranked_score||0) || (a.age_minutes||0) - (b.age_minutes||0));
  }

  function pickTopStories(items, maxTotal=10){
    const seen=new Set();
    const counts={};
    const out=[];
    let maxPerSource=2;
    const ranked = rerankStories(items);

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

  function topicTags(summary, title){
    const text = `${title} ${summary}`.toLowerCase();
    const tags = [];
    if(/cpi|inflation|ppi|pce/.test(text)) tags.push('Inflation');
    if(/fed|fomc|rate|yield|treasury/.test(text)) tags.push('Fed/Rates');
    if(/usd|eur|jpy|dollar|fx/.test(text)) tags.push('FX');
    if(/bitcoin|crypto|ether|stablecoin/.test(text)) tags.push('Crypto');
    if(/gold|oil|commodity/.test(text)) tags.push('Commodities');
    if(/jobs|nfp|labor/.test(text)) tags.push('Labor');
    return tags.slice(0,3);
  }

  function buildThemeCards(stories){
    const buckets = {};
    for(const s of stories){
      for(const tag of topicTags(s.summary||'', s.title||'')){
        buckets[tag] = buckets[tag] || {count:0, best:0};
        buckets[tag].count += 1;
        buckets[tag].best = Math.max(buckets[tag].best, Number(s.reranked_score||0));
      }
    }
    const ordered = Object.entries(buckets).sort((a,b)=> (b[1].best + b[1].count*2) - (a[1].best + a[1].count*2)).slice(0,6);
    if(!ordered.length) return `<div class="glass-sm section"><div class="section-title">Market Themes</div><div class="subtle">No strong themes detected yet.</div></div>`;
    return `<div class="glass-sm section"><div class="section-title">Market Themes</div><div class="list">${ordered.map(([tag,val])=>`<div class="row"><div><div class="row-title">${esc(tag)}</div><div class="row-meta">${val.count} stories • best score ${val.best}</div></div></div>`).join('')}</div></div>`;
  }

  function buildFreshnessCard(stories, feedLabel){
    const hot = stories.filter(s=>freshnessBucket(s.age_minutes)==='hot').length;
    const warm = stories.filter(s=>freshnessBucket(s.age_minutes)==='warm').length;
    const cool = stories.filter(s=>freshnessBucket(s.age_minutes)==='cool').length;
    const stale = stories.filter(s=>freshnessBucket(s.age_minutes)==='stale').length;
    return `<div class="glass-sm section"><div class="section-title">Freshness</div><div class="subtle">Feed: ${esc(feedLabel)}<br>Hot: ${hot} • Warm: ${warm}<br>Cool: ${cool} • Stale: ${stale}</div></div>`;
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
      return `<div class="news-layout"><div class="story-stack"><div class="glass-sm section"><div class="section-title">No Cached Stories Available</div><div class="subtle">The backend news renderer is active, but no cached stories were available in the primary, fresh fallback, or seed feeds.</div></div></div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Top Sources</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Seen</th></tr></thead><tbody>${leaders}</tbody></table></div>${buildFreshnessCard(stories, feed?._feed_label||'unknown')}</div></div>`;
    }

    return `<div class="news-layout"><div class="story-stack">${picked.map((s,idx)=>`<div class="story ${idx===0?'top':''}"><div class="story-rank">#${idx+1} • ${esc(s.source_name || sources[s.source]?.name || s.source)} • ${ageLabel(s.age_minutes)} • ${freshnessBucket(s.age_minutes)}</div><div class="story-title"><a href="${esc(s.link)}" target="_blank">${esc(s.title)}</a></div><div class="story-summary">${esc((s.summary||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim())}</div><div class="story-score ${(s.reranked_score||0)>=80?'high':(s.reranked_score||0)>=60?'mid':'low'}">Ranked: ${s.reranked_score||0} | Base: ${s.final_score||0} | Source: ${s.source_score||0} | Story: ${s.story_score||0}</div></div>`).join('')}</div><div class="side-stack"><div class="glass-sm section"><div class="section-title">Top Sources</div><table class="table"><thead><tr><th>Source</th><th>Score</th><th>Seen</th></tr></thead><tbody>${leaders}</tbody></table></div>${buildThemeCards(picked)}${buildFreshnessCard(picked, feed?._feed_label||'unknown')}<div class="glass-sm section"><div class="section-title">Feed Status</div><div class="subtle">Generated: ${esc(feed.generated_at||'unknown')}<br>Score update: ${esc(scores?.generated_at||'unknown')}<br>Stories shown: ${picked.length}<br>Per-source cap used: ${pickedData.maxPerSourceUsed}<br>Renderer: freshness-aware backend mode</div></div></div></div>`;
  }

  async function paint(){
    const root = qs('#newsIntelRoot');
    if(!root) return;
    const [feed, scores] = await Promise.all([loadFeed(), loadScores()]);
    const html = renderHtml(feed || {stories:[], _feed_label:'empty'}, scores || {sources:{}});
    root.innerHTML = html;
    lockRoot(root, html);
  }

  function lockRoot(root, html){
    if(observer) observer.disconnect();
    observer = new MutationObserver(() => {
      const text = root.textContent || '';
      const overwritten = /open fxstreet|open site|loading|no real article headlines available/i.test(text);
      const missing = !root.querySelector('.story') && !/no cached stories available/i.test(text);
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
