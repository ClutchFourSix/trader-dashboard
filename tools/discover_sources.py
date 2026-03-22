import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS = ROOT / 'config' / 'discovery-seeds.json'
CANDIDATES = ROOT / 'data' / 'source-candidates.json'
HISTORY = ROOT / 'data' / 'discovery-history.json'
REGISTRY = ROOT / 'config' / 'source-registry.json'


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def save_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def normalize_key(name: str) -> str:
    return ''.join(ch.lower() if ch.isalnum() else '-' for ch in name).strip('-')


def score_candidate(seed: dict) -> dict:
    independent = float(seed.get('independent_bias', 0.5)) * 100
    influence = float(seed.get('market_influence', 0.5)) * 100
    public_bonus = 8 if seed.get('public') else -6
    rss_bonus = 10 if seed.get('rss') else 0
    category_bonus = 6 if seed.get('category') in {'macro', 'fx-macro', 'crypto-macro', 'macro-crossasset', 'macro-credit'} else 2
    discovery_score = round(independent * 0.45 + influence * 0.35 + public_bonus + rss_bonus + category_bonus)
    discovery_score = max(0, min(100, discovery_score))
    return {
        'key': normalize_key(seed['name']),
        'name': seed['name'],
        'homepage': seed.get('homepage'),
        'rss': seed.get('rss'),
        'category': seed.get('category'),
        'public': bool(seed.get('public')),
        'independent_score': round(independent),
        'influence_score': round(influence),
        'discovery_score': discovery_score,
        'status': 'promote' if discovery_score >= 75 else 'watch',
    }


def main():
    seeds = load_json(SEEDS, {'seed_sources': []})
    history = load_json(HISTORY, {'generated_at': None, 'runs': []})
    registry = load_json(REGISTRY, {'sources': []})
    now = datetime.now(timezone.utc).isoformat()

    candidates = [score_candidate(seed) for seed in seeds.get('seed_sources', [])]
    candidates.sort(key=lambda c: (-c['discovery_score'], -c['influence_score'], c['name']))

    existing_keys = {src.get('key') for src in registry.get('sources', [])}
    promoted = []
    for c in candidates:
        if c['status'] == 'promote' and c['key'] not in existing_keys:
            promoted.append(c['key'])

    out = {
        'generated_at': now,
        'candidates': candidates,
    }
    history['generated_at'] = now
    history['runs'].append({
        'timestamp': now,
        'candidate_count': len(candidates),
        'promoted_ready': promoted,
    })
    history['runs'] = history['runs'][-50:]

    save_json(CANDIDATES, out)
    save_json(HISTORY, history)
    print(f'Discovered/scored {len(candidates)} source candidates')


if __name__ == '__main__':
    main()
