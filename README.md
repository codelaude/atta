<p align="center">
  <img src="atta.svg" alt="Atta" width="400">
  <br>
  <em>Named after the leafcutter ant genus, where colonies of specialists build together.</em>
</p>

A multi-agent system for AI-assisted development that guides, reviews, and validates your work — instead of writing code for you. Supports any tech stack: Vue, React, Angular, Python/Django, Java/Spring Boot, Go, Rust, and [100+ more](.claude/docs/bootstrap-system.md).

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
```

## Keeping Up to Date

Do **not** manually copy a new `.claude/` folder on top of your existing one — that will overwrite your customizations. Use the update system instead:

```bash
# 1. Clone latest framework into staging
git clone --depth 1 <framework-repo-url> .claude_staging

# 2. Preview, dry-run, then apply
/update check   --from ./.claude_staging/.claude
/update pull --dry-run --from ./.claude_staging/.claude
/update pull     --from ./.claude_staging/.claude

# 3. Clean up
rm -rf .claude_staging
```

`/update` automatically chooses the right mode:
- **Upgrade mode** (default) when update tracking metadata exists
- **Migration-bootstrap mode** when `.claude/.metadata/file-manifest.json` is missing
- **Migration mode** for structural transitions only when explicitly requested with `--mode migration`

All your customizations (pattern files, agent tweaks, project context) are preserved.

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
| `/lint` | Pattern-based checks against project rules |
| `/preflight` | Full pre-PR pipeline: lint + security + test + review |
| `/tutorial` | Interactive 5-minute onboarding walkthrough |
| `/librarian` | Capture a directive or extract learnings |

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
└── Testing             Jest, pytest, JUnit, Playwright, ...
```

Every agent has constraints — what it does **and what it doesn't do**. The project owner routes but never reads code. The team lead coordinates but never implements. Constraints are what make specialization real instead of just a label.

## Key Features

### Universal Bootstrap System
Supports 100+ technologies across frontend, backend, databases, and tools. Detects your stack, generates project-specific agents, and configures pattern files — all driven by YAML configuration, no code changes required.

### Multi-Agent Collaboration
`/collaborate` invokes 2-4 specialist agents in parallel on the same code. Three-layer conflict detection catches when agents disagree. Three modes: code review, architecture feedback, and decision analysis.

### Security Built In
OWASP Top 10 (2025) security specialist, `/security-audit` for deep scans, and security checks integrated into `/review` and `/preflight`. Critical security issues block PRs automatically.

### MCP Integration
Smart recommendations based on detected stack — documentation MCP for version-specific framework docs, database MCP for schema inspection, browser MCP for accessibility testing.

### Guided Learning
Rubber Duck agent teaches by asking questions. Librarian captures project-specific rules that persist across sessions. Pattern files encode best practices that evolve with your project.

### Safe Updates
File tracking with smart merge preserves all your customizations during framework updates. Three-tier classification: safe to replace, merge required, never touch.

## Token Usage & Cost

Skills load their instructions into the conversation context. Heavier skills cost more tokens, but the expensive ones are one-time setup — daily skills are lightweight.

**Estimated tokens per invocation** (input + output, all turns):

| Skill | Frequency | Est. Input | Est. Output | Sonnet Cost | Opus Cost |
|-------|-----------|-----------|------------|-------------|-----------|
| `/atta` | Once per project | ~50-70K | ~15-25K | ~$0.40-0.60 | ~$2-3 |
| `/tutorial` | Once per user | ~15-20K | ~3-5K | ~$0.10-0.15 | ~$0.50-0.70 |
| `/collaborate` | Occasional | ~30-50K | ~10-15K | ~$0.30-0.50 | ~$1.50-2.50 |
| `/review` | Frequent | ~10-15K | ~3-5K | ~$0.08-0.12 | ~$0.35-0.50 |
| `/preflight` | Frequent | ~12-18K | ~5-8K | ~$0.10-0.18 | ~$0.50-0.80 |
| `/agent` | Frequent | ~5-10K | ~2-4K | ~$0.04-0.08 | ~$0.15-0.35 |
| `/lint` | Frequent | ~5-8K | ~2-3K | ~$0.03-0.06 | ~$0.12-0.25 |

> Estimates based on typical usage. Actual costs depend on codebase size, number of files reviewed, and conversation length. Subscription plans (Claude Pro/Max) count against usage budgets rather than per-token billing.

**Key takeaway:** Setup (`/atta`) is the most expensive invocation but only runs once. Daily skills (`/review`, `/lint`, `/agent`) are 5-10x cheaper.

## Documentation

Start here, then dive deeper:

| Doc | What you'll learn |
|-----|-------------------|
| **[Bootstrap System](/.claude/docs/bootstrap-system.md)** | How tech detection and agent generation works |
| **[Multi-Agent Collaboration](/.claude/docs/collaboration.md)** | How `/collaborate` works — modes, conflict detection, finding schema |
| **[MCP Setup Guide](/.claude/docs/mcp-setup.md)** | Configure Model Context Protocol servers |
| **[Session Tracking](/.claude/docs/session-tracking.md)** | What's tracked, privacy, retention policy |
| **[Extending the System](/.claude/docs/extending.md)** | Add new technologies and custom agents via YAML |
| **[Design Philosophy](/.claude/docs/philosophy.md)** | Why this exists, core principles, architecture decisions |
| **[Changelog](/.claude/docs/changelog.md)** | Full version history |

## Framework Contributor Checks

When changing framework source under `.claude/`, run:

```bash
bash .claude/scripts/validate-framework.sh
```

This validates bootstrap YAML syntax, security-critical documentation patterns, and `git diff --check` hygiene in one pass.

---

*Built by [Codelaude](https://github.com/codelaude) with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). A colony of specialists, keeping the human in the driver's seat.*
