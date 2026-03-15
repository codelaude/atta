<p align="center">
  <img src="https://raw.githubusercontent.com/codelaude/atta/main/atta.svg" alt="Atta" width="400">
  <br>
  <em>Named after the leafcutter ant genus, where colonies of specialists build together.</em>
</p>

A multi-agent system for AI-assisted development that guides, reviews, and validates your work — instead of writing code for you. Supports any tech stack: React, Next.js, Angular, Python/Django, Java/Spring Boot, Go, Rust, and [100+ more](https://github.com/codelaude/atta/blob/main/.atta/docs/bootstrap-system.md).

## Requirements

- **Node.js** >= 22.0.0
- **Unix/macOS** (or WSL on Windows) — shell scripts require bash
- **python3** — used by framework scripts for JSON processing
- One of: Claude Code, GitHub Copilot CLI, OpenAI Codex CLI, Google Gemini CLI, or Cursor
- For CI review: GitHub Actions + an AI provider secret (optional, via `--adapter github-action` — supports Anthropic, AWS Bedrock, GCP Vertex, OpenAI, Azure OpenAI, and Ollama)

## Quick Start

### 1. Set up

**Option A — npm (recommended):**

```bash
npx atta-dev init
```

Installs the framework, asks a few questions, and configures everything for your AI tool (Claude Code, Copilot CLI, Codex CLI, Gemini CLI, or Cursor).

**Option B — manual:**

Copy both the `.claude/` and `.atta/` directories into your project root, then run `/atta`:

```
/atta
```

The interactive setup interviews you about your project, auto-detects your tech stack, generates specialist agents and pattern files, and optionally configures MCP servers.

> **New here?** Run `/atta-tutorial` for a 5-minute guided walkthrough before diving in.

### 2. Start working

```
/atta-agent fe-team-lead    Build a searchable dropdown component
/atta-agent react           How should I structure props for this?
/atta-agent accessibility   Check keyboard navigation
/atta-agent be-team-lead    Design REST API for user management
/atta-agent architect       Design the auth module architecture
/atta-review                Review my changed files
/atta-preflight             Run full pre-PR validation
/atta-ship                  Generate PR description and finalize
```

## Skills (Slash Commands)

| Command | What it does |
|---------|-------------|
| `/atta` | Interactive project setup — detects 100+ technologies, generates agents, configures MCPs |
| `/atta-update` | Safe framework updates — auto-selects upgrade/migration mode from metadata |
| `/atta-migrate` | Migration skill — agent frontmatter upgrades, skill renames, model registry |
| `/atta-agent <id>` | Invoke any specialist (e.g., `/atta-agent react`, `/atta-agent django`) |
| `/atta-team-lead` | Decompose a feature into specialist tasks |
| `/atta-collaborate` | Multi-agent collaboration — 2-4 specialists in parallel with conflict detection |
| `/atta-review` | Multi-domain code review with severity-rated findings (includes security) |
| `/atta-security-audit` | OWASP Top 10 security scan — vulnerabilities, secrets, dependencies |
| `/atta-test` | Run tests with auto-detection — `--e2e`, `--coverage`, `--watch` flags |
| `/atta-lint` | Pattern-based checks against project rules |
| `/atta-profile` | View/update developer preferences — collaboration style, review priorities, response format |
| `/atta-optimize` | Optimize prompts for better results — rephrase in-session or enrich for cross-tool handoff |
| `/atta-preflight` | Full pre-PR pipeline: lint + security + test + review |
| `/atta-ship` | Completion workflow — tests, ACC validation, PR description, learnings |
| `/atta-tutorial` | Interactive 5-minute onboarding walkthrough |
| `/atta-patterns` | Pattern detection and learning — analyze corrections, suggest promotions, track agent adaptation |
| `/atta-librarian` | Capture a directive or extract learnings |

## What Atta Is Not

- **Not a code generator.** Agents guide, review, and validate — they don't write your application. You remain the engineer.
- **Not a project scaffolder.** It doesn't turn a prompt into a working app. It works alongside your codebase, learning its conventions.
- **Not a context dump.** More instructions don't mean better results — [research shows the opposite](https://arxiv.org/abs/2504.01281). Atta keeps its footprint minimal so your AI tool spends tokens on *your code*, not reading walls of rules.
- **Not unpredictable.** Every agent has hard constraints on what it does *and refuses to do*. A developer profile sets your collaboration style and priorities. The system learns from corrections, but nothing changes without your approval.
- **Not a one-shot tool.** Day one, you get the bare minimum — tech detection, agents, pattern files. Over time, corrections accumulate, directives grow, agents adapt to your feedback. Session 50 is dramatically better than session 1 — because the context is *yours*.

See [Design Philosophy](https://github.com/codelaude/atta/blob/main/.atta/docs/philosophy.md) for the full story on how the system grows with you.

## How It Works

An agent hierarchy, dynamically generated for your project:

```
Core Agents (always installed)
├── Project Owner       Routes tasks to the right specialist
├── Code Reviewer       Quality review across all domains
├── Librarian           Persistent memory and directives
└── Architect           System design, ADRs, and implementation blueprints

Optional Agents (selected during init)
├── Business Analyst    Requirements analysis
├── QA Validator        Acceptance criteria validation
├── PR Manager          PR descriptions
└── Rubber Duck         Guided learning (asks questions, not answers)

Coordinators (generated per project)
├── FE Team Lead        Coordinates frontend specialists
└── BE Team Lead        Coordinates backend specialists

Specialists (generated from your tech stack)
├── Framework           React, Next.js, Angular, Django, Spring Boot, ...
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
- **Multi-Agent Collaboration** — `/atta-collaborate` invokes 2-4 specialists in parallel with three-layer conflict detection.
- **Security Built In** — OWASP Top 10 (2025), `/atta-security-audit`, and security checks in `/atta-review` and `/atta-preflight`.
- **Enforcement Infrastructure** — Path-scoped coding rules generated per adapter format, data-driven hooks (lint-on-edit, pre-bash safety), model targeting via registry, rules-aware CI review.
- **Cross-Tool Support** — 6 adapters (Claude Code, Copilot, Codex, Gemini, Cursor, GitHub Action CI) with graceful degradation. All skills namespaced `atta-*` to prevent collisions.
- **MCP Integration** — Smart recommendations based on detected stack (docs, database, browser MCPs).
- **Developer Profile** — Set your working preferences once; agents adapt to your collaboration style, review priorities, and response format.
- **Guided Learning** — Rubber Duck teaches by asking questions. Librarian captures rules that persist across sessions.
- **Pattern Detection** — Learns from corrections, tracks per-agent acceptance rates, promotes patterns with your approval.
- **Safe Updates** — Smart merge preserves all customizations during framework updates.

## Documentation

Start here, then dive deeper:

| Doc | What you'll learn |
|-----|-------------------|
| **[Bootstrap System](https://github.com/codelaude/atta/blob/main/.atta/docs/bootstrap-system.md)** | How tech detection and agent generation works |
| **[Multi-Agent Collaboration](https://github.com/codelaude/atta/blob/main/.atta/docs/collaboration.md)** | How `/atta-collaborate` works — modes, conflict detection, finding schema |
| **[MCP Setup Guide](https://github.com/codelaude/atta/blob/main/.atta/docs/mcp-setup.md)** | Configure Model Context Protocol servers |
| **[Session Tracking](https://github.com/codelaude/atta/blob/main/.atta/docs/session-tracking.md)** | What's tracked, privacy, retention policy |
| **[Developer Profile](https://github.com/codelaude/atta/blob/main/.atta/docs/profile.md)** | How `/atta-profile` works — modes, preferences, propagation |
| **[Prompt Optimizer](https://github.com/codelaude/atta/blob/main/.atta/docs/optimize.md)** | How `/atta-optimize` works — cross-tool context enrichment |
| **[Extending the System](https://github.com/codelaude/atta/blob/main/.atta/docs/extending.md)** | Add new technologies and custom agents via YAML |
| **[Path-Scoped Rules](https://github.com/codelaude/atta/blob/main/.atta/docs/rules.md)** | How coding rules are generated and formatted per adapter |
| **[Model Targeting](https://github.com/codelaude/atta/blob/main/.atta/docs/model-targeting.md)** | Tier system, model registry, cost optimization |
| **[Migration Guide](https://github.com/codelaude/atta/blob/main/.atta/docs/migration.md)** | Upgrading from v2.x to v3.0 |
| **[Updating](https://github.com/codelaude/atta/blob/main/.atta/docs/updating.md)** | How to update without losing customizations |
| **[Token Usage & Cost](https://github.com/codelaude/atta/blob/main/.atta/docs/token-usage.md)** | Estimated tokens and cost per skill, model tier breakdown |
| **[Design Philosophy](https://github.com/codelaude/atta/blob/main/.atta/docs/philosophy.md)** | Why this exists, core principles, how the system grows |
| **[CI Review](https://github.com/codelaude/atta/blob/main/.atta/docs/ci-review.md)** | GitHub Action CI adapter — setup, multi-provider auth, suppression workflow |
| **[Changelog](https://github.com/codelaude/atta/blob/main/.atta/docs/changelog.md)** | Full version history |

## Framework Contributor Checks

When changing framework source, run:

```bash
bash .atta/scripts/validate-framework.sh
```

This validates bootstrap YAML syntax, security-critical documentation patterns, and `git diff --check` hygiene in one pass.

---

*Built by [Codelaude](https://github.com/codelaude) with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). A colony of specialists, keeping the human in the driver's seat.*
