# AI Dev Team Agent v2

A multi-agent system for AI-assisted development that guides, reviews, and validates your work — instead of writing code for you.

Drop the `.claude/` folder into **any project** (Vue, React, Python/Django, Java/Spring Boot, Go, Rust, or anything else), run `/init`, and get a virtual development team dynamically generated for your specific tech stack.

**New in v2.3:** Security Sprint — OWASP Top 10 (2025) security specialist agent, `/security-audit` skill, security-integrated `/review` and `/preflight`, security detection rules, and security pattern templates.

**New in v2.2:** Interactive `/tutorial` onboarding, session tracking, recent work context for agents, and error handling for skills. Foundation for v2.5+ intelligence capabilities.

**New in v2.1:** Update system with file tracking and smart merge. Pull framework updates safely while preserving all your customizations.

**New in v2.0:** Universal Bootstrap System with 100+ technology detectors, dynamic agent generation from templates, MCP (Model Context Protocol) integration, and full backend support.

## The Problem

Most AI coding tools operate as a single general-purpose assistant. You get fast output but lose understanding. The AI generates code you can't explain in review, tests that validate their own hallucinations, and patterns that drift from your project's conventions every new conversation.

This system takes a different approach: **a team of specialized agents with clear roles, strict boundaries, and shared project knowledge.**

## The Architecture

### Three-Tier Agent System (v2.0)

```
Core Agents (universal, never change)
├── Project Owner              (orchestrator)
├── Librarian                  (persistent memory)
├── Rubber Duck                (guided learning)
├── Code Reviewer              (quality reviewer)
├── Business Analyst           (requirements)
├── QA Validator               (acceptance criteria)
└── PR Manager                 (PR descriptions)

Coordinators (generated per project)
├── FE Team Lead               (frontend coordinator, if detected)
│   ├── [Framework Specialist] (Vue, React, Angular, Svelte, etc.)
│   ├── [Styling Specialist]   (SCSS, Tailwind, CSS-in-JS, etc.)
│   ├── [Accessibility]        (WCAG/ARIA specialist)
│   ├── [Security Specialist]  (OWASP Top 10, secrets, injections)
│   ├── [Testing Specialist]   (Jest, Vitest, Cypress, Playwright, etc.)
│   └── [Language Specialist]  (TypeScript, JavaScript)
│
└── BE Team Lead               (backend coordinator, if detected)
    ├── [Language Specialist]  (Python, Java, Go, Rust, Node, etc.)
    ├── [Framework Specialist] (Django, Spring Boot, Fiber, Express, etc.)
    ├── [Database Specialist]  (PostgreSQL, MongoDB, Redis, etc.)
    ├── [Security Specialist]  (OWASP Top 10, auth, injections)
    └── [Testing Specialist]   (pytest, JUnit, go test, cargo test, etc.)
```

**Example: Vue + Django Full-Stack Project**
- **Generates:** FE Team Lead, BE Team Lead, vue specialist, typescript specialist, scss specialist, accessibility specialist, python specialist, django specialist, postgresql specialist, + testing specialists for both stacks
- **Routing:** Project Owner → FE/BE Team Lead → Domain Specialists
- **Pattern files:** vue-patterns.md, django-patterns.md, python-patterns.md, postgresql-patterns.md
- **MCP servers:** Documentation MCP (Vue + Django docs), Database MCP (PostgreSQL), Browser MCP (accessibility testing)

Every agent has constraints — what it does **and what it doesn't do**. The project owner routes but never reads code. The team lead coordinates but never implements. The QA validator reports bugs but never fixes them. Constraints are what make specialization real instead of just a label.

## Quick Start

### 1. Copy the folder

Copy the `.claude/` directory into your project root.

### 2. Run init

```
/init
```

This interactive setup will:
1. **Interview you** about your project (root path, scope, tech stack, workflow, MCP needs)
2. **Auto-detect** your tech stack using 100+ detectors
3. **Generate Agents** dynamically from templates
4. **Generate Pattern Files** with best practices for your exact stack
5. **Configure MCP Servers** with smart recommendations
6. **Write Project Context** and metadata

**Result:** A fully customized agent team ready for your specific project.

📖 **[See detailed setup guide →](.claude/docs/bootstrap-system.md)**

### 3. Start working

```
# Frontend examples (Vue project)
/agent fe-team-lead    Build a searchable dropdown component
/agent vue             How should I structure props for this?
/agent accessibility   Check keyboard navigation

# Backend examples (Django project)
/agent be-team-lead    Design REST API for user management
/agent django          How should I structure this view?
/agent postgresql      Optimize this query

# Universal commands
/agent rubber-duck     Help me understand focus management
/review                Review my changed files
/preflight             Run full pre-PR validation
```

## Skills (Slash Commands)

| Command | What it does |
|---------|-------------|
| `/init` | Interactive project setup — detects 100+ technologies, generates agents, configures MCPs |
| `/update` | Check for and apply framework updates — smart merge preserves customizations |
| `/migrate` | Migrate from v1.0 to v2.0, or add update system to existing v2.0 projects |
| `/agent <id>` | Invoke any specialist (e.g., `/agent vue`, `/agent django`) |
| `/team-lead` | Decompose a feature into specialist tasks |
| `/review` | Multi-domain code review with severity-rated findings (includes security) |
| `/security-audit` | OWASP Top 10 security scan — vulnerabilities, secrets, dependencies |
| `/lint` | Pattern-based checks against project rules |
| `/preflight` | Full pre-PR pipeline: lint → security → test → review |
| `/tutorial` | Interactive 5-minute onboarding walkthrough — meet your team, route a task, learn the quality pipeline |
| `/librarian` | Capture a directive or extract learnings |

## Key Features

### 🔄 Universal Bootstrap System
- Supports 100+ technologies across frontend, backend, databases, and tools
- Automatically detects your stack and generates project-specific agents
- Configuration-driven — extend via YAML files, no code changes required

📖 **[Learn how it works →](.claude/docs/bootstrap-system.md)**

### 🔌 MCP Integration
- Smart recommendations based on detected stack
- Documentation MCP for version-specific framework docs
- Database MCP for schema inspection and query assistance
- Browser MCP for accessibility testing

📖 **[MCP setup guide →](.claude/docs/mcp-setup.md)**

### 🧩 Easy Extensibility
- Add new technologies via YAML configuration
- Create custom agents from universal templates
- No TypeScript/JavaScript code changes needed

📖 **[Extending the system →](.claude/docs/extending.md)**

### 🎯 Guided Learning
- Rubber Duck agent teaches by asking questions, not giving answers
- Librarian captures and persists project-specific rules
- Pattern files encode best practices that evolve with your project

📖 **[Design philosophy →](.claude/docs/philosophy.md)**

## By the Numbers (v2.3)

- **100+ Technology Detectors** across frontend, backend, databases, security tools
- **9 Universal Agent Templates** that generate project-specific specialists (incl. security)
- **5 Detection Rule Files** covering frontend, backend, databases, tools, and security
- **20+ Pattern File Templates** for different tech stacks (incl. security patterns)
- **12 Skills** (slash commands) including `/security-audit`
- **3-Tier Agent Architecture** (7 core + 2 coordinators + N specialists)
- **OWASP Top 10 (2025)** coverage built into review pipeline
- **100% Configuration-Driven** — add new tech via YAML, no code changes

## Documentation

- **[Bootstrap System](.claude/docs/bootstrap-system.md)** - How detection & agent generation works
- **[Session Tracking](.claude/docs/session-tracking.md)** - What's tracked, privacy, and future features
- **[MCP Setup Guide](.claude/docs/mcp-setup.md)** - Configure Model Context Protocol servers
- **[Extending the System](.claude/docs/extending.md)** - Add new technologies & custom agents
- **[Design Philosophy](.claude/docs/philosophy.md)** - Core principles & architectural decisions

## Version History

**v2.3** (2026-02-17) — Security Sprint
- Security specialist agent template with OWASP Top 10 (2025) knowledge base
- `/security-audit` skill — full security scan (vulnerabilities, secrets, dependencies)
- Security detection rules for 15+ security tools (Snyk, Dependabot, Semgrep, Gitleaks, etc.)
- Security patterns template with framework-specific guidance (Vue, React, Django, Express, Spring, FastAPI)
- `/review` now includes security checks (hardcoded secrets, injection, XSS, auth)
- `/preflight` adds security scan step — critical security issues block PRs
- Updated to OWASP Top 10 2025 (new: Software Supply Chain Failures, Mishandling Exceptional Conditions)

**v2.2** (2026-02-17) — Tutorial, Session Tracking & Quality Pass
- `/tutorial` skill — interactive 5-minute onboarding with 3 steps + quick reference card
- Session tracking infrastructure for skill executions (JSON schema v1.0.0, auto-cleanup)
- Recent work context — agents (Project Owner) read last 5 session summaries for continuity
- Error handling & recovery sections for `/review`, `/preflight`, `/init`, `/lint`, `/agent`
- 20 new bootstrap templates (15 pattern templates, 4 skill templates, 1 agent template)
- Comprehensive bug fixes across bootstrap pipeline, mappings, scripts, and documentation
- macOS compatibility fix for session cleanup script
- Developed using dogfooding (framework building itself)

**v2.1** (2026-02-16) — Update System
- `/update` skill for safe framework updates
- File tracking system with smart merge
- Preserves all customizations during updates
- Update history and rollback support
- Opt-in for existing v2.0 projects via `/migrate --add-update-system`

**v2.0** (2026-02-14) — Bootstrap System
- Universal tech stack support (100+ detectors)
- Dynamic agent generation from templates
- MCP integration with smart recommendations
- Full backend support (Django, Spring Boot, Go, Rust, etc.)
- Configuration-driven extensibility

**v1.0** — Multi-Agent Foundation
- 14 hardcoded agents for Vue/TypeScript/SCSS
- Pattern file generation
- Agent hierarchy and routing
- Skills system (slash commands)
- Librarian and persistent memory

---

*Built by [Codelaude](https://github.com/codelaude) with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Keeping the human in the driver's seat.*
