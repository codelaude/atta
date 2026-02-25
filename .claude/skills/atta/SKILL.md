---
name: atta
description: Interactive project setup that detects tech stack, asks clarifying questions, and generates tailored knowledge files and agent configuration. Run this when starting with a new project.
---

You are running **project initialization** — interactive setup that configures the agent system for this project.

## How to Use

```
/atta                    # Full interactive setup
/atta --rescan           # Re-detect tech stack and update files (skip questions already answered)
```

---

## Phase 1: User Interview

Ask questions using AskUserQuestion (max 4 per call).

### Round 1: Project Basics

1. **Project root** — "Is the current directory the project root, or is the source code in a subdirectory?"
   - Options: "Current directory is root", "Source is in a subdirectory", "This is a monorepo"

2. **Project scope** — "What does this project include?"
   - Options: "Frontend only", "Frontend + Backend", "Backend only", "Full-stack monorepo"

3. **Your role** — "What's your primary role on this project?"
   - Options: "Frontend developer", "Backend developer", "Full-stack developer", "Tech lead"

### Round 2: Commands & Paths (based on Round 1)

- **If subdirectory/monorepo:** Ask where npm/build commands run from (relative path)
- **If FE+BE or full-stack:** Ask backend technology (Java Maven/Gradle, Node Express/Fastify/Nest, Python Django/Flask/FastAPI, Other)
- **If FE+BE:** Ask backend code location (relative path)

### Round 3: Workflow Preferences

1. **Git workflow** — branching strategy (feature/main, feature/develop, trunk-based, other)
2. **Command runner** — npm, yarn, pnpm, or bun

### Round 4: MCP Configuration

Ask if user wants MCP (Model Context Protocol) servers. Describe briefly: live documentation (Context7), database access, browser testing, code intelligence.

**If "No":** Skip to Phase 2.

**If "Yes":** Check Node.js version. MCP servers need Node 18+ but run as separate processes (don't affect project's Node).

1. Run `node --version`. If >= 18, use it.
2. If < 18 and nvm available: list Node 18+ versions, let user pick.
3. If no Node 18+: offer to skip MCPs, user can install and rerun `/atta`.

**MCP Recommendations:** Read `.claude/bootstrap/mappings/mcp-mappings.yaml` for stack-specific recommendations. Present with multiSelect AskUserQuestion:
- **Context7** (always recommended) — live, version-specific docs. Requires API key (free tier).
- **Database MCP** (if database detected) — schema inspection, query validation. Needs connection string.
- **Browser MCP** (if frontend detected) — E2E testing, accessibility.
- **Serena** (optional) — semantic code intelligence via language server.

For each selected MCP, gather required config (connection strings, API keys).

> **MCP Security:** Always use env variable references (`${DATABASE_URL}`, `${CONTEXT7_API_KEY}`) — never hardcode credentials. `npx -y` fetches latest versions; for production, pin versions (e.g., `@upstash/context7-mcp@1.2.3`). Add `mcp-config.json` to `.gitignore` if it contains secrets.

---

## Phase 2: Auto-Detection

Scan config files at confirmed project root.

### Tech Stack Detection

#### Package & Runtime
| File | Detects |
|------|---------|
| `package.json` | Dependencies, scripts, browserslist |
| `yarn.lock` / `pnpm-lock.yaml` / `bun.lockb` | Package manager |
| `.nvmrc` / `.node-version` | Node version |

#### Frontend Framework
| Dependency | Detects |
|------------|---------|
| `vue` | Vue.js (v2 vs v3) |
| `react` / `react-dom` | React |
| `@angular/core` | Angular |
| `svelte` | Svelte |
| `next` / `nuxt` / `astro` | Meta-frameworks |

#### Language & Types
| File | Detects |
|------|---------|
| `tsconfig.json` | TypeScript (strict, target, paths) |
| `jsconfig.json` | JavaScript with aliases |

#### Styling
| Indicator | Detects |
|-----------|---------|
| `sass` / `dart-sass` | SCSS |
| `tailwindcss` | Tailwind |
| `styled-components` / `@emotion/react` | CSS-in-JS |

#### Testing
| Indicator | Detects |
|-----------|---------|
| `jest` / `vitest` | Test runner |
| `@testing-library/*` | Testing Library |
| `cypress` / `playwright` / `puppeteer` / `selenium-webdriver` / `@wdio/cli` | E2E framework |

If any detected E2E framework has `triggers_e2e_specialist: true`, generate E2E specialist from `bootstrap/templates/agents/e2e-testing-specialist.template.md`. Attach to `fe-team-lead` (or `project-owner` as fallback).

#### State Management
| Dependency | Detects |
|------------|---------|
| `pinia` / `vuex` | Vue state |
| `redux` / `@reduxjs/toolkit` / `zustand` | React state |

#### Build Tools
| File | Detects |
|------|---------|
| `vite.config.*` | Vite |
| `webpack.config.*` | Webpack |
| `turbo.json` | Turborepo |

#### Backend (if FE+BE)
| File | Detects |
|------|---------|
| `pom.xml` / `build.gradle` | Java |
| `requirements.txt` / `pyproject.toml` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `Gemfile` | Ruby |
| `composer.json` | PHP |

#### Security Tools (cross-cutting)
| Indicator | Detects |
|-----------|---------|
| `.snyk`, `dependabot.yml`, `renovate.json` | Dependency security |
| `.semgrep.yml`, `sonar-project.properties`, `codeql` workflows | SAST |
| `.gitleaks.toml`, `.secrets.baseline` | Secrets scanning |
| `helmet`, `django-csp`, `spring-boot-starter-security` | Security middleware |

If any detected security tool has `triggers_security_specialist: true`, generate `security-specialist`. Attach to `be-team-lead` (or `fe-team-lead` if no backend, or `project-owner` as fallback).

### Detect Conventions

Sample up to 10 source files for: naming conventions, component patterns, import patterns, styling approach, test file location.

### PR Template Detection

Check for an existing PR template at the confirmed project root, in priority order:

| Priority | Path | Platform |
|----------|------|----------|
| 1 | `.github/PULL_REQUEST_TEMPLATE.md` | GitHub |
| 2 | `.github/pull_request_template.md` | GitHub (lowercase) |
| 3 | `.github/PULL_REQUEST_TEMPLATE/` directory | GitHub (multiple templates) |
| 4 | `.gitlab/merge_request_templates/` directory | GitLab |
| 5 | `.azuredevops/pull_request_template.md` | Azure DevOps |
| 6 | `docs/pull_request_template.md` | GitHub (fallback location) |

Stop at the first match. For directories (priorities 3–4), use `default.md` if it exists, otherwise the first `.md` file alphabetically.

If found: note the path and read the template content for use in Phase 3 and Phase 4.

---

## Phase 3: Reconcile & Confirm

Present detected stack to user: project root, command directory, package manager, frontend stack, backend stack, security tooling, agents to activate (including security-specialist (if triggered)), and PR template (if detected — show path and platform). Wait for confirmation before writing files.

---

## Phase 4: Generate Files

### project-context.md

Write `.claude/knowledge/project/project-context.md`:

```markdown
# Project Context

## Tech Stack
- **Frontend**: [Framework] [Version]
- **Language**: [TypeScript/JavaScript]
- **Styling**: [Approach]
- **Testing**: [Framework]
- **Build**: [Tool]
- **Backend**: [Technology] (or N/A)
- **Package Manager**: [npm/yarn/pnpm/bun]

## Key Paths
- **Project root**: [path]
- **Command directory**: [path] (where to run npm/yarn — may differ from root)
- **Source**: [path]
- **Components**: [path]
- **Tests**: [path]
- **Backend**: [path] (if applicable)

## Build Commands
- **Dev/Build/Test/Lint**: [commands]

## Git Workflow
- **Base branch**: [main/develop]
```

### Pattern Files

| Detected | File Created |
|----------|-------------|
| Vue 3/2 | `patterns/vue-patterns.md` |
| React | `patterns/react-patterns.md` |
| Angular | `patterns/angular-patterns.md` |
| TypeScript | `patterns/typescript-patterns.md` |
| SCSS / Tailwind | `patterns/scss-patterns.md` or `tailwind-patterns.md` |
| Jest / Vitest | `patterns/testing-patterns.md` |
| Java / Python / Node backend | `patterns/[tech]-patterns.md` |

Each pattern file: key rules from existing code, anti-patterns, conventions, doc references.

### PR Template (conditional)

**If a PR template was detected in the PR Template Detection step (Phase 2):**

1. Read the detected template's full content
2. Overwrite `.claude/knowledge/templates/pr-template.md` with a mapped version that:
   - Keeps the standard Atta frontmatter (`applyTo`, `description`)
   - Keeps the Atta file structure (Header, Suggested Commit Message, PR Title, PR Description)
   - Adds a **"Project PR Template"** section containing the original template verbatim in a code block (use a longer fence like ```````` or `~~~~` if the template itself contains triple backticks)
   - Adds a **"Section Mapping"** table showing how Atta's PR Description subsections (Summary, Changes, Verification, Notes) map to the project template's sections
   - Instructs the AI: "Format the PR Description body to match the project's template structure below, while preserving all Atta content (summary, changes, verification, notes). Sections from the project template that have no Atta equivalent should be included with a placeholder comment."

**If no PR template was detected:** Do nothing — the default `pr-template.md` shipped with the framework is already in place.

### BE Team Lead

- **FE only:** No be-team-lead. Project-owner handles backend-adjacent questions.
- **FE+BE:** Generate be-team-lead from bootstrap template. Delegates to BE specialists, coordinates with fe-team-lead.

Update `.claude/agents/INDEX.md` routing table.

---

## Phase 5: Report — Hierarchy & Routing

Generate and display:
1. **Agent registry table**: Agent, ID, Role, Reports To
2. **Hierarchy visualization**: Tree showing Project Owner → Team Leads → Specialists + Core agents
3. **Routing rules table**: Task Pattern → Route To (based on detected stack)

Write all to `.claude/agents/INDEX.md` with auto-generated header and timestamp.

---

## Phase 6: Configure MCP Servers

If user selected MCPs, write `.claude/knowledge/project/mcp-config.json`:

```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "{{NPX_PATH}}",
      "args": ["-y", "@upstash/context7-mcp@<pinned-version>"],
      "env": {
        "PATH": "{{NODE_BIN_PATH}}:...",
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

**Variables:** `{{NPX_PATH}}` = full nvm path or `"npx"`. Always expand `~` to full path (tilde doesn't work in JSON). Include `PATH` env only if using nvm. Use env variable references for all credentials.

For agents with MCP access, add an "MCP Capabilities" section to their generated definition.

---

## Phase 7: Generate Manifest

Write `.claude/.metadata/generated-manifest.json` tracking: version (`{{FRAMEWORK_VERSION}}`), timestamp, project root, detected stack array, and all generated files (agents with templates, patterns, config). Also list configured MCP servers.

Update `.metadata/last-init` with current timestamp.

---

## Phase 8: Create File Manifest

Write `.claude/.metadata/file-manifest.json` for the update system. Minimal skeleton:

```json
{
  "framework_version": "{{FRAMEWORK_VERSION}}",
  "user_version": "{{USER_VERSION}}",
  "manifest_created": "{{TIMESTAMP}}",
  "last_update": "{{TIMESTAMP}}",
  "files": {
    "path/to/file": {
      "source": "framework|generated|user",
      "customized": false,
      "safe_to_replace": true,
      "framework_hash": "{{HASH}}",
      "user_hash": "{{HASH}}"
    }
  },
  "classification": {
    "tier_1_safe_replace": ["bootstrap/**", "docs/**", "skills/*/SKILL.md", "knowledge/templates/**"],
    "tier_2_merge_required": ["agents/project-owner.md", "agents/librarian.md", "agents/code-reviewer.md", "agents/business-analyst.md", "agents/qa-validator.md", "agents/pr-manager.md", "agents/rubber-duck.md"],
    "tier_3_never_touch": ["agents/memory/**", "knowledge/project/**", "knowledge/accs/**", "agents-config.json", "settings.local.json", ".metadata/file-manifest.json", ".metadata/framework-version", ".metadata/update-history.json"],
    "generated_optional": ["agents/coordinators/**", "agents/specialists/**", "knowledge/patterns/**", "agents/INDEX.md"]
  }
}
```

Populate `files` with one entry per generated/framework file. For `"generated"` sources, add `"regenerate_on_init": true` and `"template": "<template-name>"`.

> **PR template override:** If a custom `pr-template.md` was generated in Phase 4 (mapped to project's existing PR template), classify `knowledge/templates/pr-template.md` as `tier_3_never_touch` instead of `tier_1_safe_replace` — it contains project-specific mapping that must not be overwritten by framework updates.

Also write `.claude/.metadata/framework-version` (`{{FRAMEWORK_VERSION}}`) and `.claude/.metadata/update-history.json` with initial setup entry.

---

## Phase 9: Report

Display initialization summary: files created/updated, active agents table, quick start commands (`/agent fe-team-lead`, `/review`, `/preflight`), next steps (`/atta --rescan`, `/agent librarian`).

---

## Rescan Mode (`--rescan`)

- Skip user interview (reuse answers from project-context.md)
- Re-detect tech stack from config files
- Re-check for PR templates (if one is now present or changed, regenerate `pr-template.md` mapping)
- Update pattern files with new findings
- Preserve manual edits (only update auto-generated sections)
- Report what changed

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Detection fails (no clear stack) | Confirm correct root/subdirectory, state stack explicitly, or continue with minimal core-agent setup |
| Path errors (wrong directory) | Provide valid relative path, use current dir as root, or skip path-specific detection |
| MCP blocked (Node < 18) | Select installed Node 18+, install it, or skip MCPs (rerun `/atta` later) |
| Write failure (permissions) | Check `.claude/` write permissions, share failing path, or regenerate with `--rescan` |

---

## Related Skills

- `/agent librarian` — Capture additional patterns and directives
- `/agent fe-team-lead` / `/agent be-team-lead` — Task decomposition
- `/review` — Review against generated patterns
- `/preflight` — Full pre-PR validation

---

_Interactive project setup with tech stack detection_
