# Changelog

Full version history for the Atta framework.

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

## v2.4.3 (2026-02-22) — Distribution Sprint

- npm package infrastructure (`npx atta-dev init`) with CLI, interactive setup, and developer profile generation
- Cross-tool adapter pattern: Claude Code, GitHub Copilot CLI, OpenAI Codex CLI, Google Gemini CLI
- Capability matrix (YAML + JSON Schema) mapping features across 6 AI tools with 3-tier degradation
- Automated check suite: 6 scripts (5 core + 1 optional) validating adapter outputs and schema
- Gemini CLI adapter: TOML command generation from SKILL.md, extension manifest, context file
- Cross-AI review: 12 findings identified and resolved across Claude, Codex (GPT-5), and GitHub Copilot
- Agent developer preferences: agents read developer profile generated during install

## v2.4.2 (2026-02-22) — Rename & Version Cleanup

- Renamed `/init` skill to `/atta` to avoid collision with Claude Code built-in `/init`
- Removed cosmetic version numbers from skill footers and doc headers
- Version now lives only in `.metadata/version`, `.metadata/framework-version`, and changelog

## v2.4.1 (2026-02-20) — Session Tracking Expansion

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

## By the Numbers (v2.5.0)

- **100+ Technology Detectors** across frontend, backend, databases, security tools
- **9 Universal Agent Templates** that generate project-specific specialists
- **5 Detection Rule Files** covering frontend, backend, databases, tools, and security
- **20+ Pattern File Templates** for different tech stacks
- **13 Skills** (slash commands), `/patterns` with 7 subcommands
- **3-Tier Agent Architecture** (7 core + 2 coordinators + N specialists)
- **51 Framework Validation Assertions** (pattern detection, agent adaptation, learning dashboard)
- **100% Configuration-Driven** — add new tech via YAML, no code changes

---

*See the [main README](../../README.md) for quick start, or [Design Philosophy](philosophy.md) for the why behind the system.*
