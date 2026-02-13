---
name: init
description: Interactive project setup that detects tech stack, asks clarifying questions, and generates tailored knowledge files and agent configuration. Run this when starting with a new project.
---

You are now running **project initialization** — an interactive setup that configures the agent system for this specific project.

## How to Use

```
/init                    # Full interactive setup
/init --rescan           # Re-detect tech stack and update files (skip questions already answered)
```

---

## What This Skill Does

1. **Ask** the user key questions about the project
2. **Detect** the tech stack from config files
3. **Reconcile** detected info with user answers
4. **Generate** tailored knowledge files, pattern files, and agent configuration
5. **Report** what was set up

---

## Phase 1: User Interview

Before scanning anything, ask these questions using AskUserQuestion. Group related questions together (max 4 per call).

### Round 1: Project Basics

**Question 1 — Project root**
> "Is the current directory the project root, or is the source code in a subdirectory?"
- Options: "Current directory is root", "Source is in a subdirectory", "This is a monorepo"
- _Why:_ Many projects have the actual code nested (e.g., `ui.frontend/`, `packages/app/`, `src/`)

**Question 2 — Project scope**
> "What does this project include?"
- Options: "Frontend only", "Frontend + Backend", "Backend only", "Full-stack monorepo"
- _Why:_ Determines which agents to activate and how to configure backend-consultant

**Question 3 — Your role**
> "What's your primary role on this project?"
- Options: "Frontend developer", "Backend developer", "Full-stack developer", "Tech lead"
- _Why:_ Adjusts agent hierarchy and which specialists are prioritized

### Round 2: Commands & Paths (based on Round 1 answers)

**If subdirectory or monorepo:**
> "Where should npm/build commands be run from? (relative to project root)"
- Free text input expected
- _Why:_ Critical for `/preflight`, `/lint`, test execution

**If Frontend + Backend or Full-stack:**
> "What backend technology does this project use?"
- Options: "Java (Maven/Gradle)", "Node.js (Express/Fastify/Nest)", "Python (Django/Flask/FastAPI)", "Other"
- _Why:_ Configures the backend-consultant agent with the right domain knowledge

**If Frontend + Backend:**
> "Where is the backend code relative to project root?"
- Free text input expected

### Round 3: Workflow Preferences

**Question — Git workflow**
> "What's your branching strategy?"
- Options: "Feature branches off main", "Feature branches off develop", "Trunk-based (main only)", "Other"
- _Why:_ Configures `/review` and `/preflight` git diff base branch

**Question — Command runner**
> "How do you run commands?"
- Options: "npm", "yarn", "pnpm", "bun"
- _Why:_ All generated scripts and commands use the right runner

---

## Phase 2: Auto-Detection

After the interview, scan the project automatically. Use the paths the user confirmed.

### Detect Tech Stack

Scan config files at the confirmed project root (and subdirectories if specified):

#### Package & Runtime
| File | Detects |
|------|---------|
| `package.json` | Dependencies, scripts, browserslist |
| `yarn.lock` / `pnpm-lock.yaml` / `bun.lockb` | Package manager confirmation |
| `.nvmrc` / `.node-version` | Node version |

#### Frontend Framework
| Dependency | Detects |
|------------|---------|
| `vue` | Vue.js (check v2 vs v3) |
| `react` / `react-dom` | React |
| `@angular/core` | Angular |
| `svelte` | Svelte |
| `next` | Next.js |
| `nuxt` | Nuxt |
| `astro` | Astro |

#### Language & Types
| File | Detects |
|------|---------|
| `tsconfig.json` | TypeScript (strict mode, target, paths) |
| `jsconfig.json` | JavaScript with aliases |

#### Styling
| Indicator | Detects |
|-----------|---------|
| `sass` / `dart-sass` in devDeps | SCSS |
| `tailwindcss` in devDeps | Tailwind |
| `styled-components` in deps | CSS-in-JS |
| `@emotion/react` in deps | Emotion |

#### Testing
| Indicator | Detects |
|-----------|---------|
| `jest` in devDeps | Jest |
| `vitest` in devDeps | Vitest |
| `@testing-library/*` in devDeps | Testing Library |
| `cypress` in devDeps | Cypress |
| `playwright` in devDeps | Playwright |

#### State Management
| Dependency | Detects |
|------------|---------|
| `pinia` | Pinia |
| `vuex` | Vuex |
| `redux` / `@reduxjs/toolkit` | Redux |
| `zustand` | Zustand |

#### Build Tools
| File | Detects |
|------|---------|
| `vite.config.*` | Vite |
| `webpack.config.*` | Webpack |
| `next.config.*` | Next.js built-in |
| `turbo.json` | Turborepo |

#### Backend (if user indicated FE+BE)
| File | Detects |
|------|---------|
| `pom.xml` | Java / Maven |
| `build.gradle` | Java / Gradle |
| `requirements.txt` / `pyproject.toml` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `Gemfile` | Ruby |
| `composer.json` | PHP |

### Detect Conventions

Sample up to 10 source files to detect:
- Naming conventions (files, components, variables)
- Component patterns (Composition vs Options API, functional vs class)
- Import patterns (relative vs absolute, barrel exports)
- Styling approach (BEM, CSS Modules, utility classes)
- Test file location and naming

---

## Phase 3: Reconcile & Confirm

Present the detected stack to the user for confirmation:

```markdown
## Detected Configuration

**Project root**: /path/to/project
**Command directory**: /path/to/project/ui.frontend
**Package manager**: npm

### Frontend
- Framework: Vue 3.x
- Language: TypeScript (strict)
- Styling: SCSS (Dart Sass)
- Testing: Jest + Vue Test Utils
- State: Pinia
- Build: Vite

### Backend
- Technology: Java (Maven)
- Path: /path/to/project/core

### Agents to activate
- **FE team**: fe-team-lead, vue, scss, typescript, accessibility, tester, code-reviewer
- **BE team**: backend-consultant (team lead mode — Java/Maven)
- **Cross-cutting**: project-owner, librarian, rubber-duck, qa-validator, business-analyst, pr-manager

Does this look correct? Any adjustments?
```

Wait for user confirmation before writing files.

---

## Phase 4: Generate Files

### Always write:

**`.claude/knowledge/project/project-context.md`**
```markdown
# Project Context

## Tech Stack
- **Frontend**: [Framework] [Version]
- **Language**: [TypeScript/JavaScript]
- **Styling**: [Approach]
- **Testing**: [Framework]
- **State Management**: [Library]
- **Build Tool**: [Tool]
- **Backend**: [Technology] (or "N/A — frontend only")
- **Node**: [version]
- **Package Manager**: [npm/yarn/pnpm/bun]

## Project Structure
[Directory tree, top 3 levels]

## Key Paths
- **Project root**: [path]
- **Command directory** (run npm/yarn here): [path]
- **Source**: [path]
- **Components**: [path]
- **Tests**: [path]
- **Styles**: [path]
- **Backend source**: [path] (if applicable)

## Build Commands
- **Dev**: [command]
- **Build**: [command]
- **Test**: [command]
- **Lint**: [command]

## Git Workflow
- **Base branch**: [main/develop]
- **Branch pattern**: [feature/*, bugfix/*]

## Conventions
- [Detected conventions list]
```

### Conditionally write pattern files:

| Detected | File Created |
|----------|-------------|
| Vue 3 | `patterns/vue-patterns.md` |
| Vue 2 | `patterns/vue-patterns.md` (Options API focus) |
| React | `patterns/react-patterns.md` |
| Angular | `patterns/angular-patterns.md` |
| TypeScript | `patterns/typescript-patterns.md` |
| SCSS | `patterns/scss-patterns.md` |
| Tailwind | `patterns/tailwind-patterns.md` |
| Jest / Vitest | `patterns/testing-patterns.md` |
| i18n library | `patterns/i18n-patterns.md` |
| Java backend | `patterns/java-patterns.md` |
| Python backend | `patterns/python-patterns.md` |
| Node backend | `patterns/node-backend-patterns.md` |

Each pattern file should contain:
- Key rules detected from existing code
- Anti-patterns relevant to the technology
- Conventions found in the codebase
- References to official documentation

### Configure backend-consultant mode:

**If project is FE only:**
- backend-consultant operates in **advisory mode**: read-only, general API/integration guidance, no delegation
- Simplify project-owner routing (no BE routing needed)

**If project is FE + BE:**
- backend-consultant operates in **team lead mode**: mirrors fe-team-lead behavior for the backend domain
- Can delegate to BE-specific patterns and coordinate with fe-team-lead on cross-cutting concerns
- Write backend-specific pattern files
- project-owner routes BE tasks to backend-consultant just like FE tasks to fe-team-lead

**Update `.claude/agents/INDEX.md`** routing table to reflect the actual project scope.

---

## Phase 5: Report

```markdown
## Init Complete

### Files Created/Updated
- `.claude/knowledge/project/project-context.md`
- `.claude/knowledge/patterns/[tech]-patterns.md` (one per detected tech)
- `.claude/agents/INDEX.md` (routing updated)

### Active Agents
| Agent | Status | Mode |
|-------|--------|------|
| fe-team-lead | Active | Coordinating [list of FE specialists] |
| backend-consultant | Active/Advisory | [Team lead mode / Advisory mode] |
| project-owner | Active | Routing [FE / FE + BE] |
| ... | ... | ... |

### Quick Start
- `/agent fe-team-lead` — Decompose a frontend task
- `/agent rubber-duck` — Guided learning mode
- `/review` — Review changed files
- `/preflight` — Full pre-PR validation

### Next Steps
- Run `/init --rescan` anytime the tech stack changes
- Use `/agent librarian` to capture project-specific rules
```

---

## Rescan Mode (`--rescan`)

When `--rescan` is used:
- Skip the user interview (use previously stored answers from project-context.md)
- Re-detect tech stack from config files
- Update pattern files with new findings
- Preserve manual edits (only update auto-generated sections)
- Report what changed

---

## Related Skills

- `/agent librarian` — Capture additional patterns and directives
- `/agent fe-team-lead` — Decompose tasks using detected stack
- `/review` — Review against generated patterns
- `/preflight` — Full pre-PR validation
