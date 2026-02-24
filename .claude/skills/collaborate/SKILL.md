---
name: collaborate
description: Multi-agent collaboration for cross-domain code review, architecture feedback, and design decisions. Invokes 2-4 specialist agents in parallel and synthesizes their findings with automated conflict detection.
---

You are orchestrating a **multi-agent collaboration** session.

## How to Use

```
/collaborate                                          # Review mode on git diff (auto-selects agents)
/collaborate src/components/UserProfile.tsx           # Review specific file
/collaborate src/components/                          # Review folder
/collaborate --agents security-specialist,accessibility # Explicit agent selection
/collaborate --quick                                  # Critical + High findings only
/collaborate --mode feedback                          # Architecture feedback (no file-level findings)
/collaborate --mode decision "REST vs GraphQL?"       # Decision analysis with agent perspectives
/collaborate --skip-synthesis                         # Raw agent outputs without conflict detection
```

---

## Step 1: Parse Command and Determine Mode

**Flags:**

| Flag | Effect |
|------|--------|
| `--quick` | Only CRITICAL and HIGH findings |
| `--agents agent1,agent2,...` | Explicit agent list (skip auto-routing) |
| `--skip-synthesis` | Raw agent outputs, no conflict detection |
| `--mode review` | Code review (default) — file-level findings with severity |
| `--mode feedback` | Architecture feedback — perspective-level, no file:line |
| `--mode decision` | Decision analysis — agents rate options from their domain |

For `--mode decision`, the remaining non-flag argument is the question (not a file path).

---

## Step 2: Determine Review Scope

**Review mode (default):** If no file/folder argument:
```bash
# Detect base branch: main, master, or develop
if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/main...HEAD)
elif git rev-parse --verify --quiet origin/master >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/master...HEAD)
elif git rev-parse --verify --quiet origin/develop >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/develop...HEAD)
else
  FILES=$(git diff --name-only)
fi
```
If `$FILES` is empty → "Empty Review Scope" recovery (see Error Handling). If file/folder given, use Glob to expand.

**Feedback/decision mode:** Files optional — use git diff scope or just a description.

Read all files in scope via the Read tool. Don't ask the user.

---

## Step 3: Auto-Route to Agents

**If `--agents` provided:** Validate each agent exists by checking these paths in order:
1. `.claude/agents/specialists/{agent-id}.md`
2. `.claude/agents/coordinators/{agent-id}.md`
3. `.claude/agents/{agent-id}.md` (core agents)

Show available agents if not found.

**If `--agents` NOT provided:** Read `.claude/agents/INDEX.md` for available agents. Auto-detect from file extensions:

| File Pattern | Primary Agent | Secondary |
|-------------|---------------|-----------|
| `*.vue` | Framework (vue) | accessibility, styling |
| `*.tsx`, `*.jsx` | Framework (react) | accessibility, styling |
| `*.ts`, `*.js` | Language (typescript) | — |
| `*.scss`, `*.css`, `*.less` | Styling | accessibility |
| `*.test.*`, `*.spec.*` | Testing | Language |
| `*.py` | Language (python) | Framework (django/flask) |
| `*.java` | Language (java) | Framework (spring) |
| `*.go`, `*.rs` | Language | — |
| `*.sql`, `*.prisma` | Database | security-specialist |
| `*.yaml`, `*.json`, `*.toml` | security-specialist | — |
| `*.html` | accessibility | Framework |

**Cross-cutting rules:**
- **Always include `security-specialist`** when scope has: auth/login/password/token/session/api/middleware/config paths, or `eval(`/`exec(`/`innerHTML`/`v-html`/`dangerouslySetInnerHTML`, or config files
- **Always include `accessibility`** when scope has: UI components (`.vue`/`.tsx`/`.jsx`/`.html`/`.svelte`) or `aria-`/`role=`/`tabIndex`/`focus`/`<dialog`/`<nav`/`<form`

**Constraints:** Min 2, max 4 agents. If only 1 matches, add `code-reviewer`. Priority order: security > accessibility > framework > language > styling > testing > database > code-reviewer.

**If no `/atta` specialists exist:** Fall back to `code-reviewer` + `qa-validator`. Note: `project-owner` is unsuitable (cannot read code). Show notice to run `/atta`.

---

## Step 4: Invoke Agents (Parallel)

For each agent, spawn a Task tool subagent (`run_in_background: true`):

1. Read the agent definition file
2. Read relevant pattern files from `.claude/knowledge/patterns/`
3. Read `.claude/knowledge/templates/collaboration-finding.md` for the finding schema
4. Read `{claudeDir}/.context/agent-learning.json` — extract this agent's learning profile if available
5. Construct prompt and spawn

### Subagent Prompt Template

```
You are acting as the {AGENT_NAME} in a multi-agent collaboration session.

## Your Agent Definition
{AGENT_DEFINITION_CONTENTS}

## Pattern Knowledge
{RELEVANT_PATTERN_FILES}

## Your Learning Profile
{IF learning data exists: "Based on {totalEvents} tracked interactions (acceptance rate: {acceptanceRate}%):
- User prefers: {accepted patterns}
- User corrected: {rejected patterns} — avoid these"
OTHERWISE: "No learning data yet."}

## Collaboration Protocol
You are one of {N} agents reviewing the same code. Format output per the finding schema below.

{COLLABORATION_FINDING_SCHEMA}

### Rules
1. Stay in YOUR domain only. Cross-domain observations go in Summary only.
2. Set conflicts_with when your recommendation may contradict another agent.
3. One sentence per finding. One sentence per recommendation.
4. Use severity levels accurately — do not inflate.

## Files to Review
{FILE_CONTENTS}

Begin your assessment now. Follow the Agent Output Envelope format exactly.
```

**Mode adaptations:**
- **Feedback mode:** Replace `file:line` → `aspect`, severity → priority (HIGH/MEDIUM/LOW), request perspective-level analysis
- **Decision mode:** Include decision question prominently, agents rate each option from their domain

**Failure handling:** Log failures, continue with remaining agents. Min 1 successful agent required.

---

## Step 5: Collect and Detect Conflicts

If `--skip-synthesis`: skip conflict detection. Show each agent's full output sequentially under `### {Agent Name} (raw)` headers, then jump to Step 6 for Action Items and Verdict only (no Consensus/Conflicts sections).

### 5a. Parse each agent's findings table, summary counts, and verdict.

### 5b. Three-Layer Conflict Detection

| Layer | Method | Result |
|-------|--------|--------|
| 1. Self-reported | Check `conflicts_with` field → match against other agents at same file/aspect | Conflict record |
| 2. Location-based | Group findings by `file:line` or `aspect`. 2+ agents, different recommendations → conflict. Same recommendations → consensus | Conflicts + consensus |
| 3. Severity disagreement | Same group, severity differs by 2+ levels → flag | Disagreement |

For feedback/decision modes: substitute `file:line` → `aspect`, `severity` → `priority`.

### 5c. Consensus items: findings from 2+ agents at same location with compatible recommendations.

### 5d. Dedup: keep higher severity, combine recommendations, note all reporting agents.

---

## Step 6: Synthesize Output

Output a **Collaboration Report** with these sections:

1. **Session Summary** — mode, agents, files reviewed, total findings, consensus count, conflicts count
2. **Consensus Findings** (if any) — table: Severity, File, Finding, Recommendation, Reported By
3. **Specialist Findings** — per-agent tables (unique findings not in consensus)
4. **Conflicts Detected** (if any) — per conflict: both agents' recommendations + reasoning, affected file, resolution options, suggested resolution
5. **Action Items** — prioritized table: #, Action, Severity, Domains, Source
6. **Verdict** — APPROVED / CHANGES REQUESTED / NEEDS DISCUSSION with rationale
7. **Next Steps** — follow-up suggestions (`/review`, `/agent {id}`, `/preflight`)

If `--quick`: filter out MEDIUM/LOW/INFO findings from all sections.

**Feedback mode:** Replace findings tables with per-agent Perspective sections (priority, aspect, assessment, recommendations), then Synthesis (agreement, divergence, tradeoffs).

**Decision mode:** Analysis Matrix table (agent × option assessments), Recommendation with consensus/dissent, Tradeoff Summary.

---

## Step 7: Log Consensus Anti-Patterns (Silent)

For each CRITICAL/HIGH consensus finding, log via `pattern-log.sh`:
```bash
bash .claude/scripts/pattern-log.sh {claudeDir} << 'PAYLOAD'
{"category":"anti-pattern","pattern":"<slug>","description":"<desc>","context":{"file":"<file:line>","domain":"<domain>","agent":"<agent>"},"source":"skill-annotation","skill":"collaborate","agentId":"<agent>"}
PAYLOAD
```

Then run: `bash .claude/scripts/pattern-analyze.sh {claudeDir}`

---

## Error Handling

For each error, show a brief message and 2-3 recovery options:

| Error | Key Recovery |
|-------|-------------|
| Empty review scope | Pass target explicitly, stage files, or use `--mode feedback` |
| Agent not found | Check spelling, run `/atta`, or drop `--agents` flag |
| No agents available | Run `/atta`, use `/review`, or specify `--agents code-reviewer,qa-validator` |
| Single agent only | Add second agent explicitly, broaden scope, or use `/agent` instead |
| Agent failure | Continue with remaining agents, retry failed agent, or use `/agent` standalone |
| All agents failed | Retry, reduce agent count, or fall back to `/review` |
| Unparseable output | Include raw output as-is, note parsing issue |
| Too many files (>20) | Narrow scope, use `--quick`, or batch by folder |

---

## Related Skills

- `/review` — Single-agent code review
- `/security-audit` — Deep security scan (OWASP Top 10)
- `/preflight` — Full pre-PR validation
- `/agent {id}` — Single specialist analysis
- `/team-lead` — Task decomposition
- `/atta` — Generate specialist agents

---

_Multi-agent collaboration with conflict detection_
