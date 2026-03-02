---
name: patterns
description: Pattern detection and learning system. Analyze correction history, view suggested patterns, and promote corrections to directives or pattern files.
---

Pattern detection and learning system for the Atta framework.

## Subcommand Routing

| Input | Route |
|-------|-------|
| `/patterns log <description>` | Log Subcommand |
| `/patterns learn` | Learn Subcommand |
| `/patterns suggest` | Suggest Subcommand |
| `/patterns promote <key>` | Promote Subcommand |
| `/patterns agent [agent-id]` | Agent Subcommand |
| `/patterns dashboard` | Dashboard Subcommand |
| `/patterns status` | Status Subcommand |
| `/patterns` (no args) | Status Subcommand |

---

## Log Subcommand

Manually capture a correction or anti-pattern.

```
/patterns log "Use composables instead of mixins in Vue 3"
/patterns log --category anti-pattern "setTimeout without cleanup in components"
/patterns log --category command-sequence "Always run lint before review"
```

1. Parse description and optional `--category` (default: `correction`)
2. Generate normalized key: lowercase, hyphens, verb-first for preferences, noun-first for anti-patterns
3. Log and analyze:
```bash
bash .atta/scripts/pattern-log.sh {claudeDir} << 'PAYLOAD'
{"category":"<category>","pattern":"<key>","description":"<description>","context":{},"source":"manual","skill":"patterns"}
PAYLOAD
bash .atta/scripts/pattern-analyze.sh {claudeDir}
```
4. Read `{claudeDir}/.context/patterns-learned.json` and report count, threshold status, promotion readiness.

---

## Learn Subcommand

Full analysis of correction history and session patterns.

1. Read `{claudeDir}/.context/corrections.jsonl`
2. Run `bash .atta/scripts/pattern-analyze.sh {claudeDir}`
3. Read `{claudeDir}/.context/patterns-learned.json`
4. Analyze command sequences: read last 20 session files from `{claudeDir}/.sessions/`, extract `skill.name`, find recurring 2-3 skill sequences via sliding window
5. Output tables: Corrections (pattern/count/status/last seen), Anti-Patterns (pattern/count/status/domain), Command Sequences (sequence/occurrences), Summary (totals + promotion readiness)

---

## Suggest Subcommand

Show patterns that reached promotion threshold.

1. Read `{claudeDir}/.context/patterns-learned.json` (run analyze first if missing)
2. Filter: `ready == true` and `promoted == false`
3. For each, display: pattern key, count, date range, and two promotion options:
   - **Option A — Directive**: `DIR-YYYYMMDD-NNN` format with `source: pattern_detection`
   - **Option B — Pattern file**: Target file and section for the anti-pattern row
4. Action: `/patterns promote <pattern-key>`

If none ready: report total tracked count and suggest `/patterns learn`.

---

## Promote Subcommand

Interactive promotion of a pattern to a directive or pattern file.

```
/patterns promote use-nullish-coalescing
/patterns promote ts-any-type
```

1. Read `{claudeDir}/.context/patterns-learned.json`, find matching key (or list available)
2. Present options: (A) directive, (B) pattern file, (C) both, (D) dismiss
3. Execute:
   - **Directive**: Format `DIR-YYYYMMDD-NNN` with `source: pattern_detection`, append to `.claude/agents/memory/directives.md`
   - **Pattern file**: Read target file, find/create section, propose anti-pattern row, show diff
   - **Dismiss**: Skip
4. Record promotion to `{claudeDir}/.context/promoted-patterns.json` via inline Python (append to `promotions` array with pattern, timestamp, target)
5. Run `bash .atta/scripts/pattern-analyze.sh {claudeDir}`
6. Confirm: `Promoted <key> → [directive / pattern file / both].`

---

## Status Subcommand

Quick dashboard of pattern detection state.

1. Read `{claudeDir}/.context/patterns-learned.json` (run analyze if corrections exist but no aggregation; report "No corrections logged yet" if neither exists)
2. Display: total corrections, unique patterns, ready to promote, already promoted
3. If `{claudeDir}/.context/agent-learning.json` exists: append agents tracked count and overall acceptance rate
4. If `trends` key exists and non-null: append Quick Trends section with velocity (this week vs prior, direction) and recommendation count

---

## Agent Subcommand

Per-agent learning status and adaptation profile.

```
/patterns agent                    # Overview of all agents
/patterns agent code-reviewer      # Detail for specific agent
```

1. Read `{claudeDir}/.context/agent-learning.json` (run analyze first if missing)

**Overview mode** (no agent-id): Table of all agents (events/accepted/rejected/rate/top preference) + project-wide preferences table (preference/confidence/agents/occurrences).

**Detail mode** (agent-id provided): Performance metrics (total events, accepted, rejected, neutral, rate, activity recency) + learned preferences table (pattern/occurrences/confidence/accepted/rejected) + top patterns table. If agent not found, list available agent IDs.

---

## Dashboard Subcommand

Comprehensive learning dashboard with trends and recommendations.

1. Read `{claudeDir}/.context/patterns-learned.json` (run analyze if missing)
2. Read `{claudeDir}/.context/agent-learning.json`
3. Display sections:
   - **Overview**: Total corrections, unique patterns, ready/promoted counts, avg days to threshold
   - **Correction Velocity**: This week vs prior week, delta, direction interpretation (up=actively learning, down=stabilizing, stable=steady)
   - **Agent Trends**: Per-agent 7d/30d acceptance rates with trend arrows and deltas
   - **Aging Patterns**: Ready but not promoted, with days waiting
   - **Recommendations**: Sorted by priority

Direction arrows: `up` → ↑, `down` → ↓, `stable` → →

If `trends` key absent/null: "Not enough data for trend analysis yet. Continue using the system and trends will appear after 7+ days of activity."

---

## Error Handling & Recovery

### No Corrections Found

```markdown
No correction data found. Corrections are captured from:
1. Librarian — when you correct AI suggestions
2. Review — CRITICAL/HIGH findings (auto-logged)
3. Collaborate — consensus findings (auto-logged)
4. Manual — /patterns log "description"
```

### Pattern Not Found (promote)

```markdown
Pattern <key> not found. Available ready patterns: [list]. Use /patterns learn for all.
```

### Scripts Missing

```markdown
Pattern detection scripts not found. Run npx atta-dev init . to reinstall, or verify
.atta/scripts/pattern-log.sh and .atta/scripts/pattern-analyze.sh exist.
```
