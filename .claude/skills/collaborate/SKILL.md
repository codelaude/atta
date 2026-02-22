---
name: collaborate
description: Multi-agent collaboration for cross-domain code review, architecture feedback, and design decisions. Invokes 2-4 specialist agents in parallel and synthesizes their findings with automated conflict detection.
---

You are now orchestrating a **multi-agent collaboration** session. You will invoke multiple specialist agents, collect their findings in a normalized format, detect conflicts between their recommendations, and present a synthesized report.

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

**Before parsing:** Initialize session tracking by running the commands in Step 7a now. The session file must exist before proceeding so that all subsequent steps can update it.

Then, separate flags from file/folder arguments.

**Flags:**

| Flag | Effect |
|------|--------|
| `--quick` | Only CRITICAL and HIGH findings; skip MEDIUM, LOW, INFO |
| `--agents agent1,agent2,...` | Explicit agent list (skip auto-routing in Step 3) |
| `--skip-synthesis` | Show raw agent outputs without conflict detection or synthesis |
| `--mode review` | Code review mode (default) — file-level findings with severity |
| `--mode feedback` | Architecture feedback — perspective-level analysis, no file:line |
| `--mode decision` | Decision analysis — agents rate options from their domain |

**Mode detection:**
- If `--mode` is not provided, default to `review`
- If `--mode decision`, the remaining non-flag argument is the decision question (not a file path)
- If `--mode feedback`, file arguments are optional (feedback can be on the overall architecture)

---

## Step 2: Determine Review Scope

**For `--mode review` (default):**

**If no file/folder argument provided:**
```bash
# Detect base branch dynamically: main, master, or develop (whichever exists)
if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/main...HEAD)
elif git rev-parse --verify --quiet origin/master >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/master...HEAD)
elif git rev-parse --verify --quiet origin/develop >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/develop...HEAD)
else
  # No remote base found — fall back to uncommitted changes
  FILES=$(git diff --name-only)
fi
```
Review all files in `$FILES`. If `$FILES` is empty, trigger the "Empty Review Scope" recovery (see Error Handling).

**If file/folder argument provided:**
Read the specified target. Use Glob to expand folder targets.

**For `--mode feedback`:**
If files are provided, read them for context. If no files, use the git diff scope. Feedback mode can also work with just a description and no files.

**For `--mode decision`:**
The non-flag argument is the decision question. Optionally read files if provided as additional context.

For each file in scope, use the Read tool to load the content. Don't ask the user — just read them.

---

## Step 3: Auto-Route to Agents

**If `--agents` flag was provided:** Use the explicit agent list. Validate each agent exists by checking:
1. `.claude/agents/specialists/{agent-id}.md`
2. `.claude/agents/coordinators/{agent-id}.md`
3. `.claude/agents/{agent-id}.md` (core agents)

If an agent is not found, show available agents and trigger "Agent Not Found" recovery.

**If `--agents` was NOT provided:** Auto-detect agents from files in scope.

### File Extension Routing

Read `.claude/agents/INDEX.md` to discover available agents. Read `.claude/knowledge/project/project-context.md` for tech stack context.

| File Pattern | Primary Agent | Secondary Agent(s) |
|-------------|---------------|---------------------|
| `*.vue` | Framework specialist (vue) | accessibility, styling specialist |
| `*.tsx`, `*.jsx` | Framework specialist (react) | accessibility, styling specialist |
| `*.ts`, `*.js` | Language specialist (typescript) | — |
| `*.scss`, `*.css`, `*.less` | Styling specialist | accessibility |
| `*.test.*`, `*.spec.*` | Testing specialist | Language specialist |
| `*.py` | Language specialist (python) | Framework specialist (django/flask/etc.) |
| `*.java` | Language specialist (java) | Framework specialist (spring/etc.) |
| `*.go`, `*.rs` | Language specialist | — |
| `*.sql`, `*.prisma` | Database specialist | security-specialist |
| `*.yaml`, `*.json`, `*.toml` (config) | security-specialist | — |
| `*.html` | accessibility | Framework specialist |

### Cross-Cutting Rules

**Always include `security-specialist`** (if available) when scope contains:
- Files with `auth`, `login`, `password`, `token`, `session`, `api`, `middleware`, or `config` in the path
- Files containing `eval(`, `exec(`, `innerHTML`, `v-html`, `dangerouslySetInnerHTML`
- Any `.env`, `.yaml`, `.json`, or `.toml` configuration file

**Always include `accessibility`** (if available) when scope contains:
- UI component files (`.vue`, `.tsx`, `.jsx`, `.html`, `.svelte`)
- Files containing `aria-`, `role=`, `tabIndex`, `focus`, `<dialog`, `<nav`, `<form`

### Agent Count Constraints

- **Minimum: 2 agents** — Collaboration requires at least 2 perspectives. If only 1 agent matches, add `code-reviewer` as a second perspective.
- **Maximum: 4 agents** — If more than 4 match, prioritize by:
  1. security-specialist (security is non-negotiable)
  2. accessibility (user-facing impact)
  3. Framework specialist (primary tech)
  4. Language specialist (type safety, idioms)
  5. Styling specialist
  6. Testing specialist
  7. Database specialist
  8. code-reviewer (fallback)

### Graceful Degradation

If the project has not run `/atta` (no generated specialists):
- Fall back to core agents: `code-reviewer` (quality focus) + `qa-validator` (requirements focus)
- Note: Do not fall back to `project-owner` — its definition prohibits reading code files, making it unsuitable as a reviewing collaborator.
- Output a notice: "For better collaboration results, run `/atta` to generate specialist agents for your tech stack."

---

## Step 4: Invoke Agents (Parallel)

For each selected agent, spawn a Task tool subagent in parallel:

### Subagent Construction

For each agent:

1. **Read the agent definition file** from the appropriate directory (specialists, coordinators, or core agents)
2. **Read relevant pattern files** referenced by the agent (from `.claude/knowledge/patterns/`)
3. **Read the finding schema** from `.claude/knowledge/templates/collaboration-finding.md`
4. **Construct the subagent prompt** (see template below)
5. **Spawn via Task tool** — use `run_in_background: true` for parallel execution when invoking multiple agents

### Subagent Prompt Template

For **review mode**, construct this prompt for each agent:

```
You are acting as the {AGENT_NAME} in a multi-agent collaboration session.

## Your Agent Definition
{CONTENTS OF AGENT DEFINITION FILE}

## Pattern Knowledge
{CONTENTS OF RELEVANT PATTERN FILES}

## Collaboration Protocol

You are one of {N} agents reviewing the same code. Your output will be synthesized
with other agents' findings. Format your output EXACTLY as specified below.

{CONTENTS OF collaboration-finding.md SCHEMA}

### Important Rules
1. Stay in YOUR domain only. Report findings in your area of expertise.
2. If you see something outside your domain, mention it briefly in Summary — do NOT
   create a finding row for it.
3. Set conflicts_with to the agent_id that might disagree with your recommendation.
4. One sentence per finding. One sentence per recommendation.
5. Use severity levels accurately — do not inflate.

## Files to Review

{FILE CONTENTS — read via Read tool before constructing this prompt}

Begin your assessment now. Follow the Agent Output Envelope format exactly.
```

For **feedback mode**, adapt the prompt:
- Replace "Files to Review" with "Architecture Context"
- Replace file:line with "aspect" in the finding schema
- Replace severity with priority (HIGH/MEDIUM/LOW)
- Instruct agents to provide perspective-level analysis, not line-level findings

For **decision mode**, adapt the prompt:
- Include the decision question prominently
- Instruct each agent to analyze each option from their domain perspective
- Request a preference with reasoning
- Include any relevant file context if provided

### Parallel Execution

Spawn all agents in parallel using multiple Task tool calls in a single message. Each subagent runs independently.

**Failure handling:**
- If a subagent fails or times out, log the failure and continue with remaining agents
- Minimum 1 successful agent required to proceed to Step 5
- If all agents fail, trigger "All Agents Failed" recovery

---

## Step 5: Collect and Detect Conflicts

After all subagents complete, collect their outputs and run conflict detection.

### 5a. Parse Agent Outputs

For each agent's response, extract:
- The findings table rows
- The summary counts (Critical/High/Medium/Low/Info)
- The verdict (APPROVED/CHANGES REQUESTED/NEEDS DISCUSSION)

If an agent's output cannot be parsed into the normalized format, include their raw output as-is in the Specialist Findings section and note the parsing issue.

### Mode Awareness

The layers below are written for review mode (`file:line` + `severity`). For other modes, substitute:
- **Feedback mode**: `file:line` → `aspect`, `severity` → `priority` (HIGH/MEDIUM/LOW)
- **Decision mode**: `file:line` → `aspect`, findings represent option assessments with preference + reasoning

Apply the same conflict detection logic using the mode-appropriate keys.

### 5b. Three-Layer Conflict Detection

**Layer 1 — Agent Self-Reporting:**
Check the `conflicts_with` field in each finding row. For each non-empty value, find the matching agent's findings that touch the same file/aspect and create a conflict record.

**Layer 2 — Location/Aspect-Based Detection:**
Group all findings by `file:line` (review mode) or `aspect` (feedback/decision mode). For each group with findings from 2+ agents:
- If recommendations differ and agents are from different domains → flag as conflict
- If recommendations are the same → merge as consensus (note agreement)

**Layer 3 — Severity/Priority Disagreement:**
For findings in the same group from different agents:
- If severity/priority differs by 2+ levels (e.g., CRITICAL vs MEDIUM) → flag as disagreement
- If it differs by 1 level → note but don't flag

### 5c. Build Consensus List

Findings that appear in 2+ agents' outputs for the same file:line with compatible recommendations are consensus items. These have the highest confidence.

### 5d. Deduplication

If multiple agents report the exact same issue at the same location:
- Keep the finding with the higher severity
- Combine recommendations if they differ
- Note all reporting agents in the "Reported By" column

**If `--skip-synthesis` flag was provided:** Skip conflict detection entirely. Show each agent's raw output in sequence and proceed to Step 6 (output formatting only, no synthesis sections).

---

## Step 6: Synthesize Output

### Review Mode Output

```markdown
## Collaboration Report

### Session Summary

| Metric | Value |
|--------|-------|
| Mode | review |
| Agents | {agent1}, {agent2}, {agent3} ({count}) |
| Files Reviewed | {count} |
| Total Findings | {count} |
| Consensus Items | {count} |
| Conflicts | {count} |
```

**If `--quick` flag:** Filter out MEDIUM, LOW, and INFO findings from all sections below.

```markdown
### Consensus Findings

These issues were identified by multiple agents — highest confidence.

| Severity | File | Finding | Recommendation | Reported By |
|----------|------|---------|----------------|-------------|
| {rows from 5c} |

### Specialist Findings

#### {Agent 1 Name}

| Severity | File | Finding | Recommendation |
|----------|------|---------|----------------|
| {agent 1 unique findings — not in consensus} |

#### {Agent 2 Name}

| Severity | File | Finding | Recommendation |
|----------|------|---------|----------------|
| {agent 2 unique findings} |

[Repeat for each agent]
```

**If conflicts were detected:**

```markdown
### Conflicts Detected

#### Conflict 1: {Brief description}

- **{agent_a}** recommends: {recommendation}
  - Reasoning: {from agent's context}
- **{agent_b}** recommends: {recommendation}
  - Reasoning: {from agent's context}
- **Affected**: {file:line}
- **Resolution options**:
  1. {Option that satisfies agent_a}
  2. {Option that satisfies agent_b}
  3. {Hybrid approach if possible}
- **Suggested resolution**: {best option with rationale, or "User decision needed"}
```

```markdown
### Action Items (Prioritized)

| # | Action | Severity | Domains | Source |
|---|--------|----------|---------|--------|
| 1 | {action} | CRITICAL | {domains} | consensus / {agent} |
| 2 | {action} | HIGH | {domains} | consensus / {agent} |
| ... |

### Verdict: {APPROVED / CHANGES REQUESTED / NEEDS DISCUSSION}

**Rationale**: {1-2 sentence explanation of verdict}

### Next Steps
- {Relevant follow-up actions}
- Run `/review` for single-agent detailed review
- Run `/agent {id}` for deeper analysis in a specific domain
- Run `/preflight` when all issues are resolved
```

### Feedback Mode Output

```markdown
## Collaboration Feedback

### Session Summary

| Metric | Value |
|--------|-------|
| Mode | feedback |
| Agents | {list} |
| Topic | {description or files} |

### Perspectives

#### {Agent 1 Name} Perspective

**Priority**: {HIGH/MEDIUM/LOW}
**Aspect**: {what they focused on}
**Assessment**: {1-2 paragraph perspective}
**Recommendations**: {bulleted list}

#### {Agent 2 Name} Perspective

[Same format]

### Synthesis
- **Agreement**: {points all agents agree on}
- **Divergence**: {points where perspectives differ}
- **Key tradeoffs**: {identified tradeoffs}

### Recommendations (Prioritized)
1. {consolidated recommendation}
2. {consolidated recommendation}
```

### Decision Mode Output

```markdown
## Decision Analysis: {Question}

### Session Summary

| Metric | Value |
|--------|-------|
| Mode | decision |
| Agents | {list} |
| Question | {decision question} |

### Analysis Matrix

| Agent | Option A | Option B | Preferred | Reasoning |
|-------|----------|----------|-----------|-----------|
| {agent1} | {assessment} | {assessment} | {A/B/-} | {1 sentence} |
| {agent2} | {assessment} | {assessment} | {A/B/-} | {1 sentence} |
| {agent3} | {assessment} | {assessment} | {A/B/-} | {1 sentence} |

### Recommendation: {Option X}

**Consensus**: {N of M} agents prefer Option {X}
**Dissent**: {agent} prefers Option {Y} because {reason}

### Tradeoff Summary
- **Option A strengths**: {from agents who prefer A}
- **Option B strengths**: {from agents who prefer B}
- **Risk factors**: {identified risks for each option}
```

---

## Step 7: Session Tracking

### 7a. Create Session File (run this FIRST — before Step 1 parsing)

Generate timestamp and UUID:
```bash
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
UUID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null)
UUID=$(echo "$UUID" | tr '[:upper:]' '[:lower:]')
ISO_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
START_TIME=$(date +%s)
```

> If `$UUID` is empty (neither `uuidgen` nor `python3` available), skip session tracking entirely — proceed with skill execution normally and omit the Finalize Session step.

Write session file `{claudeDir}/.sessions/session-$TIMESTAMP.json`:

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "$UUID",
  "timestamp": "$ISO_TIME",
  "startedBy": "user",
  "skill": {
    "name": "collaborate",
    "args": "{actual args passed by user}",
    "status": "in_progress"
  },
  "agents": [],
  "collaboration": {
    "mode": "{review|feedback|decision}",
    "agentsInvolved": [],
    "routingMethod": "{auto|manual}"
  },
  "metadata": {
    "projectPath": "{current-working-directory}",
    "claudeDir": "{claudeDir-from-settings}",
    "duration": null,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

### 7b. Track Agent Invocations (during Step 4)

For each agent spawned, add to the "agents" array. Derive the `role` from where the agent was resolved:
- `.claude/agents/{id}.md` (core) → `"universal"`
- `.claude/agents/coordinators/{id}.md` → `"coordinator"`
- `.claude/agents/specialists/{id}.md` → `"specialist"`

```json
{
  "name": "{agent-id}",
  "role": "{universal|coordinator|specialist}",
  "invokedAt": "{ISO-8601-UTC}",
  "status": "in_progress"
}
```

After each agent completes, update its status to `"completed"` (or `"failed"`).

### 7c. Finalize Session (after Step 6)

Compute duration using the `START_TIME` value from Step 7a. Since bash state does not persist across tool calls, the orchestrator must retain `START_TIME` from when it was first generated (or re-read the session file's `timestamp` field and compute the difference).

```bash
END_TIME=$(date +%s)
DURATION=$(( (END_TIME - START_TIME) * 1000 ))
```

Update session file:
- `skill.status` → `"completed"` (or `"failed"` / `"interrupted"`)
- `metadata.duration` → `$DURATION`
- `collaboration.agentsInvolved` → list of agent IDs that were actually invoked
- `collaboration.findingsCount` → `{"critical": N, "high": N, "medium": N, "low": N, "info": N}`
- `collaboration.conflictsCount` → number of conflicts detected
- `collaboration.verdict` → final verdict string
- `collaboration.consensusReached` → `true` if all agents agree on verdict, `false` otherwise

Run cleanup:
```bash
.claude/scripts/session-cleanup.sh {claudeDir}
```

Run context generation:
```bash
.claude/scripts/generate-context.sh {claudeDir}
```

---

## Error Handling & Recovery

> **Session note:** If a session file was created, always finalize it (Finalize Session above) before displaying recovery messages — set status to `"failed"` or `"interrupted"`.

### Empty Review Scope

```markdown
No files found to review.

Recovery options:
1. Pass a target explicitly: `/collaborate src/components/`
2. Stage or modify files, then rerun `/collaborate`
3. Use `/collaborate --mode feedback` for architecture discussion (no files needed)
```

### Agent Not Found

```markdown
Agent "{agent-id}" not found in the agent registry.

Available agents: {list from INDEX.md}

Recovery options:
1. Check spelling and use an available agent ID
2. Run `/atta` to generate specialists for your tech stack
3. Use `/collaborate` without `--agents` for auto-routing
```

### No Agents Available

```markdown
No specialist agents are available for collaboration.

Recovery options:
1. Run `/atta` to generate agents for your tech stack
2. Use `/review` for single-agent code review (works without specialists)
3. Specify core agents explicitly: `/collaborate --agents code-reviewer,qa-validator`
```

### Single Agent Only

```markdown
Only 1 specialist matches the files in scope. Collaboration requires at least 2 agents.

Matched agent: {agent-id} (from {file pattern})

Recovery options:
1. Add a second agent explicitly: `/collaborate --agents {matched},code-reviewer`
2. Include more file types in scope to trigger additional agents
3. Use `/agent {matched}` for a single-specialist review instead
```

### Agent Invocation Failure

```markdown
{agent-id} failed to complete its review.

Continuing with remaining agents ({list}).

Recovery options:
1. Accept partial collaboration results ({N} of {M} agents)
2. Retry: `/collaborate --agents {failed-id} {target}`
3. Use `/agent {failed-id}` for a standalone review of their domain
```

### All Agents Failed

```markdown
All {N} agents failed to complete their reviews.

Recovery options:
1. Retry: `/collaborate {original args}`
2. Try with fewer agents: `/collaborate --agents code-reviewer {target}`
3. Use `/review` for single-agent review instead
```

### Agent Output Not Parseable

```markdown
{agent-id} produced output that could not be parsed into the normalized finding format.

Their raw output has been included as-is in the Specialist Findings section.

Recovery options:
1. Accept the report with raw output from {agent-id}
2. Retry with fewer agents: `/collaborate --agents {working-agents}`
3. Run `/agent {agent-id} {target}` separately for their perspective
```

### Too Many Files in Scope

If more than 20 files are in scope:

```markdown
{N} files in scope may exceed agent context limits.

Recovery options:
1. Narrow scope: `/collaborate src/components/UserProfile.tsx`
2. Use `--quick` flag for critical-only findings across all files
3. Run `/collaborate` on smaller batches (e.g., by folder)
```

---

## Related Skills

- `/review` — Single-agent code review (faster, less comprehensive)
- `/security-audit` — Deep security scan (OWASP Top 10, dependencies, secrets)
- `/preflight` — Full pre-PR validation (lint + security + tests + review)
- `/agent {id}` — Invoke a single specialist for focused analysis
- `/team-lead` — Task decomposition with specialist coordination
- `/atta` — Generate specialist agents for your tech stack

---

_Multi-agent collaboration with conflict detection_
