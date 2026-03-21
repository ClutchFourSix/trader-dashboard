import json
import time
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'news-feed.json'

FEEDS = [
    ("fxstreet", "FXStreet", "https://www.fxstreet.com/rss/news"),
    ("cointelegraph", "Cointelegraph", "https://cointelegraph.com/rss"),
    ("zerohedge", "ZeroHedge", "https://feeds.feedburner.com/zerohedge/feed"),
]

SOURCE_SCORES = {
    "fxstreet": 78,
    "cointelegraph": 66,
    "zerohedge": 54,
}

KEYWORDS = [
    "cpi", "inflation", "fed", "fomc", "rates", "yield", "jobs", "nfp",
    "pce", "ppi", "bitcoin", "crypto", "gold", "oil", "treasury",
    "dollar", "usd", "eur", "jpy", "xau", "stocks", "bonds"
]


def fetch_text(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def parse_rss(xml_text: str):
    root = ET.fromstring(xml_text)
    items = []
    for item in root.findall('.//item'):
        title = (item.findtext('title') or '').strip()
        link = (item.findtext('link') or '').strip()
        description = (item.findtext('description') or '').strip()
        pub_date = (item.findtext('pubDate') or '').strip()
        items.append({
            'title': title,
            'link': link,
            'summary': description,
            'pub_date': pub_date,
        })
    return items


def age_minutes(pub_date: str) -> int:
    if not pub_date:
        return 10**9
    try:
        dt = parsedate_to_datetime(pub_date)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int((datetime.now(timezone.utc) - dt).total_seconds() // 60)
    except Exception:
        return 10**9


def relevance_score(title: str, summary: str) -> int:
    text = f"{title} {summary}".lower()
    score = 0
    for kw in KEYWORDS:
        if kw in text:
            score += 3
    if any(w in text for w in ["surge", "crash", "spike", "plunge", "rally", "selloff"]):
        score += 2
    return score


def score_story(source_key: str, title: str, summary: str, age_min: int) -> dict:
    src = SOURCE_SCORES.get(source_key, 60)
    story = 55
    if age_min <= 30:
        story += 14
    elif age_min <= 120:
        story += 9
    elif age_min <= 360:
        story += 4
    elif age_min <= 1440:
        story += 1
    elif age_min <= 2880:
        story -= 4
    else:
        story -= 10
    story += min(12, relevance_score(title, summary))
    story = max(0, min(100, round(story)))
    final = round(src * 0.5 + story * 0.5)
    return {"source_score": src, "story_score": story, "final_score": final}


def build():
    stories = []
    seen = set()
    for source_key, source_name, url in FEEDS:
        try:
            xml_text = fetch_text(url)
            for item in parse_rss(xml_text):
                title = item['title']
                link = item['link']
                if not title or not link or link in seen:
                    continue
                seen.add(link)
                summary = item['summary']
                mins = age_minutes(item['pub_date'])
                scores = score_story(source_key, title, summary, mins)
                stories.append({
                    'source': source_key,
                    'source_name': source_name,
                    'title': title,
                    'link': link,
                    'summary': summary,
                    'published_at': item['pub_date'],
                    'age_minutes': mins,
                    **scores,
                })
        except Exception as e:
            print(f"Feed failed for {source_key}: {e}")
    stories.sort(key=lambda s: (-s['final_score'], s['age_minutes']))
    data = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'source': 'github-action',
        'stories': stories[:50],
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Wrote {len(data['stories'])} stories to {OUT}")


if __name__ == '__main__':
    build()
