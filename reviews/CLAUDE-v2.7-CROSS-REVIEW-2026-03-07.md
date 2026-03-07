# Claude Cross-Review: v2.7.0 PR — Token Diet + Template Compression

**Date**: 2026-03-07
**Branch**: `feature/v2.8` (shipping as v2.7.0)
**PR scope**: 155 files changed, +5106 / -1097 lines
**Preflight**: All checks passed (lint, security, tests, review)

---

## What This PR Adds (v2.7.0)

This is a large PR combining multiple tracks. The latest additions (this session) are the **Token Diet** and **Template Compression** tracks. Full scope:

### Token Diet — Scoped Directives (Steps 1-5)
- `/agent` now loads `directives-{agent-id}.md` alongside agent definitions — directives enter context only when their agent/skill runs
- Librarian routes new directives to category-scoped files (`directives-code-reviewer.md`, `directives-testing.md`, `directives-style.md`, etc.)
- 7 skills (`/review`, `/collaborate`, `/test`, `/preflight`, `/lint`, `/ship`, `/librarian`) each load only their relevant scoped directive files
- `/librarian --migrate` re-classifies existing flat directives into scoped files (interactive)
- `/patterns promote --directives` merges 8+ scoped directives into agent `## Project Rules` sections
- `/update` Tier 2 merge preserves `## Project Rules` sections; scoped files are Tier 3 (never touch)

### Template Compression (Step 6)
- Created `_common.md` shared partial (89 lines) at `.atta/bootstrap/templates/agents/_common.md`
- Compressed all 11 agent templates: **2033 → 1435 lines (29.4% reduction)**
- Templates now use `{{> common.SECTION}}` syntax for 7 shared sections: specialist_constraints, key_rules, anti_patterns, knowledge_base, delegates_footer, mcp_standard, mcp_browser
- `/atta` SKILL.md Phase 4 updated to read `_common.md` before template generation

### Other Tracks in This PR (previously reviewed)
- Developer Profile + Prompt Optimizer (`/profile`, `/optimize`)
- Architectural Pattern Extraction + Staleness Detection
- `.atta/` shared directory restructure
- `/preflight --auto-fix` iterative loop
- Cursor adapter (5th adapter)
- CI Review GitHub Action adapter (6th adapter)

---

## Key Files to Review

### Template Compression (new this session)
- `.atta/bootstrap/templates/agents/_common.md` — new shared partial
- `.atta/bootstrap/templates/agents/*.template.md` — all 11 compressed (compare before/after)
- `.claude/skills/atta/SKILL.md` — Phase 4 "Agent Generation from Templates" section added

### Scoped Directives (new this session)
- `.claude/skills/agent/SKILL.md` — step 3c for scoped directive loading
- `.claude/skills/librarian/SKILL.md` — step 2b for scoped routing
- `.claude/skills/review/SKILL.md` — Step 0 scoped loading
- `.claude/skills/collaborate/SKILL.md` — Step 0 scoped loading
- `.claude/skills/test/SKILL.md` — Step 0 scoped loading
- `.claude/skills/preflight/SKILL.md` — Step 0 scoped loading
- `.claude/skills/lint/SKILL.md` — Step 0 scoped loading
- `.claude/skills/ship/SKILL.md` — Step 0 scoped loading
- `.claude/skills/patterns/SKILL.md` — promote --directives mode
- `.claude/skills/update/SKILL.md` — Tier 2 merge for `## Project Rules`
- `.claude/agents/librarian.md` — routing table for scoped files
- `src/adapters/claude-code.js` — CLAUDE.md session-start scoped directive instructions

### Docs Updated
- `.atta/docs/changelog.md` — Token Diet section under v2.7.0
- `.atta/docs/bootstrap-system.md` — template count, partial explanation
- `.atta/docs/extending.md` — _common.md + missing templates in directory tree

### Bug Fix
- `.claude/skills/update/SKILL.md` — `<framework-repo-url>` → `https://github.com/codelaude/atta-prime.git`
- `.claude/skills/migrate/SKILL.md` — same URL fix

---

## Security Audit Results

- **CRITICAL**: 0
- **HIGH**: 2 (pre-existing, not from this PR)
  1. Regex replacement injection in `shared.js:223-228` — `$1`/`$&` in replacement strings. Low practical risk (paths are hardcoded in adapter files)
  2. Symlink pass-through in `cpSync()` — no `dereference: true`. Framework sources are from npm package
- **Dependencies**: 0 vulnerabilities
- **Secrets**: 0 leaked

---

## Questions for Codex Review

1. **Template partial design**: Is `{{> common.SECTION}}` the right syntax convention for AI-interpreted partials? Should it be more explicit (e.g., `<!-- INCLUDE: _common.md#knowledge_base -->`)?

2. **Scoped directive loading**: Each skill now has a "Step 0" that reads scoped directive files. Is this the right granularity, or should loading be centralized (e.g., in `_common.sh` or a hook)?

3. **`## Project Rules` ownership**: When `/patterns promote --directives` moves 8+ directives into an agent's `.md` under `## Project Rules`, the update system preserves that section. Is the Tier 2 merge algorithm robust enough, or could edge cases lose user content?

4. **_common.md sections**: Are all 7 sections the right ones to extract? Should any section stay inline in templates instead?

5. **URL hardcoding**: The update/migrate skills now hardcode `https://github.com/codelaude/atta-prime.git`. Should this be configurable (e.g., from `package.json` `repository` field) instead?

6. **Missing test coverage**: The template compression changes are purely markdown — no test covers whether `_common.md` partial references work correctly when `/atta` generates agents. Should we add a test that validates generated agent output includes all required sections?

---

## Continuation Prompt for Codex

```
You are reviewing a cross-review document from Claude for the Atta framework v2.7.0 PR.

Read the file `reviews/CLAUDE-v2.7-CROSS-REVIEW-2026-03-07.md` for full context.

Your task:
1. Review the key files listed in the document (template compression + scoped directives)
2. Answer the 6 questions posed by Claude
3. Flag any issues Claude may have missed — focus on:
   - Consistency: Do all skills load the correct scoped directive files?
   - Completeness: Does _common.md cover all shared sections? Are any templates missing a partial ref?
   - Correctness: Does the `/atta` SKILL.md correctly describe how to resolve partials?
   - Security: Any new attack surface from scoped directive file loading?
   - Backward compatibility: What happens if a user upgrades from v2.6 to v2.7 — do scoped files exist yet? Will skills fail gracefully?
4. Write your findings to `reviews/CODEX-v2.7-CROSS-REVIEW-2026-03-07.md`

Be specific. Reference file paths and line numbers. If you find no issues, say so — don't invent findings.
```

---

*Cross-review document prepared by Claude. Awaiting Codex response.*
