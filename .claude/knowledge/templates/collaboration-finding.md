---
applyTo: "**"
description: Normalized finding schema for multi-agent collaboration sessions
---

# Collaboration Finding Schema

When participating in a `/collaborate` session, agents MUST format their output using this standardized schema. This enables automated conflict detection, synthesis, and cross-agent comparison.

## Finding Table Format

Each finding is a row in a markdown table:

```
| agent_id | domain | severity | file:line | finding | recommendation | conflicts_with |
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | Yes | Your agent ID (e.g., `security-specialist`, `typescript`, `accessibility`, or whichever framework/language specialist is generated) |
| `domain` | enum | Yes | One of: `framework`, `language`, `styling`, `accessibility`, `security`, `testing`, `architecture`, `performance`, `database` |
| `severity` | enum | Yes | One of: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO` |
| `file:line` | string | Yes | File path and line number (e.g., `src/components/UserProfile.tsx:42`), or `general` for architecture-level findings |
| `finding` | string | Yes | Concise description of the issue (one sentence) |
| `recommendation` | string | Yes | Concrete actionable fix (one sentence) |
| `conflicts_with` | string | No | Comma-separated agent IDs if this recommendation may contradict another agent, or `-` if none |

### Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| `CRITICAL` | Exploitable vulnerability, data loss risk, broken functionality | Must fix before merge |
| `HIGH` | Security weakness, accessibility barrier, significant quality issue | Should fix before merge |
| `MEDIUM` | Defense-in-depth, best practice violation, maintainability concern | Fix in current sprint |
| `LOW` | Minor improvement, style preference, optimization opportunity | Track for future |
| `INFO` | Observation, positive finding, context for other agents | No action needed |

### Domain Values

| Domain | Covers |
|--------|--------|
| `framework` | Framework idioms, component patterns, lifecycle, API usage |
| `language` | Language features, type safety, syntax, runtime behavior |
| `styling` | CSS methodology, responsive design, theme compliance |
| `accessibility` | WCAG compliance, ARIA patterns, keyboard navigation, screen readers |
| `security` | OWASP Top 10, input validation, authentication, secrets, XSS, injection |
| `testing` | Test quality, coverage, patterns, assertions, mocking |
| `architecture` | Design patterns, separation of concerns, coupling, scalability |
| `performance` | Rendering, bundle size, memory, network, caching |
| `database` | Schema design, query optimization, migrations, indexing |

## Agent Output Envelope

Wrap findings in this structure:

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

1. **Stay in your domain.** Only report findings in your area of expertise.
2. **Flag cross-domain observations** in your Summary section, but do NOT create finding rows for them — the domain expert will catch it.
3. **Set `conflicts_with`** when your recommendation might contradict another domain's preferences (e.g., security recommending strict CSP while framework uses inline styles).
4. **Be concise.** One sentence per finding, one sentence per recommendation.
5. **Use correct severity.** Follow the severity definitions above — do not inflate.
6. **Report positives as INFO.** If something is done well and relevant, note it.

## Example

```markdown
## Security Specialist Assessment

### Context
Reviewed 3 component files for OWASP Top 10 compliance, focusing on user input handling and data flow.

### Findings

| agent_id | domain | severity | file:line | finding | recommendation | conflicts_with |
|----------|--------|----------|-----------|---------|----------------|----------------|
| security-specialist | security | CRITICAL | src/components/UserProfile.tsx:42 | innerHTML renders unsanitized user input | Use DOMPurify.sanitize() or use safe text rendering | - |
| security-specialist | security | HIGH | src/auth/login.ts:18 | Password compared with == instead of constant-time comparison | Use crypto.timingSafeEqual() for password comparison | - |
| security-specialist | security | MEDIUM | src/components/UserProfile.tsx:22 | Inline event handlers could bypass CSP | Move handlers to component methods or use framework event binding | framework-specialist |
| security-specialist | security | INFO | src/auth/login.ts:5 | CSRF token properly included in form submission | No action needed — good practice | - |

### Summary
- **Critical**: 1 | **High**: 1 | **Medium**: 1 | **Low**: 0 | **Info**: 1
- **Verdict**: CHANGES REQUESTED
```
