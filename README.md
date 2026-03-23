<p align="center">
  <img src="https://raw.githubusercontent.com/codelaude/atta/main/atta.svg" alt="Atta" width="400">
  <br>
  <em>Named after the leafcutter ant genus, where colonies of specialists build together.</em>
</p>

Atta generates a team of specialist AI agents from your actual tech stack — then enforces quality through hooks, rules, and reviews. It works with any AI tool you already use, learns from your corrections over time, and keeps the human in the driver's seat.

- **Generated, not configured.** 100+ detectors scan your project and generate agents that know your stack — not generic templates you fill in yourself.
- **Works with your tool.** One detection pass, six native outputs. Claude Code, Copilot, Cursor, Codex, Gemini, and GitHub Actions CI.
- **Learns over time.** Corrections accumulate, patterns emerge, agents adapt. Session 50 is dramatically better than session 1.
- **Enforces, not suggests.** Hooks that block wrong models, destructive commands, and unreviewed PRs — not advice you can ignore.
- **Not a code generator.** Agents guide, review, and validate — they don't write your application. You remain the engineer.
- **Not a context dump.** More instructions don't mean better results — [research shows the opposite](https://arxiv.org/abs/2504.01281). Atta keeps its footprint minimal so your AI tool spends tokens on *your code*, not walls of rules.

See [Design Philosophy](https://github.com/codelaude/atta/blob/main/.atta/docs/philosophy.md) for the full story.

## Requirements

- **Node.js** >= 22.0.0
- **Unix/macOS** (or WSL on Windows) — shell scripts require bash
- **python3** — used by framework scripts for JSON processing
- One of: Claude Code, GitHub Copilot CLI, OpenAI Codex CLI, Google Gemini CLI, or Cursor
- For CI review: GitHub Actions + an AI provider secret (optional, via `--adapter github-action`)

## Getting Started

### Install

```bash
npx atta-dev init
```

Detects your stack, asks a few questions about your preferences, and configures everything for your AI tool. Or copy `.claude/` and `.atta/` manually and run `/atta`.

> **New here?** Run `/atta-tutorial` for a 5-minute guided walkthrough.

### Set up your profile

```
/atta-profile --update
```

Sets your collaboration style, review priorities, and response format. Agents adapt to your preferences across all sessions.

### Work

Ask any specialist for help — Atta routes to the right agent based on your stack:

```
/atta-agent <specialist>    Ask a question or request guidance
/atta-team-lead             Decompose a feature into specialist tasks
/atta-collaborate           Get 2-4 specialists working in parallel
```

### Review and ship

```
/atta-review                Review changed files (includes simplicity + security checks)
/atta-preflight             Full pre-PR pipeline: lint + security + test + review
/atta-ship                  Completion workflow — tests, KISS gate, validation, PR description
```

### Set up CI review (optional)

```bash
npx atta-dev init --adapter github-action
```

Generates a GitHub Actions workflow that reviews PRs using your project's detected conventions, path-scoped rules, and OWASP security scope. Supports Anthropic, AWS Bedrock, GCP Vertex, OpenAI, Azure OpenAI, and Ollama.

See [CI Review docs](https://github.com/codelaude/atta/blob/main/.atta/docs/ci-review.md) for setup and configuration.

## The Agent Hierarchy

Dynamically generated for your project:

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

## All Skills

| Command | What it does |
|---------|-------------|
| `/atta` | Interactive project setup — detects technologies, generates agents, configures MCPs |
| `/atta-update` | Safe framework updates — preserves all customizations |
| `/atta-migrate` | Migration from v2.x — frontmatter upgrades, skill renames, model registry |
| `/atta-agent <id>` | Invoke any specialist (e.g., `/atta-agent react`, `/atta-agent django`) |
| `/atta-team-lead` | Decompose a feature into specialist tasks |
| `/atta-collaborate` | 2-4 specialists in parallel with conflict detection |
| `/atta-review` | Code review with severity-rated findings and security checks |
| `/atta-security-audit` | OWASP Top 10 scan — vulnerabilities, secrets, dependencies |
| `/atta-test` | Run tests with auto-detection — `--e2e`, `--coverage`, `--watch` |
| `/atta-lint` | Pattern-based checks against project rules |
| `/atta-profile` | Developer preferences — collaboration style, review priorities, response format |
| `/atta-optimize` | Prompt optimization — rephrase in-session or enrich for cross-tool handoff |
| `/atta-preflight` | Full pre-PR pipeline: lint + security + test + review |
| `/atta-ship` | Completion workflow — tests, validation, PR description, learnings |
| `/atta-tutorial` | Interactive 5-minute onboarding walkthrough |
| `/atta-patterns` | Analyze corrections, suggest promotions, track agent adaptation |
| `/atta-librarian` | Capture a directive or extract learnings |

## Documentation

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

## Contributing

When changing framework source, run:

```bash
bash .atta/scripts/validate-framework.sh
```

---

*Built by [Codelaude](https://github.com/codelaude) with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). A colony of specialists, keeping the human in the driver's seat.*
