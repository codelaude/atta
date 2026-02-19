# Multi-Agent Collaboration

**Version**: v2.4
**Status**: Production

## Overview

The `/collaborate` skill invokes 2-4 specialist agents in parallel to review the same code from different domain perspectives. Their findings are collected into a normalized format, checked for conflicts, and synthesized into a single actionable report.

This solves a real problem: running `/agent security-specialist` and then `/agent accessibility` separately gives you two disconnected reviews. `/collaborate` runs them in parallel and detects when their recommendations contradict each other.

## How It Works

### 1. You run the skill

```
/collaborate                                          # Auto-routes based on git diff
/collaborate src/components/UserProfile.tsx           # Specific file
/collaborate --agents security,accessibility          # Explicit agents
```

### 2. Auto-routing selects agents

Based on file extensions and content patterns, the skill determines which specialists are relevant:

| File Pattern | Agents Selected |
|-------------|----------------|
| Component files (`.tsx`, `.jsx`, `.vue`, `.svelte`) | Framework specialist + accessibility |
| Test files (`*.test.*`, `*.spec.*`) | Testing specialist + language specialist |
| API/auth routes | Security specialist + backend specialist |
| Style files (`.scss`, `.css`) | Styling specialist + accessibility |
| Config files (`.yaml`, `.json`, `.env`) | Security specialist |
| Database files (`.sql`, `.prisma`) | Database specialist + security |

Cross-cutting rules automatically include:
- **Security specialist** when files touch auth, tokens, config, or contain dangerous patterns (`eval`, `innerHTML`, etc.)
- **Accessibility specialist** when files contain UI components or ARIA attributes

### 3. Agents run in parallel

Each agent receives:
- Its own agent definition and pattern files
- The normalized finding schema (so all outputs have the same format)
- The files to review

Agents execute independently via Task tool subagents — they don't see each other's output during execution.

### 4. Conflict detection runs

Three layers check for disagreements:

| Layer | What It Detects | Example |
|-------|----------------|---------|
| Self-reporting | Agent explicitly flags `conflicts_with` | Security flags CSP conflict with framework's inline styles |
| Location-based | Two agents recommend different fixes at the same `file:line` | Security says "sanitize input", framework says "use text binding" |
| Severity disagreement | Same issue rated 2+ severity levels apart by different agents | Security says CRITICAL, framework says LOW |

### 5. Synthesized report

The output shows:
- **Consensus findings** — issues multiple agents agree on (highest confidence)
- **Specialist findings** — unique findings per agent
- **Conflicts** — with both perspectives and resolution options
- **Action items** — prioritized across all agents
- **Verdict** — APPROVED, CHANGES REQUESTED, or NEEDS DISCUSSION

## Three Modes

### Review Mode (default)

File-level code review with severity-rated findings.

```
/collaborate                       # Review git diff
/collaborate src/components/       # Review folder
/collaborate --quick               # CRITICAL + HIGH only
```

Output: Finding tables, conflict detection, prioritized action items, verdict.

### Feedback Mode

Architecture and design feedback without line-level findings.

```
/collaborate --mode feedback
/collaborate --mode feedback src/auth/
```

Output: Per-agent perspectives, synthesis of agreement/divergence, prioritized recommendations.

### Decision Mode

Structured option analysis with each agent rating alternatives from their domain.

```
/collaborate --mode decision "REST vs GraphQL?"
/collaborate --mode decision "Monorepo vs separate repos?"
```

Output: Decision matrix, weighted consensus, dissent notes, tradeoff summary.

## Flags

| Flag | Effect |
|------|--------|
| `--quick` | Only CRITICAL and HIGH findings |
| `--agents agent1,agent2` | Skip auto-routing, use these specific agents |
| `--skip-synthesis` | Raw agent outputs without conflict detection |
| `--mode review` | Code review (default) |
| `--mode feedback` | Architecture feedback |
| `--mode decision` | Decision analysis |

## The Finding Schema

All agents produce findings in a normalized markdown table:

```
| agent_id | domain | severity | file:line | finding | recommendation | conflicts_with |
```

This standardized format is what enables automated conflict detection and cross-agent comparison. It's defined in `.claude/knowledge/templates/collaboration-finding.md`.

**Domains**: framework, language, styling, accessibility, security, testing, architecture, performance, database

**Severity levels**: CRITICAL, HIGH, MEDIUM, LOW, INFO

The schema is intentionally simple — markdown tables are portable across Claude Code, OpenAI Codex, and GitHub Copilot.

## Agent Count Rules

- **Minimum: 2** — collaboration requires at least 2 perspectives. If only 1 matches, `code-reviewer` is added automatically.
- **Maximum: 4** — if more than 4 match, prioritized by: security > accessibility > framework > language > styling > testing > database > code-reviewer.
- **No specialists?** — falls back to `code-reviewer` + `project-owner` with a suggestion to run `/init`.

## Integration with Other Skills

### /review suggests /collaborate

When `/review` finishes and the scope spans multiple domains, it suggests:

```
Multi-Agent Collaboration Available
Run /collaborate for cross-domain analysis with conflict detection.
```

This is a suggestion, not automatic — you decide whether the deeper analysis is worth the extra time.

### /preflight

Run `/preflight` after resolving collaboration findings to validate everything passes.

### /agent

For deeper analysis in one specific domain, use `/agent {id}` directly. Collaboration is for cross-cutting concerns; single-agent invocation is for focused deep dives.

## Session Tracking

Each collaboration session creates a session file with extended metadata:

```json
{
  "collaboration": {
    "mode": "review",
    "agentsInvolved": ["security-specialist", "accessibility"],
    "routingMethod": "auto",
    "findingsCount": {"critical": 1, "high": 2, "medium": 3, "low": 0, "info": 1},
    "conflictsCount": 1,
    "verdict": "CHANGES REQUESTED",
    "consensusReached": false
  }
}
```

This is an additive extension to the session schema (v1.0.0) — existing sessions without collaboration metadata continue to work.

## Error Handling

The skill handles 8 error scenarios with 3 recovery options each:

| Scenario | What Happens |
|----------|-------------|
| Empty scope | Suggests explicit target, staging files, or feedback mode |
| Agent not found | Lists available agents, suggests `/init` or auto-routing |
| No agents available | Suggests `/init`, `/review`, or core agent fallback |
| Single agent only | Adds second agent or suggests `/agent` for single-specialist review |
| Agent failure | Continues with remaining agents, notes the failure |
| All agents fail | Suggests retry, fewer agents, or `/review` fallback |
| Unparseable output | Includes raw output as-is, notes parsing issue |
| Too many files | Suggests narrowing scope, `--quick` flag, or batching |

## Cross-Platform Design

The normalized finding schema (markdown tables) is the portable contract:

| Platform | Support |
|----------|---------|
| Claude Code | Full — parallel subagents via Task tool |
| OpenAI Codex | Finding schema works as-is; routing maps to AGENTS.md |
| GitHub Copilot | Degrades to sequential; finding schema still applies |
| Any LLM tool | Markdown tables are universal |

## Files

### Framework Files (Committed)
```
.claude/skills/collaborate/SKILL.md                      # The skill itself
.claude/knowledge/templates/collaboration-finding.md     # Normalized finding schema
.claude/.sessions/schema.json                            # Extended with collaboration metadata
```

### Referenced Files
```
.claude/agents/INDEX.md                                  # Agent registry (for discovery)
.claude/knowledge/project/project-context.md             # Tech stack context (for routing)
.claude/agents/specialists/*.md                          # Specialist definitions (read per agent)
.claude/knowledge/patterns/*.md                          # Pattern files (passed to agents)
```

## FAQ

**Q: How many tokens does collaboration use?**
A: Roughly N times single-agent cost (where N is the number of agents), plus synthesis overhead. Use `--quick` to reduce token usage on large scopes.

**Q: Can I use collaboration without running /init?**
A: Yes, but it falls back to core agents (`code-reviewer` + `project-owner`). For specialist agents, run `/init` first.

**Q: What if two agents give contradictory advice?**
A: That's the point. The conflict detection highlights the disagreement, shows both perspectives with reasoning, and presents resolution options. You decide.

**Q: Is feedback mode useful for greenfield projects?**
A: Yes. Feedback mode works without files — agents can discuss architecture and design decisions based on a description alone.

**Q: Can I add custom agents to collaboration?**
A: Yes. Any agent in the registry (`.claude/agents/`) can be specified with `--agents`. Custom specialists generated by `/init` are automatically available for auto-routing.

## See Also

- **[Bootstrap System](bootstrap-system.md)** - How agent generation works
- **[Session Tracking](session-tracking.md)** - Session metadata and retention
- **[Extending the System](extending.md)** - Add custom agents and technologies
- **[Design Philosophy](philosophy.md)** - Framework principles

---

**Added in**: v2.4 (2026-02-19)
**Developed using**: Dogfooding (framework building itself)
