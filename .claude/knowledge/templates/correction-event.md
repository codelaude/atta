---
applyTo: "**"
description: Schema for pattern detection correction events logged to corrections.jsonl
---

# Correction Event Schema

Correction events are logged to `{claudeDir}/.context/corrections.jsonl` by the pattern detection system. Each line is a self-contained JSON object (JSONL format).

## Event Format

```json
{
  "id": "COR-20260222-001",
  "timestamp": "2026-02-22T14:30:00Z",
  "sessionId": "uuid-from-session-file",
  "skill": "review",
  "category": "correction",
  "pattern": "use-nullish-coalescing",
  "description": "User corrected: always use ?? instead of ||",
  "context": {
    "file": "src/utils/helpers.ts",
    "line": 42,
    "agent": "code-reviewer",
    "domain": "language"
  },
  "source": "librarian",
  "promoted": false
}
```

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Auto-generated: `COR-YYYYMMDD-NNN` (NNN is daily counter) |
| `timestamp` | string | Yes | ISO 8601 UTC timestamp |
| `sessionId` | string | No | UUID of the session that captured this correction |
| `skill` | string | Yes | Which skill was active when correction occurred |
| `category` | enum | Yes | `correction`, `anti-pattern`, or `command-sequence` |
| `pattern` | string | Yes | Normalized slug key for deduplication (e.g., `use-nullish-coalescing`) |
| `description` | string | Yes | Human-readable description of what was corrected |
| `context` | object | No | Optional context: `file`, `line`, `agent`, `domain` |
| `source` | enum | Yes | How it was captured: `librarian`, `manual`, `skill-annotation` |
| `promoted` | boolean | Yes | Whether this correction has been promoted to a directive/pattern |

## Categories and Thresholds

| Category | Description | Promotion Threshold |
|----------|-------------|---------------------|
| `correction` | User corrected AI output ("no, do X instead") | 3 occurrences |
| `anti-pattern` | Flagged by review/collaborate (CRITICAL/HIGH severity) | 5 occurrences |
| `command-sequence` | Repeated skill invocation sequences | 3 occurrences |

## Source Values

| Source | When Used |
|--------|-----------|
| `librarian` | Auto-captured by librarian agent from correction trigger phrases |
| `manual` | Explicitly logged by user via `/patterns log` |
| `skill-annotation` | Auto-logged by `/review` or `/collaborate` for anti-pattern findings |

## Domain Values

Reuses the domain enum from the collaboration finding schema:
`framework`, `language`, `styling`, `accessibility`, `security`, `testing`, `architecture`, `performance`, `database`

## Pattern Key Convention

The `pattern` field is a slugified key used for grouping. Convention:
- Lowercase with hyphens: `use-nullish-coalescing`
- Verb-first when describing a preference: `prefer-composition-api`
- Noun-first when describing an anti-pattern: `any-type-usage`

Multiple corrections with the same `pattern` value count toward the same threshold.

## Aggregation

Correction events are aggregated by `.claude/scripts/pattern-analyze.sh` into `{claudeDir}/.context/patterns-learned.json`. The aggregation file is a cache that can always be regenerated from `corrections.jsonl`.
