---
name: atta-patterns
description: Pattern detection and learning system. Analyze correction history, view suggested patterns, and promote corrections to directives or pattern files.
disable-model-invocation: true
model: haiku
argument-hint: "<subcommand> [--directives]"
---

Pattern detection and learning system for the Atta framework.

## Subcommand Routing

| Input | Route |
|-------|-------|
| `/atta-patterns log <description>` | Log Subcommand |
| `/atta-patterns learn` | Learn Subcommand |
| `/atta-patterns suggest` | Suggest Subcommand |
| `/atta-patterns promote <key>` | Promote Subcommand |
| `/atta-patterns agent [agent-id]` | Agent Subcommand |
| `/atta-patterns dashboard` | Dashboard Subcommand |
| `/atta-patterns status` | Status Subcommand |
| `/atta-patterns` (no args) | Status Subcommand |

---

## Log Subcommand

Manually capture a correction or anti-pattern.

```
/atta-patterns log "Use composables instead of mixins in Vue 3"
/atta-patterns log --category anti-pattern "setTimeout without cleanup in components"
/atta-patterns log --category command-sequence "Always run lint before review"
```

1. Parse description and optional `--category` (default: `correction`)
2. Generate normalized key: lowercase, hyphens, verb-first for preferences, noun-first for anti-patterns
3. Log and analyze:
```bash
bash .atta/scripts/pattern-log.sh {attaDir} << 'PAYLOAD'
{"category":"<category>","pattern":"<key>","description":"<description>","context":{},"source":"manual","skill":"patterns"}
PAYLOAD
bash .atta/scripts/pattern-analyze.sh {attaDir}
```
4. Read `{attaDir}/local/context/patterns-learned.json` and report count, threshold status, promotion readiness.

---

## Learn Subcommand

Full analysis of correction history and session patterns.

1. Read `{attaDir}/local/context/corrections.jsonl`
2. Run `bash .atta/scripts/pattern-analyze.sh {attaDir}`
3. Read `{attaDir}/local/context/patterns-learned.json`
4. Analyze command sequences: read last 20 session files from `{claudeDir}/.sessions/`, extract `skill.name`, find recurring 2-3 skill sequences via sliding window
5. Output tables: Corrections (pattern/count/status/last seen), Anti-Patterns (pattern/count/status/domain), Command Sequences (sequence/occurrences), Summary (totals + promotion readiness)

---

## Suggest Subcommand

Show patterns that reached promotion threshold.

1. Read `{attaDir}/local/context/patterns-learned.json` (run analyze first if missing)
2. Filter: `ready == true` and `promoted == false`
3. For each, display: pattern key, count, date range, and two promotion options:
   - **Option A — Directive**: `DIR-YYYYMMDD-NNN` format with `source: pattern_detection`
   - **Option B — Pattern file**: Target file and section for the anti-pattern row
4. Action: `/atta-patterns promote <pattern-key>`

If none ready: report total tracked count and suggest `/atta-patterns learn`.

---

## Promote Subcommand

Interactive promotion of a pattern to a directive or pattern file, or promotion of scoped directives into agent definitions.

```
/atta-patterns promote use-nullish-coalescing    # Promote a pattern to directive/pattern file
/atta-patterns promote ts-any-type
/atta-patterns promote --directives              # Check scoped directive files for promotion to agent definitions
```

### Pattern Promotion (default)

1. Read `{attaDir}/local/context/patterns-learned.json`, find matching key (or list available)
2. Present options: (A) directive, (B) pattern file, (C) both, (D) dismiss
3. Execute:
   - **Directive**: Format `DIR-YYYYMMDD-NNN` with `source: pattern_detection`, append to the appropriate file in `.claude/agents/memory/`:
     1. **Agent-scoped** → `.claude/agents/memory/directives-<agent-id>.md` (e.g., `directives-code-reviewer.md`) — use when the pattern explicitly references a single agent's behavior, APIs, or responsibilities
     2. **Category/domain** → `.claude/agents/memory/directives-<category>.md` (e.g., `directives-testing.md`, `directives-style.md`) — use when the pattern addresses a functional area or domain used by multiple agents (e.g., testing, style, security)
     3. **Cross-cutting** → `.claude/agents/memory/directives.md` — use when the pattern applies globally to all agents
   - **Pattern file**: Read target file, find/create section, propose anti-pattern row, show diff
   - **Dismiss**: Skip
4. Record promotion to `{attaDir}/local/context/promoted-patterns.json` via inline Python (append to `promotions` array with pattern, timestamp, target)
5. Run `bash .atta/scripts/pattern-analyze.sh {attaDir}`
6. Confirm: `Promoted <key> → [directive / pattern file / both].`

### Directive-to-Agent Promotion (`--directives`)

When **agent-scoped** directive files accumulate 8+ directives, promote them into the matching agent's `.md` definition under a `## Project Rules` section.

1. Scan `.claude/agents/memory/directives-*.md` files
2. Classify each file:
   - **Agent-scoped**: filename matches `directives-<agent-id>.md` where `.claude/agents/<agent-id>.md` exists. These are eligible for promotion.
   - **Category/shared**: any other `directives-*.md` file (e.g., `directives-testing.md`, `directives-style.md`). These are **never auto-promoted** — they remain shared across multiple skills. Promotion from these files must be handled manually per agent if desired.
3. For each **agent-scoped** file, count directives (identified by `DIR-YYYYMMDD-NNN:` YAML block keys — the trailing colon is YAML syntax, the identifier itself is `DIR-YYYYMMDD-NNN`). For files with 8+ directives, propose promotion:
   ```
   directives-code-reviewer.md has 12 directives → promote to code-reviewer.md ## Project Rules?
   directives-testing.md → category-scoped, not eligible for auto-promotion
   ```
4. For each eligible file above threshold, present the merge proposal:
   - Show the directives that would move
   - Show the target agent `.md` file (derived as `directives-<agent-id>.md` → `.claude/agents/<agent-id>.md`) and where `## Project Rules` would be inserted (after the last existing section, before any `---` footer)
5. On approval:
   - Read the target agent `.md` file
   - Append `## Project Rules` section containing the directives (preserve DIR format)
   - **Keep the scoped file intact** — do NOT remove promoted directives from it. Scoped files are shared across multiple skills (e.g., `directives-code-reviewer.md` is loaded by `/atta-review`, `/atta-collaborate`, `/atta-preflight`). Removing directives would break other consumers.
6. Report: `Promoted {N} directives from {file} → {agent}.md ## Project Rules (scoped file preserved)`

**Threshold**: 8 directives (consistent with pattern system thresholds)

---

## Status Subcommand

Quick dashboard of pattern detection state.

1. Read `{attaDir}/local/context/patterns-learned.json` (run analyze if corrections exist but no aggregation; report "No corrections logged yet" if neither exists)
2. Display: total corrections, unique patterns, ready to promote, already promoted
3. If `{attaDir}/local/context/agent-learning.json` exists: append agents tracked count and overall acceptance rate
4. If `trends` key exists and non-null: append Quick Trends section with velocity (this week vs prior, direction) and recommendation count

---

## Agent Subcommand

Per-agent learning status and adaptation profile.

```
/atta-patterns agent                    # Overview of all agents
/atta-patterns agent code-reviewer      # Detail for specific agent
```

1. Read `{attaDir}/local/context/agent-learning.json` (run analyze first if missing)

**Overview mode** (no agent-id): Table of all agents (events/accepted/rejected/rate/top preference) + project-wide preferences table (preference/confidence/agents/occurrences).

**Detail mode** (agent-id provided): Performance metrics (total events, accepted, rejected, neutral, rate, activity recency) + learned preferences table (pattern/occurrences/confidence/accepted/rejected) + top patterns table. If agent not found, list available agent IDs.

---

## Dashboard Subcommand

Comprehensive learning dashboard with trends and recommendations.

1. Read `{attaDir}/local/context/patterns-learned.json` (run analyze if missing)
2. Read `{attaDir}/local/context/agent-learning.json`
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
4. Manual — /atta-patterns log "description"
```

### Pattern Not Found (promote)

```markdown
Pattern <key> not found. Available ready patterns: [list]. Use /atta-patterns learn for all.
```

### Scripts Missing

```markdown
Pattern detection scripts not found. Run npx atta-dev init . to reinstall, or verify
.atta/scripts/pattern-log.sh and .atta/scripts/pattern-analyze.sh exist.
```
