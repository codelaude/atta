# Bootstrap System v2.0

The core innovation in v2.0 is **dynamic agent generation**. Instead of hardcoding agents for Vue/SCSS/TypeScript, the system detects your tech stack and generates specialized agents from universal templates.

## How It Works

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

## Supported Tech Stacks

### Frontend Frameworks
- Vue.js (2.x, 3.x), React (16+, 18+), Angular (2+, 14+)
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
  └── jest.md                  (handles Vitest/Jest, from testing-specialist template)

knowledge/patterns/
  ├── react-patterns.md        (Hooks, Context, component composition)
  ├── express-patterns.md      (Middleware, routing, error handling)
  └── mongodb-patterns.md      (Schema design, aggregation, indexing)
```

## Template System

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

## See Also

- [MCP Setup Guide](mcp-setup.md) - Configure Model Context Protocol servers
- [Extending the System](extending.md) - Add new technologies
- [Main README](../../README.md) - Quick start guide
