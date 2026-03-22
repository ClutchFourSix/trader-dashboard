import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCORES = ROOT / 'data' / 'source-scores.json'
FEED = ROOT / 'data' / 'news-feed.json'
FALLBACK = ROOT / 'data' / 'news-feed-fallback.json'
SEED = ROOT / 'data' / 'news-feed-seed.json'


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def save_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def pick_feed():
    for path in (FEED, FALLBACK, SEED):
        data = load_json(path, None)
        if data and data.get('stories'):
            return data
    return {'stories': []}


def main():
    scores = load_json(SCORES, {'generated_at': None, 'sources': {}})
    feed = pick_feed()
    counts = {}
    for story in feed.get('stories', []):
        src = story.get('source')
        if not src:
            continue
        counts[src] = counts.get(src, 0) + 1

    now = datetime.now(timezone.utc).isoformat()
    for key, val in scores.get('sources', {}).items():
        val['stories_evaluated'] = counts.get(key, 0)
        val['last_updated'] = now
        rolling = int(val.get('rolling_score', 60))
        influence = int(val.get('influence_score', 60))
        bump = min(6, counts.get(key, 0))
        val['rolling_score'] = max(0, min(100, round(rolling * 0.9 + influence * 0.1 + bump)))

    scores['generated_at'] = now
    save_json(SCORES, scores)
    print('Refreshed source score stats from current feed')


if __name__ == '__main__':
    main()
