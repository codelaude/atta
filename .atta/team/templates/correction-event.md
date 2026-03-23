---
applyTo: "**"
description: Schema for pattern detection correction events logged to corrections.jsonl
---

# Correction Event Schema

Correction events are logged to `{claudeDir}/.context/corrections.jsonl` by the pattern detection system. Each line is a self-contained JSON object (JSONL format).

## Event Format

```json
{
  "id": "COR-a1b2c3d4e5f6",
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
  "promoted": false,
  "outcome": "accepted",
  "agentId": "code-reviewer"
}
```

## Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Auto-generated: `COR-<12-hex-chars>` (UUID-derived, race-condition-free) |
| `timestamp` | string | Yes | ISO 8601 UTC timestamp |
| `sessionId` | string | No | UUID of the session that captured this correction |
| `skill` | string | No | Which skill was active when correction occurred (defaults to empty string if omitted) |
| `category` | enum | Yes | `correction`, `anti-pattern`, or `command-sequence` |
| `pattern` | string | Yes | Normalized slug key for deduplication (e.g., `use-nullish-coalescing`) |
| `description` | string | Yes | Human-readable description of what was corrected |
| `context` | object | No | Optional context: `file`, `line`, `agent`, `domain` |
| `source` | enum | Yes | How it was captured: `librarian`, `manual`, `skill-annotation` |
| `promoted` | boolean | Yes | Legacy per-event flag (always `false` in new events). Promotion is now tracked in `promoted-patterns.json` |
| `outcome` | enum | No | `accepted`, `rejected`, or absent (neutral/legacy). See Outcome Values below |
| `agentId` | string | No | Agent whose suggestion was accepted/rejected. Falls back to `context.agent` if absent |

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
| `manual` | Explicitly logged by user via `/atta-patterns log` |
| `skill-annotation` | Auto-logged by `/atta-review` or `/atta-collaborate` for anti-pattern findings |

## Domain Values

Reuses the domain enum from the collaboration finding schema:
`framework`, `language`, `styling`, `accessibility`, `security`, `testing`, `architecture`, `performance`, `database`

## Pattern Key Convention

The `pattern` field is a slugified key used for grouping. Convention:
- Lowercase with hyphens: `use-nullish-coalescing`
- Verb-first when describing a preference: `prefer-composition-api`
- Noun-first when describing an anti-pattern: `any-type-usage`

Multiple corrections with the same `pattern` value count toward the same threshold.

## Outcome Values

The `outcome` field tracks whether the user accepted or rejected a suggestion. It was added in v2.5 (Track 6) and is backward-compatible — events without it are treated as neutral.

| Value | Meaning | Logged By |
|-------|---------|-----------|
| `accepted` | User accepted the suggestion or finding | Any skill or script that explicitly sets `outcome: "accepted"` (no implicit default) |
| `rejected` | User corrected or disagreed with the suggestion | Librarian (when correction triggers fire) or any logger that explicitly sets `outcome: "rejected"` |
| *(absent)* | Legacy event or no explicit verdict (treated as neutral) | Pre-v2.5 events, manual logs, `pattern-log.sh` when `outcome` is omitted, current `/atta-review` and `/atta-collaborate` when they don't pass `outcome` |

**`agentId` vs `context.agent`**: The `agentId` field identifies the agent whose suggestion is being evaluated. This may differ from `context.agent` (the agent active when the event was logged). Example: the librarian logs a rejection of code-reviewer's suggestion — `context.agent` is `librarian`, `agentId` is `code-reviewer`. When `agentId` is absent, analysis falls back to `context.agent`.

## Promotion Tracking

Promotion status is tracked in `{claudeDir}/.context/promoted-patterns.json` (append-only, separate from JSONL):
```json
{
  "promotions": [
    { "pattern": "use-nullish-coalescing", "promotedAt": "2026-02-23T10:00:00Z", "target": "directive" }
  ]
}
```

This design keeps `corrections.jsonl` strictly append-only — no read-modify-write cycle. The `promoted` field in individual JSONL events is legacy (always `false` for new events). The analyze script reads `promoted-patterns.json` to determine promotion status.

## Aggregation

Correction events are aggregated by `.atta/scripts/pattern-analyze.sh` into:
- `{attaDir}/local/context/patterns-learned.json` — pattern aggregation (grouped by pattern key)
- `{attaDir}/local/context/agent-learning.json` — per-agent learning profiles (grouped by agentId)

Both are caches that can be regenerated from `corrections.jsonl` + `promoted-patterns.json`.

## Aggregation Output Schema (v1.1.0)

As of v2.5 Track 7, the aggregation files include trend analysis and recommendations.

### patterns-learned.json additions

| Field | Type | Description |
|-------|------|-------------|
| `trends.velocity.last7Days` | number | Corrections logged in last 7 days |
| `trends.velocity.prior7Days` | number | Corrections logged in the 7 days before that |
| `trends.velocity.direction` | enum | `up`, `down`, or `stable` |
| `trends.velocity.delta` | number | Difference (last7 - prior7) |
| `trends.avgTimeToReady` | number or null | Average days from firstSeen to threshold |
| `trends.agingPatterns[]` | array | Patterns ready 7+ days but not promoted |
| `recommendations[]` | array | Actionable recommendations (see types below) |

### agent-learning.json additions

| Field | Type | Description |
|-------|------|-------------|
| `agents.{id}.trends.acceptanceRateLast7` | number or null | Acceptance rate for last 7 days |
| `agents.{id}.trends.acceptanceRateLast30` | number or null | Acceptance rate for last 30 days |
| `agents.{id}.trends.direction` | enum | `up`, `down`, or `stable` |
| `agents.{id}.trends.delta` | number | Rate difference |
| `trends` | object or null | Project-wide acceptance rate trends |
| `recommendations[]` | array | Agent-specific recommendations |

### Recommendation Types

| Type | Priority | When Generated |
|------|----------|---------------|
| `promote-stale` | high | Pattern ready for 7+ days without promotion |
| `agent-improving` | info | Agent acceptance rate improved 10%+ this week |
| `agent-declining` | medium | Agent acceptance rate dropped 10%+ this week |
| `domain-cluster` | medium | 3+ unpromoted patterns in same domain |
| `velocity-spike` | info | This week's corrections >= 2x prior week |
