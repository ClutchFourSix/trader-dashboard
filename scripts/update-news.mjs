import fs from 'fs';

const FEEDS = [
  { source: 'fxstreet', name: 'FXStreet', score: 78, url: 'https://www.fxstreet.com/rss/news' },
  { source: 'zerohedge', name: 'ZeroHedge', score: 54, url: 'https://feeds.feedburner.com/zerohedge/feed' },
  { source: 'cointelegraph', name: 'Cointelegraph', score: 66, url: 'https://cointelegraph.com/rss' },
  { source: 'lynalden', name: 'Lyn Alden', score: 86, url: 'https://www.lynalden.com/feed/' }
];

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseItems(xml, source) {
  const items = [];
  const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  for (const m of matches.slice(0, 20)) {
    const block = m[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1] || block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
    const desc = stripHtml((block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] || block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '').trim());
    if (!title || !link) continue;
    items.push({
      source: source.source,
      source_name: source.name,
      source_score: source.score,
      title,
      url: link,
      summary: desc.slice(0, 280),
      published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
    });
  }
  return items;
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 news-bot' } });
  if (!r.ok) throw new Error(`Fetch failed ${url} ${r.status}`);
  return await r.text();
}

async function main() {
  const all = [];
  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      all.push(...parseItems(xml, feed));
    } catch (e) {
      console.error(`Failed ${feed.source}:`, e.message);
    }
  }

  const seen = new Set();
  const stories = all.filter(s => {
    const key = s.url || s.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);

  const out = {
    generated_at: new Date().toISOString(),
    stories
  };

  fs.writeFileSync('news.json', JSON.stringify(out, null, 2));
  console.log(`Wrote ${stories.length} stories to news.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
