# AI Dev Team Agent v2.0

A multi-agent system for AI-assisted development that guides, reviews, and validates your work — instead of writing code for you.

Drop the `.claude/` folder into **any project** (Vue, React, Python/Django, Java/Spring Boot, Go, Rust, or anything else), run `/init`, and get a virtual development team dynamically generated for your specific tech stack.

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
│   ├── [Testing Specialist]   (Jest, Vitest, Cypress, Playwright, etc.)
│   └── [Language Specialist]  (TypeScript, JavaScript)
│
└── BE Team Lead               (backend coordinator, if detected)
    ├── [Language Specialist]  (Python, Java, Go, Rust, Node, etc.)
    ├── [Framework Specialist] (Django, Spring Boot, Fiber, Express, etc.)
    ├── [Database Specialist]  (PostgreSQL, MongoDB, Redis, etc.)
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
2. **Auto-detect** your tech stack using 100+ detectors:
   - Frameworks: Vue, React, Angular, Svelte, Django, Spring Boot, Express, Fiber, Rails, etc.
   - Languages: TypeScript, Python, Java, Go, Rust, Ruby, PHP
   - Databases: PostgreSQL, MySQL, MongoDB, Redis, SQLite, etc.
   - Tools: Testing frameworks, linters, build tools, CI/CD
3. **Reconcile & Confirm** detected technologies with your answers
4. **Generate Agents** dynamically from templates:
   - Coordinators (FE Team Lead, BE Team Lead) based on detected stacks
   - Specialists (framework, language, database, styling, testing) per technology
   - Routing table (INDEX.md) with hierarchy and delegation rules
5. **Generate Pattern Files** with best practices for your exact stack
6. **Configure MCP Servers** with smart recommendations:
   - Documentation MCP for your framework/language docs
   - Database MCP for schema browsing and query assistance
   - Browser MCP for accessibility testing
7. **Write Project Context** and metadata

**Result:** A fully customized agent team ready for your specific project.

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

## What's Inside (v2.0 Structure)

```
.claude/
├── agents/                        # Agent definitions (three-tier system)
│   ├── INDEX.md                   # Registry, hierarchy, routing (auto-generated)
│   ├── project-owner.md           # Orchestrator — routes tasks
│   ├── librarian.md               # Persistent memory keeper
│   ├── rubber-duck.md             # Guided learning (no code generation)
│   ├── code-reviewer.md           # Cross-domain reviewer
│   ├── business-analyst.md        # Requirements management
│   ├── qa-validator.md            # Acceptance criteria validation
│   ├── pr-manager.md              # PR description generation
│   ├── coordinators/              # Generated per project
│   │   ├── fe-team-lead.md        # FE coordinator (if has frontend)
│   │   └── be-team-lead.md        # BE coordinator (if has backend)
│   ├── specialists/               # Fully generated from templates
│   │   ├── [framework].md         # Vue, React, Angular, Django, Spring, etc.
│   │   ├── [language].md          # Python, Java, Go, TypeScript, etc.
│   │   ├── [database].md          # PostgreSQL, MongoDB, Redis, etc.
│   │   ├── [styling].md           # SCSS, Tailwind, CSS-in-JS, etc.
│   │   ├── [testing].md           # Jest, pytest, JUnit, etc.
│   │   └── accessibility.md       # WCAG/ARIA specialist (universal)
│   └── memory/
│       └── directives.md          # Captured rules across sessions
│
├── bootstrap/                     # NEW: Bootstrap system (v2.0)
│   ├── generator.md               # Core generation logic
│   ├── detection/                 # Technology detection rules (100+)
│   │   ├── frontend-detectors.yaml
│   │   ├── backend-detectors.yaml
│   │   ├── database-detectors.yaml
│   │   └── tool-detectors.yaml
│   ├── mappings/                  # Detection → Template mappings
│   │   ├── agent-mappings.yaml    # 40+ tech → agent template
│   │   ├── skill-mappings.yaml    # Dynamic skill generation
│   │   └── mcp-mappings.yaml      # Tech → MCP recommendations
│   └── templates/                 # Agent & pattern templates
│       ├── agents/                # 8 universal agent templates
│       │   ├── framework-specialist.template.md
│       │   ├── language-specialist.template.md
│       │   ├── database-specialist.template.md
│       │   ├── testing-specialist.template.md
│       │   ├── styling-specialist.template.md
│       │   ├── accessibility-specialist.template.md
│       │   ├── fe-team-lead.template.md
│       │   ├── be-team-lead.template.md
│       │   └── INDEX.template.md
│       ├── patterns/              # 15+ tech stack pattern templates
│       │   ├── vue-patterns.template.md
│       │   ├── react-patterns.template.md
│       │   ├── python-patterns.template.md
│       │   ├── django-patterns.template.md
│       │   ├── java-patterns.template.md
│       │   ├── spring-boot-patterns.template.md
│       │   └── [more tech stacks...]
│       └── skills/                # Dynamic skill templates
│           ├── test.template.md
│           └── build.template.md
│
├── skills/                        # Slash commands
│   ├── init/SKILL.md              # Enhanced: MCP + dynamic generation
│   ├── migrate/SKILL.md           # NEW: v1.0 → v2.0 migration
│   ├── agent/SKILL.md             # Invoke any agent by ID
│   ├── team-lead/SKILL.md         # Task decomposition
│   ├── review/SKILL.md            # Multi-domain code review
│   ├── lint/SKILL.md              # Pattern-based linting
│   ├── preflight/SKILL.md         # Full pre-PR validation
│   ├── librarian/SKILL.md         # Knowledge capture
│   └── generated/                 # Generated project-specific skills
│
├── knowledge/                     # Shared knowledge base
│   ├── quick-reference.md         # "I see X, I do Y" decision tables
│   ├── web-resources.md           # External documentation links
│   ├── patterns/                  # Auto-generated by /init
│   │   └── [tech]-patterns.md     # Pattern files per detected tech
│   ├── project/
│   │   ├── project-context.md     # Auto-generated by /init
│   │   ├── mcp-config.json        # NEW: MCP server configuration
│   │   └── developer-profile.md   # Working preferences
│   ├── templates/
│   │   └── pr-template.md         # PR description format
│   └── accs/                      # Acceptance criteria templates
│
├── .metadata/                     # NEW: System metadata
│   ├── version                    # "2.0"
│   ├── last-init                  # Timestamp of last /init run
│   └── generated-manifest.json    # What was generated and why
│
└── settings.local.json            # Permission configuration
```

## Bootstrap System v2.0

The core innovation in v2.0 is **dynamic agent generation**. Instead of hardcoding agents for Vue/SCSS/TypeScript, the system detects your tech stack and generates specialized agents from universal templates.

### How It Works

1. **Detection (100+ Rules)**
   - Scans `package.json`, `requirements.txt`, `pom.xml`, `go.mod`, etc.
   - Identifies frameworks, languages, databases, testing tools, build systems
   - Extracts versions and metadata
   - Produces a structured detection manifest

2. **Mapping (40+ Technologies)**
   - Maps detected tech → appropriate agent template
   - Determines which coordinators to generate (FE Lead, BE Lead, or both)
   - Selects pattern file templates
   - Recommends MCP servers

3. **Generation (8 Templates)**
   - Loads universal templates (framework-specialist, language-specialist, etc.)
   - Substitutes variables ({{FRAMEWORK_NAME}}, {{RULES}}, {{ANTI_PATTERNS}})
   - Writes generated agents to `agents/specialists/`
   - Creates pattern files with tech-specific best practices
   - Regenerates `INDEX.md` with accurate routing table

4. **MCP Integration**
   - Interviews you about documentation, database, and browser testing needs
   - Generates `mcp-config.json` with server definitions
   - Adds MCP capability sections to relevant agents
   - Smart recommendations based on detected stack

### Supported Tech Stacks

**Frontend Frameworks:**
- Vue.js (2.x, 3.x), React (16+, 18+), Angular (2+, 14+)
- Svelte, Solid.js, Astro, Next.js, Nuxt, Remix
- Qwik, Preact, Alpine.js

**Backend Frameworks:**
- **Python:** Django, Flask, FastAPI, Pyramid
- **Java:** Spring Boot, Quarkus, Micronaut
- **Node.js:** Express, NestJS, Fastify, Koa
- **Go:** Fiber, Gin, Echo, Chi
- **Rust:** Actix, Rocket, Axum
- **Ruby:** Rails, Sinatra
- **PHP:** Laravel, Symfony

**Databases:**
- **SQL:** PostgreSQL, MySQL, SQLite, MS SQL Server, Oracle
- **NoSQL:** MongoDB, Redis, Cassandra, DynamoDB
- **ORMs:** Prisma, TypeORM, SQLAlchemy, Hibernate, GORM, Diesel

**Styling:**
- SCSS, Sass, Less, Tailwind CSS, CSS Modules
- Styled Components, Emotion, Stitches, Vanilla Extract
- UnoCSS, WindiCSS

**Testing:**
- **Frontend:** Jest, Vitest, Mocha, Jasmine, Karma, Cypress, Playwright, Testing Library
- **Backend:** pytest, unittest, JUnit, TestNG, go test, cargo test, RSpec

**Build Tools:**
- Vite, Webpack, Rollup, Parcel, esbuild, Turbopack
- Gradle, Maven, pip, npm, pnpm, yarn, go build, cargo

### What Gets Generated

**For a Vue + Django + PostgreSQL project:**
```
.claude/
agents/coordinators/
  ├── fe-team-lead.md          (coordinates Vue + TypeScript + SCSS)
  └── be-team-lead.md          (coordinates Python + Django + PostgreSQL)

agents/specialists/
  ├── vue.md                   (from framework-specialist template)
  ├── typescript.md            (from language-specialist template)
  ├── scss.md                  (from styling-specialist template)
  ├── accessibility.md         (from accessibility template)
  ├── python.md                (from language-specialist template)
  ├── django.md                (from framework-specialist template)
  ├── postgresql.md            (from database-specialist template)
  ├── jest.md                  (from testing-specialist template, FE)
  └── pytest.md                (from testing-specialist template, BE)

knowledge/patterns/
  ├── vue-patterns.md          (Composition API, reactivity, component structure)
  ├── python-patterns.md       (PEP 8, type hints, error handling)
  ├── django-patterns.md       (ORM, views, templates, DRF)
  └── postgresql-patterns.md   (Query optimization, indexing, transactions)

knowledge/project/
  └── mcp-config.json          (Documentation MCP: Vue + Django docs,
                                Database MCP: PostgreSQL connection,
                                Browser MCP: accessibility testing)
```

**For a React + Express + MongoDB project:**
```
agents/coordinators/
  ├── fe-team-lead.md          (coordinates React + TypeScript + Tailwind)
  └── be-team-lead.md          (coordinates Node.js + Express + MongoDB)

agents/specialists/
  ├── react.md
  ├── typescript.md
  ├── tailwind.md
  ├── accessibility.md
  ├── express.md
  ├── mongodb.md
  ├── vitest.md
  └── jest.md

knowledge/patterns/
  ├── react-patterns.md        (Hooks, Context, component composition)
  ├── express-patterns.md      (Middleware, routing, error handling)
  └── mongodb-patterns.md      (Schema design, aggregation, indexing)
```

### Template System

Templates use simple variable substitution:

```markdown
# Agent: {{FRAMEWORK_NAME}} ({{FRAMEWORK_TYPE}} Framework Specialist)

## Key Rules
{{#each RULES}}
- {{this}}
{{/each}}

## Anti-Patterns to Flag
| I See | I Do | Severity |
{{#each ANTI_PATTERNS}}
| {{pattern}} | {{fix}} | {{severity}} |
{{/each}}

## Delegates To
- **Styling** → {{STYLING_SPECIALIST}}
- **Testing** → {{TESTING_SPECIALIST}}
```

Variables come from detection + mappings:
```yaml
# agent-mappings.yaml
vue:
  template: framework-specialist.template.md
  output: agents/specialists/vue.md
  variables:
    FRAMEWORK_NAME: "Vue.js"
    FRAMEWORK_TYPE: "reactive component"
    STYLING_SPECIALIST: "scss / tailwind"
    TESTING_SPECIALIST: "jest / vitest"
  rules:
    - "Use Composition API with `<script setup>` for Vue 3"
    - "Use `ref()` for primitives, `reactive()` for objects"
  anti_patterns:
    - pattern: "Using Options API in new Vue 3 code"
      fix: "Use Composition API with script setup"
      severity: "HIGH"
```

**Result:** Fully customized Vue specialist with project-specific rules.

### MCP (Model Context Protocol) Integration

MCP servers provide external context to AI assistants. The bootstrap system:

1. **Detects your needs** during `/init` interview
2. **Checks Node.js version** (MCP servers require Node.js 18+)
3. **Recommends servers** based on detected stack:
   - **[Context7](https://github.com/upstash/context7)**: Up-to-date, version-specific documentation (recommended for all projects)
     - Requires API key (free tier): https://console.upstash.com/context7
   - **Database MCP**: Direct schema browsing and query assistance
   - **Browser MCP**: Accessibility testing, DOM inspection, visual regression
   - **[Serena](https://github.com/oraios/serena)**: Semantic code intelligence via language server (optional, best for Cursor/Claude Desktop)
4. **Generates config**: `.claude/knowledge/project/mcp-config.json` with proper paths for nvm users
5. **Updates agents**: Adds "MCP Capabilities" sections to relevant specialists

**Example mcp-config.json (for nvm users):**
```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "/Users/username/.nvm/versions/node/v22.22.0/bin/npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "PATH": "/Users/username/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    },
    "postgres": {
      "type": "stdio",
      "command": "/Users/username/.nvm/versions/node/v22.22.0/bin/npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "PATH": "/Users/username/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "POSTGRES_CONNECTION": "${DATABASE_URL}"
      }
    }
  }
}
```

> **Important:**
> - **Node.js 18+ required** for all MCP servers
> - **nvm users:** Use full path to `npx` and include `PATH` in `env` (as shown above). Using just `"npx"` will use system default Node, which may be outdated.
> - **Security - Credentials:** Never hardcode credentials. Use environment variable references (e.g., `${DATABASE_URL}`) and add `mcp-config.json` to `.gitignore` if it contains secrets.
> - **Security - Package integrity:** The examples use `npx -y` which automatically fetches the latest package version. For production use, consider pinning to specific versions (e.g., `@upstash/context7-mcp@1.2.3`) or verifying package integrity to reduce supply-chain risks.
> - **Context7 API key:** Get free key at https://console.upstash.com/context7

### Extensibility

**To add a new technology:**
1. Add detection rule to `bootstrap/detection/[category]-detectors.yaml`
2. Add agent mapping to `bootstrap/mappings/agent-mappings.yaml`
3. Create pattern template in `bootstrap/templates/patterns/[tech]-patterns.template.md`
4. Run `/init` — the new tech will be detected and agents generated

**No code changes required.** The entire system is configuration-driven.

## Key Concepts

### Agents guide, they don't generate

Every agent provides expertise, reviews, and recommendations. You remain in control. The system is designed to make you a better developer, not to replace you.

### The Rubber Duck

The agent whose job is to **not give you answers**. It asks questions, points you to patterns, and helps you discover solutions yourself. Exception: it will write unit tests when asked, because nobody needs to be guided through their 47th mount wrapper factory.

### The Librarian

Captures directives ("remember to...", "always...", "never...") as structured rules that persist across sessions. Over time, frequently-used directives get graduated into pattern files. The knowledge base grows with your project.

### Adaptive Coordinators (v2.0)

Coordinators (team leads) are generated based on what's detected:
- **Frontend only?** → Generates FE Team Lead (coordinates framework, styling, testing specialists)
- **Backend only?** → Generates BE Team Lead (coordinates language, framework, database specialists)
- **Full-stack?** → Generates BOTH coordinators, each managing their domain
- **Monorepo?** → Detects multiple stacks, generates all necessary coordinators and specialists

The structure adapts automatically to your project architecture.

## Skills (Slash Commands)

| Command | What it does |
|---------|-------------|
| `/init` | **v2.0 Enhanced:** Interactive project setup — interviews you, detects 100+ technologies, generates agents dynamically, configures MCP servers, creates pattern files |
| `/migrate` | **NEW:** Upgrade from v1.0 to v2.0 — detects old structure, backs up, restructures, regenerates agents, preserves custom rules |
| `/agent <id>` | Invoke any specialist by ID (e.g., `/agent vue`, `/agent django`, `/agent postgresql`) |
| `/team-lead` | Decompose a feature into specialist tasks (works with fe-team-lead or be-team-lead) |
| `/review` | Multi-domain code review with severity-rated findings |
| `/lint` | Pattern-based checks against the quick-reference rules |
| `/preflight` | Full pre-PR pipeline: lint → test → review |
| `/librarian` | Capture a directive or extract learnings |

## Agent Reference (v2.0)

### Core Agents (Always Available)

| Agent ID | Aliases | Role |
|----------|---------|------|
| `project-owner` | `orchestrator` | Routes tasks to the right team or specialist |
| `librarian` | `knowledge-keeper` | Persistent memory and pattern updates |
| `rubber-duck` | `guide`, `duck` | Guided learning — questions, not answers |
| `code-reviewer` | `reviewer` | Cross-domain code review |
| `business-analyst` | `ba`, `requirements` | Requirements and acceptance criteria management |
| `qa-validator` | `qa` | Validates against acceptance criteria |
| `pr-manager` | `pm`, `pr` | PR description generation |

### Coordinators (Generated per Project)

| Agent ID | Generated When | Role |
|----------|----------------|------|
| `fe-team-lead` | Frontend detected | Decomposes FE features, coordinates FE specialists |
| `be-team-lead` | Backend detected | Decomposes BE features, coordinates BE specialists |

### Specialists (Dynamically Generated)

**Note:** These are examples. Actual agents generated depend on your detected stack.

| Example Agent | Generated From | Applies To |
|---------------|----------------|------------|
| `vue`, `react`, `angular`, `svelte` | framework-specialist | Frontend frameworks |
| `django`, `spring-boot`, `express`, `fiber` | framework-specialist | Backend frameworks |
| `python`, `java`, `go`, `typescript` | language-specialist | Programming languages |
| `postgresql`, `mongodb`, `redis`, `mysql` | database-specialist | Databases |
| `scss`, `tailwind`, `styled-components` | styling-specialist | Styling systems |
| `jest`, `pytest`, `junit`, `vitest` | testing-specialist | Testing frameworks |
| `accessibility` | accessibility-specialist | WCAG/ARIA (universal) |

**To see which agents are available in your project:**
- Check `agents/INDEX.md` after running `/init`
- The INDEX.md file lists all generated agents with their hierarchy and routing rules

## Adapting to Your Project (v2.0 Examples)

The system starts empty and generates everything based on detection. Here's what `/init` creates for different project types:

### Frontend-Only Projects

**Vue 3 + TypeScript + Vite + Tailwind:**
- **Agents:** fe-team-lead, vue, typescript, tailwind, accessibility, vitest
- **Patterns:** vue-patterns.md, tailwind-patterns.md
- **MCP:** Documentation MCP (Vue docs)

**React 18 + Next.js + Styled Components:**
- **Agents:** fe-team-lead, react, nextjs, typescript, styled-components, accessibility, jest
- **Patterns:** react-patterns.md, nextjs-patterns.md
- **MCP:** Documentation MCP (React + Next.js docs)

### Backend-Only Projects

**Python + Django + PostgreSQL:**
- **Agents:** be-team-lead, python, django, postgresql, pytest
- **Patterns:** python-patterns.md, django-patterns.md, postgresql-patterns.md
- **MCP:** Documentation MCP (Django docs), Database MCP (PostgreSQL)

**Java + Spring Boot + MySQL:**
- **Agents:** be-team-lead, java, spring-boot, mysql, junit
- **Patterns:** java-patterns.md, spring-boot-patterns.md, mysql-patterns.md
- **MCP:** Documentation MCP (Spring docs), Database MCP (MySQL)

**Go + Fiber + MongoDB:**
- **Agents:** be-team-lead, go, fiber, mongodb, go-test
- **Patterns:** go-patterns.md, fiber-patterns.md, mongodb-patterns.md
- **MCP:** Documentation MCP (Go + Fiber docs), Database MCP (MongoDB)

### Full-Stack Projects

**Vue + Django + PostgreSQL (Full-Stack):**
- **Agents:** fe-team-lead, be-team-lead, vue, typescript, scss, python, django, postgresql, vitest, pytest, accessibility
- **Patterns:** vue-patterns.md, python-patterns.md, django-patterns.md, postgresql-patterns.md
- **MCP:** Documentation MCP (Vue + Django), Database MCP (PostgreSQL), Browser MCP

**React + Express + MongoDB:**
- **Agents:** fe-team-lead, be-team-lead, react, typescript, tailwind, express, mongodb, jest, accessibility
- **Patterns:** react-patterns.md, express-patterns.md, mongodb-patterns.md
- **MCP:** Documentation MCP (React + Express), Database MCP (MongoDB)

### Monorepo Projects

**Nx Monorepo (Angular + NestJS):**
- **Agents:** fe-team-lead, be-team-lead, angular, typescript, scss, nestjs, postgresql, jasmine, jest, accessibility
- **Patterns:** angular-patterns.md, nestjs-patterns.md, postgresql-patterns.md
- **Routing:** Project Owner → [FE or BE based on task] → Specialists

**All pattern files, agent specialists, and routing tables are auto-generated.** The core agents (project-owner, librarian, rubber-duck, etc.) remain universal regardless of stack.

## Migrating from v1.0 to v2.0

If you have an existing v1.0 `.claude/` setup, the system will detect it automatically when you run `/init`.

### Migration Path

1. **Automatic Detection**
   - `/init` recognizes the old flat structure
   - Offers to migrate or continue with v1.0

2. **Run Migration**
   ```
   /migrate
   ```

3. **What the Migration Does**
   - Creates backup at `.claude/.backup-v1.0-[timestamp]/`
   - Archives old tech-specific agents to `agents/legacy/`
   - Detects your tech stack
   - Generates new agents from templates
   - Preserves custom rules from old agents
   - Merges `directives.md` content
   - Creates bootstrap infrastructure
   - Generates `INDEX.md` with routing

4. **What Gets Preserved**
   - All custom rules and anti-patterns you added
   - Directives.md content
   - Project context
   - Knowledge base files
   - Settings and preferences

5. **Rollback (If Needed)**
   ```
   /migrate --rollback
   ```
   Restores from backup and returns to v1.0 structure.

### Key Differences: v1.0 vs v2.0

| Feature | v1.0 | v2.0 |
|---------|------|------|
| **Agent Structure** | Flat, 14 hardcoded agents | Three-tier: core/coordinators/specialists |
| **Tech Support** | Vue/SCSS/TypeScript focused | 100+ technologies, universal |
| **Agent Generation** | Static files | Dynamic from templates |
| **Backend Support** | Advisory mode only | Full BE team lead + specialists |
| **Pattern Files** | Generated per tech | Generated per tech (expanded) |
| **Routing** | Static INDEX.md | Dynamic INDEX.md regenerated per project |
| **MCP Integration** | None | Full MCP configuration + recommendations |
| **Extensibility** | Edit agent files | Add YAML rules, no code changes |
| **Detection** | Basic (10-15 technologies) | Comprehensive (100+ technologies) |
| **Monorepo Support** | Limited | Full (multiple stacks in one project) |

### Should You Migrate?

**Migrate if you:**
- Work with multiple tech stacks across projects
- Want backend support beyond advisory guidance
- Need MCP server integration
- Want the system to adapt to new technologies automatically
- Work on full-stack or polyglot projects

**Stay on v1.0 if you:**
- Your project is 100% Vue/TypeScript/SCSS and will stay that way
- You've heavily customized agent files and don't want to regenerate
- v1.0 meets all your needs and you prefer stability

Both versions are fully functional. v2.0 is about universality and extensibility.

## Portability

This system was built for Claude Code but the ideas travel. The `.claude/` folder is the single source of truth — other tools can read from it directly or use the knowledge files as-is.

| Layer | Claude Code | GitHub Copilot | OpenAI Codex |
|-------|-------------|----------------|--------------|
| Agents | Sub-agents with routing | Agents + skills (CLI/IDE) | Sub-agents + skills |
| Workflows | Skills (slash commands) | Skills + delegation (`/agent`, `/delegate`) | Skills + tool-driven orchestration |
| Knowledge base | Pattern files | Pattern files | Pattern files |
| Memory | Librarian agent | Instruction file | Skill + file |
| Hierarchy | Native routing | Delegation supported, hierarchy quality depends on prompt design | Native routing (prompt-defined) |

### Using with GitHub Copilot

GitHub Copilot can read the `.claude/` folder directly — no separate configuration needed.

**Setup:**
1. Copy the `.claude/` directory into your project root (it's already there if you cloned this repo)
2. In VS Code, open Copilot Chat settings and enable reading from `.claude/` skill files
3. Skills defined in `.claude/skills/` will appear as available skills in Copilot Chat

**What works:**
- Skills (slash commands) — Copilot reads `SKILL.md` files and executes them
- Agent delegation — Copilot can delegate tasks to custom agents (`/agent`, `/delegate`)
- Parallel tool execution — Copilot CLI can execute tools in parallel when suitable
- Knowledge base — pattern files, quick-reference, and project context are all available
- Agent expertise — each agent definition is readable as a skill, giving Copilot access to the specialist knowledge

**Current constraints:**
- CLI docs do not yet define sub-agent semantics as explicitly as IDE sub-agent docs
- Automatic routing quality varies with how well coordinator prompts are structured
- No dynamic agent personas — skills run as Copilot, not as a named specialist with constraints
- Memory/librarian workflow requires manual management of the directives file

### Using with OpenAI Codex

Codex supports both skill-style prompts and sub-agent delegation, including running independent specialist tracks in parallel.

**Setup:**
1. Create a `.codex/` directory in your project root
2. Copy skill files from `.claude/skills/` into `.codex/` as individual skill files
3. Copy relevant knowledge files into the Codex instruction context

**What works:**
- Skills — each slash command can be ported as a Codex skill
- Sub-agent routing — project-owner/team-leads can delegate to specialists
- Parallel delegation — FE/BE and multi-specialist tracks can run concurrently when independent
- Knowledge base — pattern files and decision tables work as instruction context
- Agent expertise — specialist knowledge can be packaged into individual skills

**Current constraints:**
- No automatic import from `.claude/` into `.codex/` — keep sync explicit
- Memory/librarian workflow still depends on `directives.md` discipline
- Routing quality depends on clear coordinator prompts and boundaries

### The Bottom Line

The knowledge base is still the most portable layer. Claude Code and Codex can run this hierarchy directly, and Copilot can approximate it well via delegation; in Copilot, outcome quality depends more heavily on how explicit your coordinator prompts and routing rules are. Start with patterns, then layer routing rules and specialist prompts.

## By the Numbers (v2.0)

- **100+ Technology Detectors** across frontend, backend, databases, and tools
- **8 Universal Agent Templates** that generate project-specific specialists
- **40+ Technology Mappings** connecting detected tech to agent templates
- **15+ Pattern File Templates** for different tech stacks
- **50+ Potential Agents** depending on your project's complexity
- **3-Tier Agent Architecture** (7 core + 2 coordinators + N specialists)
- **3 MCP Integration Points** (documentation, database, browser)
- **100% Configuration-Driven** — add new tech via YAML, no code changes

**What this means:**
- Works with virtually any modern web project
- Adapts to your exact stack automatically
- Extensible without touching TypeScript/JavaScript code
- Scales from simple frontend apps to complex full-stack systems

## Philosophy

**The conversation is disposable. The context is permanent.**

The agents, skills, knowledge base, and directives are all pre-prepared context. Instead of explaining conventions every session, they're in files. Instead of correcting the same mistakes, they're in anti-pattern lists. When you do correct something new, the librarian captures it so it doesn't happen again.

The quality of what AI gives you is directly proportional to the context you give it.

---

## Version History

**v2.0** (2026-02-14) — Bootstrap System
- Universal tech stack support (100+ detectors)
- Dynamic agent generation from templates
- MCP integration with smart recommendations
- Full backend support (Django, Spring Boot, Go, Rust, etc.)
- Three-tier agent architecture
- Configuration-driven extensibility

**v1.0** — Multi-Agent Foundation
- 14 hardcoded agents for Vue/TypeScript/SCSS
- Pattern file generation
- Agent hierarchy and routing
- Skills system (slash commands)
- Librarian and persistent memory

---

*Built by [Codelaude](https://github.com/codelaude) with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Keeping the human in the driver's seat.*
