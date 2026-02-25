# Changelog

Full version history for the Atta framework.

---

## v2.6.0 (2026-02-25) — Enhanced Testing

E2E testing detection and specialist agents, PR template awareness, and a new `/test` skill.

- **PR template detection**: `/atta` now detects existing PR templates (GitHub, GitLab, Azure DevOps — 6 locations) and generates a mapped `pr-template.md` that aligns Atta's output with the project's template structure
- **E2E testing detection**: Enhanced `frontend-detectors.yaml` with Puppeteer, Selenium, WebdriverIO detection; enriched Cypress/Playwright with config variants and directory detection; all E2E entries trigger specialist generation via `triggers_e2e_specialist: true`
- **E2E specialist agent**: New `e2e-testing-specialist.template.md` covering page object patterns, selector strategy (test IDs > ARIA > semantic > text), flakiness prevention, CI/CD integration; 5 framework-specific mappings in `agent-mappings.yaml` with tailored rules and anti-patterns
- **`/test` skill**: New framework-level skill with auto-detection (7 unit + 5 E2E frameworks), `--e2e` flag, `--coverage` flag with per-category analysis, `--watch` flag for interactive mode; integrated with `/preflight`
- **E2E testing patterns**: New `e2e-testing-patterns.template.md` with 10 anti-patterns, 7 flakiness causes, test organization structure, coverage guidelines, framework-specific doc links
- **15 skills** (up from 14): `/test` added

---

## v2.5.4 — Pre-v2.6 Cleanup

Code deduplication, script performance, docs refresh, `/ship` skill, and pre-publish fixes.

- **Code deduplication**: Extracted `readVersion()` + `countFiles()` to shared `src/lib/fs-utils.js`, extracted `extract_claude_dir()` to shared `.claude/scripts/lib/_common.sh` — eliminated ~120 lines of duplication
- **Script performance**: Rewrote `pattern-analyze.sh` with single-pass accumulation (6→1 event passes, 11→5 sorts)
- **`/ship` skill**: New completion workflow — runs tests, validates ACCs, generates PR description from template, captures learnings. Suggested by `/preflight` on all-pass.
- **PR workflow**: PR descriptions now written to `{claudeDir}/knowledge/PR/` (previously `knowledge/sessions/`), new `pr-template.md` with standardized 4-section format
- **Docs refresh**: `session-tracking.md` rewritten for hooks-based architecture (v2.5.3), metadata docs version-bumped
- **Pre-publish fixes**: `schema.json` `$id` URL fixed, `generate-context.sh` Python subprocesses merged, root `CHANGELOG.md` symlink added, hooks + shared lib added to npm package files
- **14 skills** (up from 13): `/ship` added

---

## v2.5.3 — Context Diet Pass 2 + Session Tracking Hooks

Moves session tracking from in-skill boilerplate to Claude Code hooks, and compresses the remaining large SKILL.md files.

- **Session tracking hooks**: New `session-track.sh` hook handles all session lifecycle via Claude Code's `PostToolUse` (on Skill) and `Stop` events — replaced ~50 lines of Block A/B/C boilerplate in each of 11 skills
- **Hook-based architecture**: `src/adapters/claude-code.js` generates hook configuration in `settings.local.json`, copies `.claude/hooks/` directory during init
- **Context diet (remaining skills)**: `/update` 777→249 lines (-68%), `/patterns` 462→164 (-64%), `/preflight` 352→197 (-44%), `/review` 373→256 (-31%), `/security-audit` 373→267 (-28%), `collaboration-finding.md` 105→48 (-54%)
- **Additional skill compression**: `/agent` 201→97 (-52%), `/team-lead` 150→60 (-60%), `/lint` 226→141 (-38%), `/tutorial` 412→331 (-20%)
- **Session tracking docs**: `TRACKING_GUIDE.md` 197→79 lines, `SKILL_TEMPLATE.md` 193→40 lines — rewritten for hooks-first approach
- **v2.5.1 triage**: Session tracking gaps closed (hooks auto-track all skills), schema/docs items verified as already done, performance/dedup/misc deferred to v2.6
- **Net reduction**: ~1,881 lines removed

---

## v2.5.2 — Context Diet

Reduces context window footprint of SKILL.md files and agent definitions.

- **`/collaborate` SKILL.md**: 653 → 261 lines (60% reduction) — removed verbose output templates, compressed error handling, trimmed redundant mode descriptions
- **`/atta` SKILL.md**: 907 → 325 lines (64% reduction) — consolidated MCP warnings, compressed file manifest examples, removed interview rationale, compacted report templates and error handling
- **Core agent definitions**: 367 → 279 lines (24% reduction across 7 agents) — removed "Framing:" personality lines, verbose Developer Preferences, redundant Knowledge Base sections
- **`recent.md` opt-in**: No longer auto-injected into agent context; read only when user requests session continuity
- **Legacy agents removed**: Deleted `.claude/agents/legacy/` directory (8 files, v1.0 reference agents never loaded by system) and all references
- **Cross-AI review**: Claude → Codex cross-review caught 4 issues (rescan data gap, agent path ambiguity, skip-synthesis contract, manifest compression) — all fixed
- **Net reduction**: ~1,060 lines removed across 10+ files

---

## v2.5.1 — OSS Readiness

Security hardening, community files, and npm packaging improvements from 3-way cross-review audit (Claude + Codex + Copilot).

- **Community files**: LICENSE (MIT), CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, issue/PR templates
- **Security hardening**: `sys.argv[]` for data passing in all shell scripts (no interpolation), path containment with `pwd -P` resolution (fixes absolute-path and symlink bypasses), UUID-based correction IDs
- **npm packaging**: `.npmignore` defense-in-depth, `exports` field for ESM, specific script files in `files` (excludes `validate-framework.sh`), `recent.md` excluded from package
- **Robustness**: Atomic file writes in JS adapters, `unhandledRejection` handler in CLI entry point, python3/Ruby fallbacks in validation
- **Claude Code adapter**: Generate `CLAUDE.md` instruction file (parity with Copilot/Codex `AGENTS.md` and Gemini `GEMINI.md`)
- **Bug fix**: Escaped backticks in `generate-context.sh` inline Python (shell command substitution)

---

## v2.5.0 (2026-02-23) — Pattern Detection & Agent Learning

- **Pattern detection foundation**: Append-only correction log (`corrections.jsonl`), aggregation engine (`pattern-analyze.sh`), and `/patterns` skill with 7 subcommands (log, learn, suggest, promote, status, agent, dashboard)
- **Correction capture pipeline**: Librarian agent captures user corrections, review and collaborate skills auto-log CRITICAL/HIGH findings, manual logging via `/patterns log`
- **Pattern lifecycle**: Corrections accumulate → thresholds trigger readiness → `/patterns suggest` proposes promotion → `/patterns promote` writes to pattern files or directives
- **Agent adaptation (Track 6)**: Per-agent outcome tracking (`accepted`/`rejected`), acceptance rates, learned preferences with confidence levels (low/medium/high), learning profiles injected into agent context
- **Learning dashboard (Track 7)**: `/patterns dashboard` with correction velocity (7d vs prior 7d), per-agent acceptance rate trends (7d vs 30d), aging patterns (ready but not promoted 7+ days), and 5 recommendation types (promote-stale, domain-cluster, velocity-spike, agent-improving, agent-declining)
- **Schema v1.1.0**: Aggregation output files now include `trends` and `recommendations` fields
- **Validation**: 51 framework assertions (up from 26 in v2.4.3), covering pattern detection, agent adaptation, and learning dashboard
- Backward-compatible: old corrections without `outcome`/`agentId` treated as neutral, no migration needed

## v2.4.3 — Distribution Sprint

- npm package infrastructure (`npx atta-dev init`) with CLI, interactive setup, and developer profile generation
- Cross-tool adapter pattern: Claude Code, GitHub Copilot CLI, OpenAI Codex CLI, Google Gemini CLI
- Capability matrix (YAML + JSON Schema) mapping features across 6 AI tools with 3-tier degradation
- Automated check suite: 6 scripts (5 core + 1 optional) validating adapter outputs and schema
- Gemini CLI adapter: TOML command generation from SKILL.md, extension manifest, context file
- Cross-AI review: 12 findings identified and resolved across Claude, Codex (GPT-5), and GitHub Copilot
- Agent developer preferences: agents read developer profile generated during install

## v2.4.2 — Rename & Version Cleanup

- Renamed `/init` skill to `/atta` to avoid collision with Claude Code built-in `/init`
- Removed cosmetic version numbers from skill footers and doc headers
- Version now lives only in `.metadata/version`, `.metadata/framework-version`, and changelog

## v2.4.1 — Session Tracking Expansion

- Session tracking expanded from 2 skills to 9 of 12 skills (excludes /atta, /update, /migrate)
- Standardized three-block pattern: init → agent tracking → finalization
- Agent tracking for skills that invoke agents (agent, team-lead, review, security-audit, preflight)
- DIR-022 compliance: error handling sections explicitly mention session finalization
- Updated session-tracking.md with full skill coverage table

## v2.4 (2026-02-19) — Multi-Agent Collaboration

- `/collaborate` skill — invoke 2-4 specialist agents in parallel with synthesized output
- Three collaboration modes: `review` (code review), `feedback` (architecture), `decision` (option analysis)
- Auto-routing engine: file extensions and content patterns determine which specialists to invoke
- Three-layer conflict detection: agent self-reporting, location-based, severity disagreement
- Normalized finding schema — standardized agent output format for automated synthesis
- `/review` now suggests `/collaborate` when review scope spans multiple domains
- Session schema extended with collaboration metadata (mode, agents, findings, conflicts, verdict)
- Cross-platform portable: finding schema works across Claude Code, Codex, and Copilot

## v2.3 (2026-02-17) — Security Sprint

- Security specialist agent template with OWASP Top 10 (2025) knowledge base
- `/security-audit` skill — full security scan (vulnerabilities, secrets, dependencies)
- Security detection rules for 15+ security tools (Snyk, Dependabot, Semgrep, Gitleaks, etc.)
- Security patterns template with framework-specific guidance (Vue, React, Django, Express, Spring, FastAPI)
- `/review` now includes security checks (hardcoded secrets, injection, XSS, auth)
- `/preflight` adds security scan step — critical security issues block PRs
- Updated to OWASP Top 10 2025 (new: Software Supply Chain Failures, Mishandling Exceptional Conditions)

## v2.2 (2026-02-17) — Tutorial, Session Tracking & Quality Pass

- `/tutorial` skill — interactive 5-minute onboarding with 3 steps + quick reference card
- Session tracking infrastructure for skill executions (JSON schema v1.0.0, auto-cleanup)
- Recent work context — agents (Project Owner) read last 5 session summaries for continuity
- Error handling & recovery sections for `/review`, `/preflight`, `/atta`, `/lint`, `/agent`
- 20 new bootstrap templates (15 pattern templates, 4 skill templates, 1 agent template)
- Comprehensive bug fixes across bootstrap pipeline, mappings, scripts, and documentation
- macOS compatibility fix for session cleanup script
- Developed using dogfooding (framework building itself)

## v2.1 (2026-02-16) — Update System

- `/update` skill for safe framework updates
- File tracking system with smart merge
- Preserves all customizations during updates
- Update history and rollback support
- Opt-in for existing v2.0 projects via `/migrate --add-update-system`

## v2.0 (2026-02-14) — Bootstrap System

- Universal tech stack support (100+ detectors)
- Dynamic agent generation from templates
- MCP integration with smart recommendations
- Full backend support (Django, Spring Boot, Go, Rust, etc.)
- Configuration-driven extensibility

## v1.0 — Multi-Agent Foundation

- 14 hardcoded agents for Vue/TypeScript/SCSS
- Pattern file generation
- Agent hierarchy and routing
- Skills system (slash commands)
- Librarian and persistent memory

---

## By the Numbers (v2.6.0)

- **100+ Technology Detectors** across frontend, backend, databases, security tools
- **10 Universal Agent Templates** that generate project-specific specialists (+ E2E specialist)
- **5 Detection Rule Files** covering frontend, backend, databases, tools, and security
- **21+ Pattern File Templates** for different tech stacks (+ E2E testing patterns)
- **15 Skills** (slash commands), `/patterns` with 7 subcommands, `/test` with 4 flags
- **3-Tier Agent Architecture** (7 core + 2 coordinators + N specialists)
- **51 Framework Validation Assertions** (pattern detection, agent adaptation, learning dashboard)
- **100% Configuration-Driven** — add new tech via YAML, no code changes

---

*See the [main README](../../README.md) for quick start, or [Design Philosophy](philosophy.md) for the why behind the system.*
