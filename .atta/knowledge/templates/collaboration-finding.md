---
applyTo: "**"
description: Normalized finding schema for multi-agent collaboration sessions
---

# Collaboration Finding Schema

When participating in a `/collaborate` session, agents MUST format output using this schema for automated conflict detection and cross-agent comparison.

## Finding Table Format

```
| agent_id | domain | severity | file:line | finding | recommendation | conflicts_with |
```

| Field | Required | Description |
|-------|----------|-------------|
| `agent_id` | Yes | Your agent ID (e.g., `security-specialist`, `accessibility`) |
| `domain` | Yes | One of: `framework`, `language`, `styling`, `accessibility`, `security`, `testing`, `architecture`, `performance`, `database` |
| `severity` | Yes | `CRITICAL` (must fix), `HIGH` (should fix), `MEDIUM` (fix in sprint), `LOW` (track), `INFO` (observation) |
| `file:line` | Yes | File path and line (e.g., `src/UserProfile.tsx:42`), or `general` |
| `finding` | Yes | One-sentence issue description |
| `recommendation` | Yes | One-sentence actionable fix |
| `conflicts_with` | No | Agent IDs whose recommendations may contradict, or `-` |

## Agent Output Envelope

```markdown
## [Agent Name] Assessment
### Context
[1-2 sentences: what was examined and from which perspective]
### Findings
| agent_id | domain | severity | file:line | finding | recommendation | conflicts_with |
|----------|--------|----------|-----------|---------|----------------|----------------|
| [rows] | | | | | | |
### Summary
- **Critical**: N | **High**: N | **Medium**: N | **Low**: N | **Info**: N
- **Verdict**: APPROVED / CHANGES REQUESTED / NEEDS DISCUSSION
```

## Collaboration Rules

1. **Stay in your domain.** Only report findings in your expertise area.
2. **Flag cross-domain observations** in Summary, but do NOT create finding rows for them.
3. **Set `conflicts_with`** when your recommendation may contradict another domain's preferences.
4. **Be concise.** One sentence per finding, one per recommendation.
5. **Use correct severity.** Follow definitions above — do not inflate.
6. **Report positives as INFO.**
