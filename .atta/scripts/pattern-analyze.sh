#!/usr/bin/env bash

# Pattern Analysis Script
# Reads corrections.jsonl and rebuilds patterns-learned.json
# Usage:
#   .atta/scripts/pattern-analyze.sh                    # Auto-detect (.atta/)
#   .atta/scripts/pattern-analyze.sh /path/to/attaDir   # Explicit attaDir

set -euo pipefail

# Load shared utilities
source "$(dirname "${BASH_SOURCE[0]}")/lib/_common.sh"

# Determine Atta directory (allow override via argument)
ATTA_DIR="${1:-}"
resolve_atta_dir
validate_atta_dir

CONTEXT_DIR="$ATTA_DIR/.context"
CORRECTIONS_FILE="$CONTEXT_DIR/corrections.jsonl"
OUTPUT_FILE="$CONTEXT_DIR/patterns-learned.json"
AGENT_FILE="$CONTEXT_DIR/agent-learning.json"

# Check if corrections file exists
if [ ! -f "$CORRECTIONS_FILE" ]; then
  echo "No corrections found at $CORRECTIONS_FILE"
  exit 0
fi

# Require python3
if ! command -v python3 >/dev/null 2>&1; then
  echo "Warning: python3 required for pattern analysis but not found." >&2
  exit 0
fi

# Ensure context directory exists
mkdir -p "$CONTEXT_DIR"

# Aggregate corrections and rebuild patterns-learned.json
# Optimized: pre-sort groups once, single-pass time-window accumulation
python3 -c "
import json, sys, os
from datetime import datetime, timezone, timedelta
from collections import defaultdict

corrections_file = sys.argv[1]
output_file = sys.argv[2]
agent_file = sys.argv[3]

# Thresholds per category
THRESHOLDS = {
    'correction': 3,
    'anti-pattern': 5,
    'command-sequence': 3,
}

# Time windows (computed once)
now_dt = datetime.now(timezone.utc)
now = now_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
seven_days_ago_str = (now_dt - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
fourteen_days_ago_str = (now_dt - timedelta(days=14)).strftime('%Y-%m-%dT%H:%M:%SZ')
thirty_days_ago_str = (now_dt - timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%SZ')

# --- Pass 1: Read, parse, and accumulate in a single pass ---
events = []
groups = defaultdict(list)
agent_groups = defaultdict(list)
all_pattern_agents = defaultdict(lambda: {'agents': set(), 'total': 0, 'desc': ''})

# Time-window counters (accumulated during read)
last_7_count = 0
prior_7_count = 0
all_last7_accepted = 0
all_last7_total = 0
all_last30_accepted = 0
all_last30_total = 0

with open(corrections_file, 'r') as f:
    for line_num, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            print('Warning: Skipping malformed line %d in corrections.jsonl' % line_num, file=sys.stderr)
            continue

        events.append(ev)
        ts = ev.get('timestamp', '')
        pattern_key = ev.get('pattern', 'unknown')
        agent_id = ev.get('agentId') or ev.get('context', {}).get('agent', '')
        outcome = ev.get('outcome', '')

        # Group by pattern
        groups[pattern_key].append(ev)

        # Group by agent
        if agent_id:
            agent_groups[agent_id].append(ev)
            # Project-wide pattern-agent tracking
            all_pattern_agents[pattern_key]['agents'].add(agent_id)
            all_pattern_agents[pattern_key]['total'] += 1
            all_pattern_agents[pattern_key]['desc'] = ev.get('description', '')

        # Time-window accumulation
        if ts >= seven_days_ago_str:
            last_7_count += 1
            all_last7_total += 1
            if outcome == 'accepted':
                all_last7_accepted += 1
        elif ts >= fourteen_days_ago_str:
            prior_7_count += 1

        if ts >= thirty_days_ago_str:
            all_last30_total += 1
            if outcome == 'accepted':
                all_last30_accepted += 1

if not events:
    # Write empty-but-valid files to clear any stale data
    empty_patterns = {'schemaVersion': '1.1.0', 'generatedAt': now, 'patterns': [], 'stats': {'totalCorrections': 0, 'uniquePatterns': 0, 'readyToPromote': 0, 'alreadyPromoted': 0}, 'trends': None, 'recommendations': []}
    empty_agents = {'schemaVersion': '1.1.0', 'generatedAt': now, 'agents': {}, 'projectPreferences': [], 'stats': {'totalAgentsTracked': 0, 'totalEvents': 0, 'overallAcceptanceRate': 0}, 'trends': None, 'recommendations': []}
    for fpath, data in [(output_file, empty_patterns), (agent_file, empty_agents)]:
        with open(fpath, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
    print('No correction events found. Cleared stale data.')
    sys.exit(0)

# --- Pre-sort each group once (reused by pattern summaries, trend analysis, aging) ---
sorted_groups = {}
for key, entries in groups.items():
    sorted_groups[key] = sorted(entries, key=lambda e: e.get('timestamp', ''))

# Load promoted patterns from append-only tracking file (if exists)
promoted_file = os.path.join(os.path.dirname(corrections_file), 'promoted-patterns.json')
promoted_set = set()
if os.path.exists(promoted_file):
    try:
        with open(promoted_file, 'r') as pf:
            promoted_data = json.load(pf)
            promoted_set = set(p.get('pattern', '') for p in promoted_data.get('promotions', []))
    except (json.JSONDecodeError, IOError):
        pass

# Category priority for deterministic tie-breaking (lower = higher priority)
CATEGORY_PRIORITY = {'anti-pattern': 0, 'correction': 1, 'command-sequence': 2}

# --- Build pattern summaries (using pre-sorted groups) ---
patterns = []
total_promoted = 0
total_ready = 0

for pattern_key in sorted(groups.keys()):
    entries = groups[pattern_key]
    sorted_entries = sorted_groups[pattern_key]

    # Use the most common category for this pattern (deterministic tie-break by priority)
    categories = [e.get('category', 'correction') for e in entries]
    primary_category = max(set(categories), key=lambda c: (categories.count(c), -CATEGORY_PRIORITY.get(c, 99)))
    threshold = THRESHOLDS.get(primary_category, 3)

    count = len(entries)
    ready = count >= threshold
    # A pattern is considered promoted if any of its events has been promoted,
    # OR if it appears in the promoted-patterns.json file (append-only promotion tracking)
    promoted = any(e.get('promoted', False) for e in entries) or pattern_key in promoted_set

    if ready:
        total_ready += 1
    if promoted:
        total_promoted += 1

    # Extract from pre-sorted entries
    description = sorted_entries[-1].get('description', '')
    first_seen = sorted_entries[0].get('timestamp', '')
    last_seen = sorted_entries[-1].get('timestamp', '')

    # Build suggested directive from context
    contexts = [e.get('context', {}) for e in entries]
    domains = [c.get('domain', '') for c in contexts if c.get('domain')]
    primary_domain = max(set(domains), key=domains.count) if domains else 'general'

    # Map domain to likely pattern file
    domain_to_file = {
        'language': '.atta/knowledge/patterns/%s-patterns.md' % primary_domain,
        'framework': '.atta/knowledge/patterns/framework-patterns.md',
        'styling': '.atta/knowledge/patterns/styling-patterns.md',
        'security': '.atta/knowledge/patterns/security-patterns.md',
        'testing': '.atta/knowledge/patterns/testing-patterns.md',
        'accessibility': '.atta/knowledge/patterns/accessibility-patterns.md',
    }
    target_file = domain_to_file.get(primary_domain, '.atta/knowledge/patterns/%s-patterns.md' % primary_domain)

    pattern_summary = {
        'pattern': pattern_key,
        'category': primary_category,
        'count': count,
        'threshold': threshold,
        'ready': ready,
        'firstSeen': first_seen,
        'lastSeen': last_seen,
        'description': description,
        'occurrences': [e.get('id', '') for e in entries],
        'suggestedDirective': {
            'rule': description,
            'applies_to': list(set(domains)) or ['general'],
            'targetFile': target_file,
            'targetSection': 'Anti-Patterns to Flag',
        },
        'promoted': promoted,
    }
    patterns.append(pattern_summary)

# Sort: ready-and-unpromoted first, then by count descending
patterns.sort(key=lambda p: (not (p['ready'] and not p['promoted']), -p['count']))

# --- Trend Analysis (using pre-sorted groups and accumulated counters) ---
velocity_direction = 'up' if last_7_count > prior_7_count else ('down' if last_7_count < prior_7_count else 'stable')

# Avg time-to-ready: days from firstSeen to threshold for ready patterns
ready_times = []
aging = []
for p in patterns:
    if not p['ready']:
        continue
    if p['firstSeen'] and p['lastSeen']:
        try:
            first = datetime.strptime(p['firstSeen'][:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc)
            # Approximate ready time: when the threshold-th event arrived (from pre-sorted group)
            group_sorted = sorted_groups[p['pattern']]
            threshold_idx = min(p['threshold'], len(group_sorted)) - 1
            ready_ts = group_sorted[threshold_idx].get('timestamp', p['lastSeen'])
            ready_dt = datetime.strptime(ready_ts[:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc)
            ready_times.append((ready_dt - first).total_seconds() / 86400)

            # Aging check (ready + not promoted + waiting 7+ days)
            if not p['promoted']:
                days_since_ready = round((now_dt - ready_dt).total_seconds() / 86400, 1)
                if days_since_ready >= 7:
                    aging.append({
                        'pattern': p['pattern'],
                        'readySince': ready_ts,
                        'daysSinceReady': days_since_ready,
                    })
        except (ValueError, IndexError):
            pass
avg_time_to_ready = round(sum(ready_times) / len(ready_times), 1) if ready_times else None

trends_data = {
    'velocity': {
        'last7Days': last_7_count,
        'prior7Days': prior_7_count,
        'direction': velocity_direction,
        'delta': last_7_count - prior_7_count,
    },
    'avgTimeToReady': avg_time_to_ready,
    'agingPatterns': aging,
}

# --- Recommendations ---
recommendations = []

for a in aging:
    pname = a['pattern']
    pdays = int(a['daysSinceReady'])
    recommendations.append({
        'type': 'promote-stale',
        'priority': 'high',
        'message': 'Pattern \'%s\' has been ready for %d days - consider promoting' % (pname, pdays),
        'pattern': pname,
        'data': {'daysSinceReady': a['daysSinceReady']},
    })

domain_counts = defaultdict(list)
for p in patterns:
    if not p['promoted']:
        p_domains = p['suggestedDirective'].get('applies_to', ['general'])
        for d in p_domains:
            if d != 'general':
                domain_counts[d].append(p['pattern'])
for domain, pats in domain_counts.items():
    if len(pats) >= 3:
        recommendations.append({
            'type': 'domain-cluster',
            'priority': 'medium',
            'message': '%d patterns in \'%s\' domain - consider a focused review' % (len(pats), domain),
            'data': {'domain': domain, 'count': len(pats), 'patterns': pats},
        })

if last_7_count >= 2 * max(prior_7_count, 1) and last_7_count >= 3:
    recommendations.append({
        'type': 'velocity-spike',
        'priority': 'info',
        'message': 'Correction rate increased this week: %d events (vs %d prior week)' % (last_7_count, prior_7_count),
        'data': {'current': last_7_count, 'prior': prior_7_count},
    })

recommendations.sort(key=lambda r: {'high': 0, 'medium': 1, 'info': 2}.get(r['priority'], 3))

# Build output
output = {
    'schemaVersion': '1.1.0',
    'generatedAt': now,
    'patterns': patterns,
    'stats': {
        'totalCorrections': len(events),
        'uniquePatterns': len(patterns),
        'readyToPromote': sum(1 for p in patterns if p.get('ready') and not p.get('promoted')),
        'alreadyPromoted': total_promoted,
    },
    'trends': trends_data,
    'recommendations': recommendations,
}

with open(output_file, 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
    f.write('\n')

# --- Per-Agent Learning Aggregation (using pre-accumulated agent_groups) ---

# Pre-sort each agent's events once
sorted_agent_groups = {}
for aid, aevents in agent_groups.items():
    sorted_agent_groups[aid] = sorted(aevents, key=lambda e: e.get('timestamp', ''))

agents_data = {}
for agent_id in sorted(agent_groups.keys()):
    agent_events = agent_groups[agent_id]
    sorted_events = sorted_agent_groups[agent_id]
    total = len(agent_events)

    # Accumulate outcome counts and time-window stats in a single pass
    accepted = 0
    rejected = 0
    last_7 = 0
    last_30 = 0
    agent_pattern_groups = defaultdict(list)
    for e in agent_events:
        outcome = e.get('outcome', '')
        if outcome == 'accepted':
            accepted += 1
        elif outcome == 'rejected':
            rejected += 1
        ts = e.get('timestamp', '')
        if ts >= seven_days_ago_str:
            last_7 += 1
        if ts >= thirty_days_ago_str:
            last_30 += 1
        agent_pattern_groups[e.get('pattern', 'unknown')].append(e)

    neutral = total - accepted - rejected

    top_patterns = []
    preferences = []
    for pkey, pentries in sorted(agent_pattern_groups.items(), key=lambda x: -len(x[1])):
        last_entry = max(pentries, key=lambda e: e.get('timestamp', ''))
        top_patterns.append({
            'pattern': pkey,
            'count': len(pentries),
            'lastOutcome': last_entry.get('outcome', 'neutral'),
        })
        # Preference detection: pattern with accepted outcomes
        accepted_count = sum(1 for e in pentries if e.get('outcome') == 'accepted')
        rejected_count = sum(1 for e in pentries if e.get('outcome') == 'rejected')
        if accepted_count >= 1 or rejected_count >= 1:
            conf = 'low' if max(accepted_count, rejected_count) < 3 else ('medium' if max(accepted_count, rejected_count) < 5 else 'high')
            if conf != 'low':
                preferences.append({
                    'pattern': pkey,
                    'description': last_entry.get('description', ''),
                    'confidence': conf,
                    'occurrences': accepted_count + rejected_count,
                    'accepted': accepted_count,
                    'rejected': rejected_count,
                })

    last_seen = sorted_events[-1].get('timestamp', '') if sorted_events else ''

    agents_data[agent_id] = {
        'totalEvents': total,
        'accepted': accepted,
        'rejected': rejected,
        'neutral': neutral,
        'acceptanceRate': round(accepted / max(total, 1) * 100, 1),
        'topPatterns': top_patterns[:10],
        'preferences': preferences[:10],
        'recentActivity': {
            'lastSeen': last_seen,
            'last7Days': last_7,
            'last30Days': last_30,
        },
    }

# Project-wide preferences (using pre-accumulated all_pattern_agents)
project_prefs = []
for pkey, info in sorted(all_pattern_agents.items(), key=lambda x: -x[1]['total']):
    if len(info['agents']) >= 3 or info['total'] >= 5:
        conf = 'medium' if info['total'] < 5 else 'high'
        project_prefs.append({
            'pattern': pkey,
            'description': info['desc'],
            'confidence': conf,
            'agents': sorted(info['agents']),
            'occurrences': info['total'],
        })

# --- Agent Trend Analysis (using pre-accumulated time-window stats) ---
agent_recommendations = []

for aid, adata in agents_data.items():
    last7_total = adata['recentActivity']['last7Days']
    last30_total = adata['recentActivity']['last30Days']

    # Count accepted in time windows from pre-sorted events
    sorted_events = sorted_agent_groups[aid]
    last7_accepted = sum(1 for e in sorted_events if e.get('timestamp', '') >= seven_days_ago_str and e.get('outcome') == 'accepted')
    last30_accepted = sum(1 for e in sorted_events if e.get('timestamp', '') >= thirty_days_ago_str and e.get('outcome') == 'accepted')

    rate_7 = round(last7_accepted / max(last7_total, 1) * 100, 1) if last7_total else None
    rate_30 = round(last30_accepted / max(last30_total, 1) * 100, 1) if last30_total else None

    if rate_7 is not None and rate_30 is not None:
        delta = round(rate_7 - rate_30, 1)
        direction = 'up' if delta > 0 else ('down' if delta < 0 else 'stable')
        adata['trends'] = {
            'acceptanceRateLast7': rate_7,
            'acceptanceRateLast30': rate_30,
            'direction': direction,
            'delta': delta,
        }
        if delta >= 10:
            agent_recommendations.append({
                'type': 'agent-improving',
                'priority': 'info',
                'message': 'Agent \'%s\' acceptance rate improved from %s%% to %s%% this week' % (aid, rate_30, rate_7),
                'agentId': aid,
                'data': {'rateLast7': rate_7, 'rateLast30': rate_30},
            })
        elif delta <= -10:
            agent_recommendations.append({
                'type': 'agent-declining',
                'priority': 'medium',
                'message': 'Agent \'%s\' acceptance rate dropped from %s%% to %s%% - review recent corrections' % (aid, rate_30, rate_7),
                'agentId': aid,
                'data': {'rateLast7': rate_7, 'rateLast30': rate_30},
            })
    else:
        adata['trends'] = None

# Project-wide acceptance rate trends (using pre-accumulated counters)
project_trends = None
overall_rate_7 = round(all_last7_accepted / max(all_last7_total, 1) * 100, 1) if all_last7_total else None
overall_rate_30 = round(all_last30_accepted / max(all_last30_total, 1) * 100, 1) if all_last30_total else None

if overall_rate_7 is not None and overall_rate_30 is not None:
    overall_delta = round(overall_rate_7 - overall_rate_30, 1)
    project_trends = {
        'overallAcceptanceRateLast7': overall_rate_7,
        'overallAcceptanceRateLast30': overall_rate_30,
        'direction': 'up' if overall_delta > 0 else ('down' if overall_delta < 0 else 'stable'),
        'delta': overall_delta,
    }

agent_output = {
    'schemaVersion': '1.1.0',
    'generatedAt': now,
    'agents': agents_data,
    'projectPreferences': project_prefs[:20],
    'stats': {
        'totalAgentsTracked': len(agents_data),
        'totalEvents': sum(a['totalEvents'] for a in agents_data.values()),
        'overallAcceptanceRate': round(
            sum(a['accepted'] for a in agents_data.values()) /
            max(sum(a['totalEvents'] for a in agents_data.values()), 1) * 100, 1
        ),
    },
    'trends': project_trends,
    'recommendations': agent_recommendations,
}

with open(agent_file, 'w') as f:
    json.dump(agent_output, f, indent=2, ensure_ascii=False)
    f.write('\n')

# Print summary
print('Analyzed %d correction(s) across %d pattern(s).' % (len(events), len(patterns)))
if agents_data:
    print('Agent learning: %d agent(s) tracked.' % len(agents_data))
ready_unpromoted = sum(1 for p in patterns if p.get('ready') and not p.get('promoted'))
if ready_unpromoted > 0:
    print('%d pattern(s) ready for promotion. Run \`/patterns suggest\` to see details.' % ready_unpromoted)
" "$CORRECTIONS_FILE" "$OUTPUT_FILE" "$AGENT_FILE"
