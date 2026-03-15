# Bootstrap System

The core innovation is **dynamic agent generation**. Instead of hardcoding agents for a specific stack, the system detects your tech stack and generates specialized agents from universal templates.

## How It Works

1. **Detection (100+ Rules)**
   - Scans `package.json`, `requirements.txt`, `pom.xml`, `go.mod`, etc.
   - Identifies frameworks, languages, databases, testing tools, build systems, and security tools
   - Extracts versions and metadata
   - Produces a structured detection manifest

2. **Mapping (40+ Technologies)**
   - Maps detected tech → appropriate agent template
   - Determines which coordinators to generate (FE Lead, BE Lead, or both)
   - Selects pattern file templates
   - Recommends MCP servers

3. **Generation (11 Templates + Shared Partial)**
   - Reads `_common.md` shared partial (constraints, knowledge base, escalation, etc.)
   - Loads universal templates (framework-specialist, language-specialist, etc.)
   - Resolves `{{> common.SECTION}}` partial references from `_common.md`
   - Substitutes variables ({{FRAMEWORK_NAME}}, {{RULES}}, {{ANTI_PATTERNS}})
   - Writes generated agents to `agents/specialists/`
   - Creates pattern files with tech-specific best practices
   - Regenerates `INDEX.md` with accurate routing table

4. **MCP Integration**
   - Interviews you about documentation, database, and browser testing needs
   - Generates `mcp-config.json` with server definitions
   - Adds MCP capability sections to relevant agents
   - Smart recommendations based on detected stack

## Supported Tech Stacks

### Frontend Frameworks
- React (16+, 18+), Next.js, Angular (2+, 14+), Vue.js (2.x, 3.x)
- Svelte, Solid.js, Astro, Next.js, Nuxt, Remix
- Qwik, Preact, Alpine.js

### Backend Frameworks
- **Python:** Django, Flask, FastAPI, Pyramid
- **Java:** Spring Boot, Quarkus, Micronaut
- **Node.js:** Express, NestJS, Fastify, Koa
- **Go:** Fiber, Gin, Echo, Chi
- **Rust:** Actix, Rocket, Axum
- **Ruby:** Rails, Sinatra
- **PHP:** Laravel, Symfony

### Databases
- **SQL:** PostgreSQL, MySQL, SQLite, MS SQL Server, Oracle
- **NoSQL:** MongoDB, Redis, Cassandra, DynamoDB
- **ORMs:** Prisma, TypeORM, SQLAlchemy, Hibernate, GORM, Diesel

### Styling
- SCSS, Sass, Less, Tailwind CSS, CSS Modules
- Styled Components, Emotion, Stitches, Vanilla Extract
- UnoCSS, WindiCSS

### Testing
- **Frontend:** Jest, Vitest, Mocha, Jasmine, Karma, Cypress, Playwright, Testing Library
- **Backend:** pytest, unittest, JUnit, TestNG, go test, cargo test, RSpec

### Build Tools
- Vite, Webpack, Rollup, Parcel, esbuild, Turbopack
- Gradle, Maven, pip, npm, pnpm, yarn, go build, cargo

## What Gets Generated

**For a React + Express + PostgreSQL project:**
```
.claude/agents/coordinators/
  ├── fe-team-lead.md          (coordinates React + TypeScript + Tailwind)
  └── be-team-lead.md          (coordinates Node.js + Express + PostgreSQL)

.claude/agents/specialists/
  ├── react.md                 (from framework-specialist template)
  ├── typescript.md            (from language-specialist template)
  ├── tailwind.md              (from styling-specialist template)
  ├── accessibility.md         (from accessibility template)
  ├── security-specialist.md   (from security-specialist template, when security tooling is detected)
  ├── express.md               (from framework-specialist template)
  ├── postgresql.md            (from database-specialist template)
  └── vitest.md                (from testing-specialist template)

.atta/team/patterns/
  ├── react-patterns.md        (Hooks, Context, component composition)
  ├── typescript-patterns.md   (strict typing, generics, error handling)
  ├── express-patterns.md      (Middleware, routing, error handling)
  ├── security-patterns.md     (OWASP Top 10 (2025), secrets, injection defenses)
  └── postgresql-patterns.md   (Query optimization, indexing, transactions)

.atta/project/
  └── mcp-config.json          (Documentation MCP: React + Express docs,
                                Database MCP: PostgreSQL connection,
                                Browser MCP: accessibility testing)
```

**For a Django + Vue + MongoDB project:**
```
.claude/agents/coordinators/
  ├── fe-team-lead.md          (coordinates Vue + TypeScript + SCSS)
  └── be-team-lead.md          (coordinates Python + Django + MongoDB)

.claude/agents/specialists/
  ├── vue.md
  ├── typescript.md
  ├── scss.md
  ├── accessibility.md
  ├── security-specialist.md
  ├── python.md
  ├── django.md
  ├── mongodb.md
  └── pytest.md                (from testing-specialist template)

.atta/team/patterns/
  ├── vue-patterns.md          (Composition API, reactivity, component structure)
  ├── django-patterns.md       (ORM, views, templates, DRF)
  ├── security-patterns.md     (OWASP checks, secrets management, API hardening)
  └── mongodb-patterns.md      (Schema design, aggregation, indexing)
```

## Template System

Templates use variable substitution and shared partials:

```markdown
# Agent: {{FRAMEWORK_NAME}} ({{FRAMEWORK_TYPE}} Framework Specialist)

## Constraints

{{> common.specialist_constraints}}

## Key Rules

{{> common.key_rules}}

## Anti-Patterns to Flag

{{> common.anti_patterns}}

## Delegates To
- **Styling** → {{STYLING_SPECIALIST}}
- **Testing** → {{TESTING_SPECIALIST}}

{{> common.delegates_footer}}
```

Shared sections live in `_common.md` — constraints, key rules, anti-patterns, knowledge base, delegates footer, MCP structure, and escalation. This avoids duplicating ~600 lines across 11 templates.

Variables come from detection + mappings:
```yaml
# agent-mappings.yaml
react:
  template: framework-specialist.template.md
  output: agents/specialists/react.md
  variables:
    FRAMEWORK_NAME: "React"
    FRAMEWORK_TYPE: "component-based"
    STYLING_SPECIALIST: "tailwind / css-modules"
    TESTING_SPECIALIST: "vitest / jest"
  rules:
    - "Use functional components with hooks"
    - "Use `useState` for local state, Context or state library for shared state"
  anti_patterns:
    - pattern: "Using class components in new code"
      fix: "Use functional components with hooks"
      severity: "HIGH"
```

**Result:** Fully customized React specialist with project-specific rules.

## See Also

- [MCP Setup Guide](mcp-setup.md) - Configure Model Context Protocol servers
- [Extending the System](extending.md) - Add new technologies
- [Changelog](changelog.md) - Version history
- [Main README](../../README.md) - Quick start guide
