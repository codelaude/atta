---
name: patterns
description: Pattern detection and learning system. Analyze correction history, view suggested patterns, and promote corrections to directives or pattern files.
---

Pattern detection and learning system for the Atta framework.

## Session Tracking Setup

Before starting execution, initialize session tracking.

**Step 1: Generate session identifiers**

Run these commands:
```bash
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
UUID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null)
UUID=$(echo "$UUID" | tr '[:upper:]' '[:lower:]')
ISO_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
START_TIME=$(date +%s)
```

> If `$UUID` is empty (neither `uuidgen` nor `python3` available), skip session tracking entirely — proceed with skill execution normally and omit the Finalize Session step.

**Step 2: Create session file**

File: `{claudeDir}/.sessions/session-$TIMESTAMP.json`

Set `args` to the subcommand the user passed (e.g., `"learn"`, `"suggest"`, `"promote use-nullish-coalescing"`).

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "$UUID",
  "timestamp": "$ISO_TIME",
  "startedBy": "user",
  "skill": {
    "name": "patterns",
    "args": "{subcommand-and-args}",
    "status": "in_progress"
  },
  "agents": [],
  "metadata": {
    "projectPath": "{current-working-directory}",
    "claudeDir": "{claudeDir}",
    "duration": null,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

Record the session filename (`session-$TIMESTAMP.json`) and the `START_TIME` value — you will need both at the end.

---

## Subcommand Routing

Parse the user's arguments to determine which subcommand to execute:

| Input | Route |
|-------|-------|
| `/patterns log <description>` | → Log Subcommand |
| `/patterns learn` | → Learn Subcommand |
| `/patterns suggest` | → Suggest Subcommand |
| `/patterns promote <key>` | → Promote Subcommand |
| `/patterns status` | → Status Subcommand |
| `/patterns` (no args) | → Status Subcommand |

---

## Log Subcommand

Manually capture a correction or anti-pattern.

### Usage
```
/patterns log "Use composables instead of mixins in Vue 3"
/patterns log --category anti-pattern "setTimeout without cleanup in components"
/patterns log --category command-sequence "Always run lint before review"
```

### Steps

1. Parse the description and optional `--category` flag (default: `correction`)
2. Generate a normalized pattern key:
   - Lowercase, hyphens instead of spaces
   - Verb-first for preferences: `use-composables-not-mixins`
   - Noun-first for anti-patterns: `settimeout-without-cleanup`
3. Run:
```bash
bash .claude/scripts/pattern-log.sh {claudeDir} '{"category":"<category>","pattern":"<key>","description":"<description>","context":{},"source":"manual","skill":"patterns","sessionId":"<session-uuid>"}'
```
4. Run analysis to update aggregation:
```bash
bash .claude/scripts/pattern-analyze.sh {claudeDir}
```
5. Read `{claudeDir}/.context/patterns-learned.json` and report:
```markdown
Logged: `<key>` (<category>)
This pattern has been seen **N** time(s). Threshold: **T**.
[If ready: **Ready for promotion.** Run `/patterns suggest` to see details.]
```

---

## Learn Subcommand

Full analysis of correction history and session patterns.

### Steps

1. Read `{claudeDir}/.context/corrections.jsonl` (if it exists)
2. Run analysis:
```bash
bash .claude/scripts/pattern-analyze.sh {claudeDir}
```
3. Read `{claudeDir}/.context/patterns-learned.json`
4. Also analyze command sequences: read the last 20 session files from `{claudeDir}/.sessions/`, extract `skill.name` fields, and find recurring 2-3 skill sequences using a sliding window
5. Generate output:

```markdown
## Pattern Analysis

### Corrections (threshold: 3+)
| Pattern | Count | Status | Last Seen |
|---------|-------|--------|-----------|
| <pattern-key> | N | READY / N more needed | YYYY-MM-DD |

### Anti-Patterns (threshold: 5+)
| Pattern | Count | Status | Domain |
|---------|-------|--------|--------|
| <pattern-key> | N | READY / N more needed | <domain> |

### Command Sequences
| Sequence | Occurrences |
|----------|-------------|
| skill1 → skill2 → skill3 | N |

### Summary
- **Total corrections**: N
- **Unique patterns**: N
- **Ready for promotion**: N
- **Already promoted**: N

[If any ready: Run `/patterns suggest` to see promotion proposals.]
```

---

## Suggest Subcommand

Show patterns that have reached their promotion threshold.

### Steps

1. Read `{claudeDir}/.context/patterns-learned.json`
   - If it does not exist, run `bash .claude/scripts/pattern-analyze.sh {claudeDir}` first
2. Filter to patterns where `ready == true` and `promoted == false`
3. For each ready pattern, display:

```markdown
## Suggested Pattern Promotions

### 1. <pattern-key> (N corrections)

**Description:** <most recent description>
**First seen:** YYYY-MM-DD | **Last seen:** YYYY-MM-DD

**Option A — Create directive:**
```yaml
DIR-YYYYMMDD-NNN:
  date: YYYY-MM-DD
  rule: "<suggested rule>"
  applies_to: [<domains>]
  source: pattern_detection
```

**Option B — Update pattern file:**
Target: `<targetFile>`
Section: `<targetSection>`
```
| <anti-pattern> | <fix> | <severity> |
```

**Action:** Run `/patterns promote <pattern-key>` to apply.
```

If no patterns are ready:
```markdown
No patterns ready for promotion yet.
- Total tracked: N pattern(s)
- Run `/patterns learn` for full analysis.
```

---

## Promote Subcommand

Interactive promotion of a pattern to a directive or pattern file.

### Usage
```
/patterns promote use-nullish-coalescing
/patterns promote ts-any-type
```

### Steps

1. Read `{claudeDir}/.context/patterns-learned.json`
2. Find the pattern matching the provided key
   - If not found, list available ready patterns and exit
3. Present options to the user:
   - **Option A**: Create a directive (via librarian flow)
   - **Option B**: Update a pattern file (edit target file directly)
   - **Option C**: Both
   - **Option D**: Dismiss (mark as not promotable)
4. Based on user choice:

**If directive (A or C):**
- Format a new directive following `DIR-YYYYMMDD-NNN` convention
- Add `source: pattern_detection` to distinguish from manual directives
- Present for approval, then append to `.claude/agents/memory/directives.md`

**If pattern file (B or C):**
- Read the target pattern file (from `suggestedDirective.targetFile`)
- Find or create the target section (from `suggestedDirective.targetSection`)
- Propose adding the anti-pattern row to the table
- Show the diff and request approval

**If dismiss (D):**
- Skip promotion for this pattern

5. After approval, mark as promoted:
```bash
# Update all matching entries in corrections.jsonl
# (Read file, set promoted=true for matching pattern, rewrite)
```
6. Rebuild aggregation:
```bash
bash .claude/scripts/pattern-analyze.sh {claudeDir}
```
7. Confirm:
```markdown
Promoted `<pattern-key>` → [directive / pattern file / both].
```

---

## Status Subcommand

Quick dashboard of pattern detection state.

### Steps

1. Read `{claudeDir}/.context/patterns-learned.json` (if it exists)
2. If the file does not exist, check if `{claudeDir}/.context/corrections.jsonl` exists:
   - If corrections exist but no aggregation: run `bash .claude/scripts/pattern-analyze.sh {claudeDir}`
   - If neither exists: report "No corrections logged yet"
3. Display:

```markdown
## Pattern Detection Status

| Metric | Value |
|--------|-------|
| Total corrections logged | N |
| Unique patterns | N |
| Ready to promote | N |
| Already promoted | N |

[If ready > 0:]
Run `/patterns suggest` to see promotion proposals.

[If total == 0:]
No corrections logged yet. Corrections are captured automatically by:
- The librarian agent (when you correct AI suggestions)
- The review skill (CRITICAL/HIGH findings)
- The collaborate skill (consensus findings)
- Or manually with `/patterns log "description"`
```

---

## Finalize Session

After execution completes (whether successful, failed, or interrupted), finalize the session file.

**Step 1: Calculate duration**

Run: `date +%s` to get the current Unix timestamp.

Compute: `(current_unix_timestamp - START_TIME) * 1000` = duration in milliseconds.

**Step 2: Update session file**

Edit `{claudeDir}/.sessions/session-$TIMESTAMP.json`:
- Change `skill.status` from `"in_progress"` to `"completed"` (or `"failed"` / `"interrupted"`)
- Set `metadata.duration` to elapsed milliseconds

**Step 3: Run cleanup and context generation**

```bash
.claude/scripts/session-cleanup.sh {claudeDir}
```

```bash
.claude/scripts/generate-context.sh {claudeDir}
```

---

## Error Handling & Recovery

> **Session note:** If a session file was created, always finalize it (Finalize Session above) before displaying recovery messages — set status to `"failed"` or `"interrupted"`.

### No Corrections Found

```markdown
No correction data found.

Corrections are captured from:
1. **Librarian** — when you correct AI suggestions ("no, use X instead")
2. **Review** — CRITICAL/HIGH findings logged automatically
3. **Collaborate** — consensus findings logged automatically
4. **Manual** — `/patterns log "description"`

Start by making corrections during your workflow, or log one manually:
`/patterns log "Always prefer ?? over || for null checks"`
```

### Pattern Not Found (for /patterns promote)

```markdown
Pattern `<key>` not found.

Available patterns ready for promotion:
[list from patterns-learned.json where ready==true]

Use `/patterns learn` to see all tracked patterns.
```

### Scripts Missing

```markdown
Pattern detection scripts not found. This may indicate an incomplete installation.

Recovery:
1. Run `npx atta-dev init .` to reinstall framework files
2. Or manually verify `.claude/scripts/pattern-log.sh` and `.claude/scripts/pattern-analyze.sh` exist
```
