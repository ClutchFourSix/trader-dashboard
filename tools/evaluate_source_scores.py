import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'config' / 'source-registry.json'
SCORES = ROOT / 'data' / 'source-scores.json'
HISTORY = ROOT / 'data' / 'source-score-history.json'
FEED = ROOT / 'data' / 'news-feed.json'
SEED = ROOT / 'data' / 'news-feed-seed.json'


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def save_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    registry = load_json(REGISTRY, {"sources": []})
    scores = load_json(SCORES, {"generated_at": None, "sources": {}})
    history = load_json(HISTORY, {"generated_at": None, "history": []})
    feed = load_json(FEED, None)
    if not feed or not feed.get('stories'):
        feed = load_json(SEED, {"stories": []})

    story_counts = {}
    for story in feed.get('stories', []):
        key = story.get('source')
        if not key:
            continue
        story_counts[key] = story_counts.get(key, 0) + 1

    now = datetime.now(timezone.utc).isoformat()
    snapshot = {"timestamp": now, "sources": {}}

    for src in registry.get('sources', []):
        key = src['key']
        base_accuracy = int(src.get('base_accuracy', 60))
        influence = int(round(float(src.get('influence_weight', 0.5)) * 100))
        count = story_counts.get(key, 0)
        rolling = max(0, min(100, round(base_accuracy * 0.7 + influence * 0.3 + min(6, count))))
        existing = scores['sources'].get(key, {})
        updated = {
            'name': src['name'],
            'accuracy_score': base_accuracy,
            'influence_score': influence,
            'consistency_score': existing.get('consistency_score', base_accuracy),
            'false_alarm_score': existing.get('false_alarm_score', max(40, base_accuracy - 8)),
            'rolling_score': rolling,
            'stories_evaluated': count,
            'last_updated': now,
        }
        scores['sources'][key] = updated
        snapshot['sources'][key] = updated

    scores['generated_at'] = now
    history['generated_at'] = now
    history['history'].append(snapshot)
    history['history'] = history['history'][-30:]

    save_json(SCORES, scores)
    save_json(HISTORY, history)
    print('Updated source scores and history')


if __name__ == '__main__':
    main()
