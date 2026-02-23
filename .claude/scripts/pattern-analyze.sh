#!/usr/bin/env bash

# Pattern Analysis Script
# Reads corrections.jsonl and rebuilds patterns-learned.json
# Usage:
#   .claude/scripts/pattern-analyze.sh                    # Auto-detect from settings
#   .claude/scripts/pattern-analyze.sh /path/to/claudeDir  # Explicit claudeDir

set -euo pipefail

# Determine Claude directory (allow override via argument)
CLAUDE_DIR="${1:-}"

if [ -z "$CLAUDE_DIR" ]; then
  # Auto-detect from settings.json or settings.local.json
  extract_claude_dir() {
    local file="$1"
    if command -v python3 >/dev/null 2>&1; then
      python3 -c "
import json,sys
try:
    d=json.load(open(sys.argv[1]))
    print(d.get('claudeDir','.claude'))
except (FileNotFoundError, json.JSONDecodeError):
    print('.claude')
" "$file" 2>/dev/null
    else
      grep -o '"claudeDir" *: *"[^"]*"' "$file" 2>/dev/null | sed 's/.*: *"//;s/"//' || echo ".claude"
    fi
  }

  if [ -f ".claude/settings.local.json" ]; then
    CLAUDE_DIR=$(extract_claude_dir ".claude/settings.local.json")
  elif [ -f ".claude/settings.json" ]; then
    CLAUDE_DIR=$(extract_claude_dir ".claude/settings.json")
  else
    CLAUDE_DIR=".claude"
  fi
fi

# Path containment: ensure CLAUDE_DIR physically resolves inside the project root
# Uses pwd -P to resolve symlinks — prevents symlink-to-outside-root bypass
PROJECT_ROOT="$(pwd -P)"
if [ -d "$CLAUDE_DIR" ]; then
  CLAUDE_DIR_REAL=$(cd "$CLAUDE_DIR" && pwd -P)
else
  # Directory doesn't exist yet — resolve parent + basename (reject if parent is outside root)
  CLAUDE_DIR_PARENT=$(cd "$(dirname "$CLAUDE_DIR")" 2>/dev/null && pwd -P) || { echo "Error: claudeDir parent does not exist" >&2; exit 1; }
  CLAUDE_DIR_REAL="$CLAUDE_DIR_PARENT/$(basename "$CLAUDE_DIR")"
fi
case "$CLAUDE_DIR_REAL" in "$PROJECT_ROOT"/*) ;; *) echo "Error: claudeDir escapes project root" >&2; exit 1 ;; esac

CONTEXT_DIR="$CLAUDE_DIR/.context"
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
python3 -c "
import json, sys, os
from datetime import datetime, timezone
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

# Read all correction events
events = []
with open(corrections_file, 'r') as f:
    for line_num, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            print('Warning: Skipping malformed line %d in corrections.jsonl' % line_num, file=sys.stderr)

if not events:
    # Write empty-but-valid files to clear any stale data
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    empty_patterns = {'schemaVersion': '1.1.0', 'generatedAt': now, 'patterns': [], 'stats': {'totalCorrections': 0, 'uniquePatterns': 0, 'readyToPromote': 0, 'alreadyPromoted': 0}, 'trends': None, 'recommendations': []}
    empty_agents = {'schemaVersion': '1.1.0', 'generatedAt': now, 'agents': {}, 'projectPreferences': [], 'stats': {'totalAgentsTracked': 0, 'totalEvents': 0, 'overallAcceptanceRate': 0}, 'trends': None, 'recommendations': []}
    for fpath, data in [(output_file, empty_patterns), (agent_file, empty_agents)]:
        with open(fpath, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
    print('No correction events found. Cleared stale data.')
    sys.exit(0)

# Group by pattern key
groups = defaultdict(list)
for ev in events:
    groups[ev.get('pattern', 'unknown')].append(ev)

# Build pattern summaries
patterns = []
total_promoted = 0
total_ready = 0

for pattern_key, entries in sorted(groups.items()):
    # Use the most common category for this pattern
    categories = [e.get('category', 'correction') for e in entries]
    primary_category = max(set(categories), key=categories.count)
    threshold = THRESHOLDS.get(primary_category, 3)

    count = len(entries)
    ready = count >= threshold
    promoted = all(e.get('promoted', False) for e in entries)

    if ready:
        total_ready += 1
    if promoted:
        total_promoted += 1

    # Extract most recent description
    sorted_entries = sorted(entries, key=lambda e: e.get('timestamp', ''))
    description = sorted_entries[-1].get('description', '')
    first_seen = sorted_entries[0].get('timestamp', '')
    last_seen = sorted_entries[-1].get('timestamp', '')

    # Build suggested directive from context
    contexts = [e.get('context', {}) for e in entries]
    domains = [c.get('domain', '') for c in contexts if c.get('domain')]
    primary_domain = max(set(domains), key=domains.count) if domains else 'general'

    # Map domain to likely pattern file
    domain_to_file = {
        'language': '.claude/knowledge/patterns/%s-patterns.md' % primary_domain,
        'framework': '.claude/knowledge/patterns/framework-patterns.md',
        'styling': '.claude/knowledge/patterns/styling-patterns.md',
        'security': '.claude/knowledge/patterns/security-patterns.md',
        'testing': '.claude/knowledge/patterns/testing-patterns.md',
        'accessibility': '.claude/knowledge/patterns/accessibility-patterns.md',
    }
    target_file = domain_to_file.get(primary_domain, '.claude/knowledge/patterns/%s-patterns.md' % primary_domain)

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

# --- Trend Analysis ---
from datetime import timedelta

now_dt = datetime.now(timezone.utc)
now = now_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
seven_days_ago_str = (now_dt - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
fourteen_days_ago_str = (now_dt - timedelta(days=14)).strftime('%Y-%m-%dT%H:%M:%SZ')

# Pattern velocity: events in last 7 vs prior 7
last_7_count = sum(1 for e in events if e.get('timestamp', '') >= seven_days_ago_str)
prior_7_count = sum(1 for e in events if fourteen_days_ago_str <= e.get('timestamp', '') < seven_days_ago_str)
velocity_direction = 'up' if last_7_count > prior_7_count else ('down' if last_7_count < prior_7_count else 'stable')

# Avg time-to-ready: days from firstSeen to threshold for ready patterns
ready_times = []
for p in patterns:
    if p['ready'] and p['firstSeen'] and p['lastSeen']:
        try:
            first = datetime.strptime(p['firstSeen'][:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc)
            # Approximate ready time: when the threshold-th event arrived
            group_events_sorted = sorted(groups[p['pattern']], key=lambda e: e.get('timestamp', ''))
            threshold_idx = min(p['threshold'], len(group_events_sorted)) - 1
            ready_ts = group_events_sorted[threshold_idx].get('timestamp', p['lastSeen'])
            ready = datetime.strptime(ready_ts[:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc)
            ready_times.append((ready - first).total_seconds() / 86400)
        except (ValueError, IndexError):
            pass
avg_time_to_ready = round(sum(ready_times) / len(ready_times), 1) if ready_times else None

# Aging patterns: ready + not promoted + waiting 7+ days
aging = []
for p in patterns:
    if p['ready'] and not p['promoted']:
        try:
            group_events_sorted = sorted(groups[p['pattern']], key=lambda e: e.get('timestamp', ''))
            threshold_idx = min(p['threshold'], len(group_events_sorted)) - 1
            ready_since = group_events_sorted[threshold_idx].get('timestamp', p['firstSeen'])
            ready_dt = datetime.strptime(ready_since[:19], '%Y-%m-%dT%H:%M:%S').replace(tzinfo=timezone.utc)
            days_since_ready = round((now_dt - ready_dt).total_seconds() / 86400, 1)
            if days_since_ready >= 7:
                aging.append({
                    'pattern': p['pattern'],
                    'readySince': ready_since,
                    'daysSinceReady': days_since_ready,
                })
        except (ValueError, IndexError):
            pass

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

# --- Per-Agent Learning Aggregation ---

# Group by effective agent ID (agentId field, fallback to context.agent)
agent_groups = defaultdict(list)
for ev in events:
    agent_id = ev.get('agentId') or ev.get('context', {}).get('agent', '')
    if agent_id:
        agent_groups[agent_id].append(ev)

# Time window helpers (reuse now_dt, seven_days_ago_str from trend analysis)
thirty_days_ago = (now_dt - timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%SZ')
seven_days_ago = seven_days_ago_str

agents_data = {}
for agent_id, agent_events in sorted(agent_groups.items()):
    accepted = sum(1 for e in agent_events if e.get('outcome') == 'accepted')
    rejected = sum(1 for e in agent_events if e.get('outcome') == 'rejected')
    neutral = len(agent_events) - accepted - rejected
    total = len(agent_events)

    # Group this agent's events by pattern
    agent_pattern_groups = defaultdict(list)
    for e in agent_events:
        agent_pattern_groups[e.get('pattern', 'unknown')].append(e)

    top_patterns = []
    preferences = []
    for pkey, pentries in sorted(agent_pattern_groups.items(), key=lambda x: -len(x[1])):
        last_entry = sorted(pentries, key=lambda e: e.get('timestamp', ''))[-1]
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

    sorted_events = sorted(agent_events, key=lambda e: e.get('timestamp', ''))
    last_seen = sorted_events[-1].get('timestamp', '') if sorted_events else ''
    last_7 = sum(1 for e in agent_events if e.get('timestamp', '') >= seven_days_ago)
    last_30 = sum(1 for e in agent_events if e.get('timestamp', '') >= thirty_days_ago)

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

# Project-wide preferences: patterns across 3+ agents or 5+ total occurrences
project_prefs = []
all_pattern_agents = defaultdict(lambda: {'agents': set(), 'total': 0, 'desc': ''})
for agent_id, agent_events in agent_groups.items():
    for e in agent_events:
        pkey = e.get('pattern', 'unknown')
        all_pattern_agents[pkey]['agents'].add(agent_id)
        all_pattern_agents[pkey]['total'] += 1
        all_pattern_agents[pkey]['desc'] = e.get('description', '')
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

# --- Agent Trend Analysis ---
agent_recommendations = []

for aid, adata in agents_data.items():
    a_events = agent_groups[aid]
    last7_events = [e for e in a_events if e.get('timestamp', '') >= seven_days_ago]
    last30_events = [e for e in a_events if e.get('timestamp', '') >= thirty_days_ago]

    rate_7 = round(sum(1 for e in last7_events if e.get('outcome') == 'accepted') / max(len(last7_events), 1) * 100, 1) if last7_events else None
    rate_30 = round(sum(1 for e in last30_events if e.get('outcome') == 'accepted') / max(len(last30_events), 1) * 100, 1) if last30_events else None

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

# Project-wide acceptance rate trends
all_last7 = [e for e in events if e.get('timestamp', '') >= seven_days_ago]
all_last30 = [e for e in events if e.get('timestamp', '') >= thirty_days_ago]
overall_rate_7 = round(sum(1 for e in all_last7 if e.get('outcome') == 'accepted') / max(len(all_last7), 1) * 100, 1) if all_last7 else None
overall_rate_30 = round(sum(1 for e in all_last30 if e.get('outcome') == 'accepted') / max(len(all_last30), 1) * 100, 1) if all_last30 else None

project_trends = None
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
    print('%d pattern(s) ready for promotion. Run `/patterns suggest` to see details.' % ready_unpromoted)
" "$CORRECTIONS_FILE" "$OUTPUT_FILE" "$AGENT_FILE"
