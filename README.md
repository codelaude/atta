<p align="center">
  <img src="atta.svg" alt="Atta" width="400">
  <br>
  <em>Named after the leafcutter ant genus, where colonies of specialists build together.</em>
</p>

A multi-agent system for AI-assisted development that guides, reviews, and validates your work — instead of writing code for you. Supports any tech stack: Vue, React, Angular, Python/Django, Java/Spring Boot, Go, Rust, and [100+ more](.claude/docs/bootstrap-system.md).

## Requirements

- **Node.js** >= 18.0.0
- **Unix/macOS** (or WSL on Windows) — shell scripts require bash
- **python3** — used by framework scripts for JSON processing
- One of: Claude Code, GitHub Copilot CLI, OpenAI Codex CLI, or Google Gemini CLI

## Quick Start

### 1. Set up

**Option A — npm (recommended):**

```bash
npx atta-dev init
```

Installs the framework, asks a few questions, and configures everything for your AI tool (Claude Code, Copilot CLI, Codex CLI, or Gemini CLI).

**Option B — manual:**

Copy the `.claude/` directory into your project root, then run `/atta`:

```
/atta
```

The interactive setup interviews you about your project, auto-detects your tech stack, generates specialist agents and pattern files, and optionally configures MCP servers.

> **New here?** Run `/tutorial` for a 5-minute guided walkthrough before diving in.

### 2. Start working

```
/agent fe-team-lead    Build a searchable dropdown component
/agent vue             How should I structure props for this?
/agent accessibility   Check keyboard navigation
/agent be-team-lead    Design REST API for user management
/agent rubber-duck     Help me understand focus management
/review                Review my changed files
/preflight             Run full pre-PR validation
/ship                  Generate PR description and finalize
```

## Skills (Slash Commands)

| Command | What it does |
|---------|-------------|
| `/atta` | Interactive project setup — detects 100+ technologies, generates agents, configures MCPs |
| `/update` | Safe framework updates — auto-selects upgrade/migration mode from metadata |
| `/migrate` | Compatibility alias for `/update --mode migration` |
| `/agent <id>` | Invoke any specialist (e.g., `/agent vue`, `/agent django`) |
| `/team-lead` | Decompose a feature into specialist tasks |
| `/collaborate` | Multi-agent collaboration — 2-4 specialists in parallel with conflict detection |
| `/review` | Multi-domain code review with severity-rated findings (includes security) |
| `/security-audit` | OWASP Top 10 security scan — vulnerabilities, secrets, dependencies |
| `/test` | Run tests with auto-detection — `--e2e`, `--coverage`, `--watch` flags |
| `/lint` | Pattern-based checks against project rules |
| `/profile` | View/update developer preferences — collaboration style, review priorities, response format |
| `/optimize` | Optimize prompts for better results — rephrase in-session or enrich for cross-tool handoff |
| `/preflight` | Full pre-PR pipeline: lint + security + test + review |
| `/ship` | Completion workflow — tests, ACC validation, PR description, learnings |
| `/tutorial` | Interactive 5-minute onboarding walkthrough |
| `/patterns` | Pattern detection and learning — analyze corrections, suggest promotions, track agent adaptation |
| `/librarian` | Capture a directive or extract learnings |

## What Atta Is Not

- **Not a code generator.** Agents guide, review, and validate — they don't write your application. You remain the engineer.
- **Not a project scaffolder.** It doesn't turn a prompt into a working app. It works alongside your codebase, learning its conventions.
- **Not a context dump.** More instructions don't mean better results — [research shows the opposite](https://arxiv.org/abs/2504.01281). Atta keeps its footprint minimal so your AI tool spends tokens on *your code*, not reading walls of rules.
- **Not unpredictable.** Every agent has hard constraints on what it does *and refuses to do*. A developer profile sets your collaboration style and priorities. The system learns from corrections, but nothing changes without your approval.
- **Not a one-shot tool.** Day one, you get the bare minimum — tech detection, agents, pattern files. Over time, corrections accumulate, directives grow, agents adapt to your feedback. Session 50 is dramatically better than session 1 — because the context is *yours*.

See [Design Philosophy](.claude/docs/philosophy.md) for the full story on how the system grows with you.

## How It Works

A three-tier agent hierarchy, dynamically generated for your project:

```
Core Agents (universal, always present)
├── Project Owner       Routes tasks to the right specialist
├── Code Reviewer       Quality review across all domains
├── Librarian           Persistent memory and directives
├── Rubber Duck         Guided learning (asks questions, not answers)
├── QA Validator        Acceptance criteria validation
├── Business Analyst    Requirements analysis
└── PR Manager          PR descriptions

Coordinators (generated per project)
├── FE Team Lead        Coordinates frontend specialists
└── BE Team Lead        Coordinates backend specialists

Specialists (generated from your tech stack)
├── Framework           Vue, React, Angular, Django, Spring Boot, ...
├── Language            TypeScript, Python, Java, Go, Rust, ...
├── Styling             SCSS, Tailwind, CSS-in-JS, ...
├── Database            PostgreSQL, MongoDB, Redis, ...
├── Accessibility       WCAG/ARIA compliance
├── Security            OWASP Top 10, secrets, injections
├── Testing             Jest, pytest, JUnit, Vitest, ...
└── E2E Testing         Cypress, Playwright, Puppeteer, Selenium, WebdriverIO
```

Every agent has constraints — what it does **and what it doesn't do**. Constraints are what make specialization real instead of just a label.

## Key Features

- **Universal Bootstrap** — 100+ technologies detected, plus architectural patterns (structure, components, routing, API, state). Generates project-specific agents and pattern files from YAML configuration. Staleness detection warns when project has drifted since last scan.
- **Multi-Agent Collaboration** — `/collaborate` invokes 2-4 specialists in parallel with three-layer conflict detection.
- **Security Built In** — OWASP Top 10 (2025), `/security-audit`, and security checks in `/review` and `/preflight`.
- **MCP Integration** — Smart recommendations based on detected stack (docs, database, browser MCPs).
- **Developer Profile** — Set your working preferences once; agents adapt to your collaboration style, review priorities, and response format.
- **Guided Learning** — Rubber Duck teaches by asking questions. Librarian captures rules that persist across sessions.
- **Pattern Detection** — Learns from corrections, tracks per-agent acceptance rates, promotes patterns with your approval.
- **Safe Updates** — Smart merge preserves all customizations during framework updates.

## Documentation

Start here, then dive deeper:

| Doc | What you'll learn |
|-----|-------------------|
| **[Bootstrap System](/.claude/docs/bootstrap-system.md)** | How tech detection and agent generation works |
| **[Multi-Agent Collaboration](/.claude/docs/collaboration.md)** | How `/collaborate` works — modes, conflict detection, finding schema |
| **[MCP Setup Guide](/.claude/docs/mcp-setup.md)** | Configure Model Context Protocol servers |
| **[Session Tracking](/.claude/docs/session-tracking.md)** | What's tracked, privacy, retention policy |
| **[Developer Profile](/.claude/docs/profile.md)** | How `/profile` works — modes, preferences, propagation |
| **[Prompt Optimizer](/.claude/docs/optimize.md)** | How `/optimize` works — cross-tool context enrichment |
| **[Extending the System](/.claude/docs/extending.md)** | Add new technologies and custom agents via YAML |
| **[Updating](/.claude/docs/updating.md)** | How to update without losing customizations |
| **[Token Usage & Cost](/.claude/docs/token-usage.md)** | Estimated tokens and cost per skill |
| **[Design Philosophy](/.claude/docs/philosophy.md)** | Why this exists, core principles, how the system grows |
| **[Changelog](/.claude/docs/changelog.md)** | Full version history |

## Framework Contributor Checks

When changing framework source under `.claude/`, run:

```bash
bash .claude/scripts/validate-framework.sh
```

This validates bootstrap YAML syntax, security-critical documentation patterns, and `git diff --check` hygiene in one pass.

---

*Built by [Codelaude](https://github.com/codelaude) with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). A colony of specialists, keeping the human in the driver's seat.*
