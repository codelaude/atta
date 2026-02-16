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

### Round 4: MCP Configuration (NEW in v2.0)

**First, explain what MCPs are and ask if user wants them:**

Use AskUserQuestion:

```
Question: "Would you like to configure MCP (Model Context Protocol) servers?"

Options:
- "Yes, configure MCPs (Recommended)" — Adds live documentation, database access, and other AI capabilities
- "No, skip for now" — You can configure later by rerunning `/init`

Description for "Yes" option:
"MCP servers extend AI capabilities with:
- Context7: Live, version-specific documentation for your frameworks
- Database MCP: Direct schema inspection and query validation
- Browser MCP: Accessibility testing and DOM inspection
- Runs as separate processes (won't affect your project's Node version)"
```

**If user selects "No":** Skip to Phase 2 (Auto-Detection).

**If user selects "Yes":** Continue with Node.js detection below.

---

**Node.js Detection (only runs if user wants MCPs):**

> "MCP servers require Node.js 18+. Let me check your Node setup..."

MCP servers are **separate processes** independent of the project's Node version.

**Detection steps:**

1. **Check current Node**: Run `node --version`
2. **If using nvm**: List available versions with `nvm list` or check `~/.nvm/versions/node/`
3. **Parse and filter**: Find all installed Node versions >= 18.0.0

**If current Node >= 18.0.0:**
- Use current Node for MCPs
- Continue to MCP recommendations

**If current Node < 18.0.0 (e.g., project uses Node 14):**
> "Your project uses Node v14.19.0. MCP servers need Node 18+, but will run separately (your project stays on v14)."

- Check if nvm has Node 18+ installed
- **If yes**: Use AskUserQuestion to select which Node 18+ version to use for MCPs:
  ```
  Which Node version should MCPs use?
  - Node v22.22.0 (Recommended)
  - Node v20.11.0
  - Node v18.19.0
  - I'll install Node 18+ first
  - Skip MCP configuration
  ```
- **If "I'll install Node 18+ first"**: Skip MCP configuration and inform user to rerun `/init` after installing Node 18+. Continue to Phase 2 (Auto-Detection).
- **If "Skip MCP configuration"**: Skip MCP configuration. Continue to Phase 2 (Auto-Detection).
- **If no**: Offer to install Node 18+ or skip MCPs

**Result**: MCP configs use the selected Node 18+ version's npx path, project stays on its own Node version.

---

**MCP Recommendations (only if Node 18+ available):**

Build recommendations by reading `.claude/bootstrap/mappings/mcp-mappings.yaml` and checking detected stack.

Present recommendations, starting with Context7 (always recommended):

```markdown
**Recommended MCP Servers:**

📚 **Context7** (Recommended for all projects)
   - Why: Provides up-to-date, version-specific documentation and code examples directly in your prompt
   - Access: All agents
   - Setup: `npx -y @upstash/context7-mcp`
   - ⚠️  **Requires API key** (free tier available): https://console.upstash.com/context7
   - Free and open source: https://github.com/upstash/context7

💾 **Database MCP** (High Priority — if database detected)
   - Why: [Database] detected - can inspect schemas and validate queries
   - Access: [database specialist], be-team-lead
   - ⚠️  Requires: Database connection string (read-only recommended)
   - ⚠️  **Security**: Connection strings are stored in plain text in `mcp-config.json`. Use environment variables (e.g., `${DATABASE_URL}`) instead of hardcoded credentials. Add `mcp-config.json` to `.gitignore` if it contains secrets.

🌐 **Browser MCP** (Medium Priority — if frontend detected)
   - Why: Frontend project - helps with E2E testing and accessibility validation
   - Access: accessibility, tester, fe-team-lead

🔍 **Serena** (Optional — code intelligence)
   - Why: Semantic code understanding via language server (30+ languages)
   - Access: code-reviewer, fe-team-lead, be-team-lead
   - Setup: `uvx serena --workspace .`
   - Note: Most valuable for Cursor/Claude Desktop users. Claude Code has built-in code navigation.
   - Free and open source: https://github.com/oraios/serena

Would you like to configure MCP servers?
```

Use AskUserQuestion with multiSelect enabled:
- Context7 (Recommended)
- Database MCP
- Browser MCP
- Serena (code intelligence)
- Filesystem MCP (if monorepo)
- None - skip MCP configuration

For each selected MCP, gather required config (connection strings, etc.)

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
| Agent | ID | Aliases | Role | Reports To |
|-------|-----|---------|------|------------|
| Project Owner | `project-owner` | `orchestrator` | Routes tasks | User |
{{#if HAS_FRONTEND}}
| FE Team Lead | `fe-team-lead` | `lead` | FE Coordinator | Project Owner |
{{#each FRONTEND_SPECIALISTS}}
| {{name}} | `{{id}}` | - | {{role}} | FE Team Lead |
{{/each}}
{{/if}}
{{#if HAS_BACKEND}}
| BE Team Lead | `be-team-lead` | - | BE Coordinator | Project Owner |
{{#each BACKEND_SPECIALISTS}}
| {{name}} | `{{id}}` | - | {{role}} | BE Team Lead |
{{/each}}
{{/if}}
| Code Reviewer | `code-reviewer` | `reviewer` | Quality review | Team Leads |
| ... | ... | ... | ... | ... |
```

### Build Hierarchy Visualization

```
Project Owner (orchestrator)
{{#if HAS_FRONTEND}}
├── FE Team Lead (coordinator)
{{#each FRONTEND_SPECIALISTS}}
│   ├── {{id}} ({{role}})
{{/each}}
{{/if}}
{{#if HAS_BACKEND}}
├── BE Team Lead (coordinator)
{{#each BACKEND_SPECIALISTS}}
│   ├── {{id}} ({{role}})
{{/each}}
{{/if}}
├── Code Reviewer (cross-domain)
├── QA Validator (qa)
├── Business Analyst (ba)
├── PR Manager (pr)
├── Rubber Duck (guided learning)
└── Librarian (knowledge keeper)
```

### Build Routing Rules

Auto-generate routing based on specialists:

```markdown
| Task Pattern | Route To |
|-------------|----------|
{{#if HAS_FRONTEND}}
| New {{FRAMEWORK}} component | fe-team-lead → {{FRAMEWORK}} |
| Styling / {{STYLING}} | fe-team-lead → {{STYLING}} |
| Accessibility / WCAG | fe-team-lead → accessibility |
{{/if}}
{{#if HAS_BACKEND}}
| {{BACKEND_FRAMEWORK}} API endpoint | be-team-lead → {{BACKEND_FRAMEWORK}} |
| {{DATABASE}} query / schema | be-team-lead → {{DATABASE}} |
{{/if}}
| Code review | code-reviewer |
| Requirements | business-analyst |
| "Remember to..." | librarian |
```

### Write INDEX.md

Write to `.claude/agents/INDEX.md` with:
- Auto-generated header comment
- Registry table
- Hierarchy
- Routing rules
- Timestamp

---

## Phase 6: Configure MCP Servers (NEW)

If user selected MCP servers, generate configuration:

### Security: Connection Strings

> **Important:** If the user provides database connection strings or other credentials, use environment variable references (e.g., `${DATABASE_URL}`) in the config file instead of hardcoded values. Warn the user that `mcp-config.json` will be stored in plain text and should be added to `.gitignore` if it contains secrets. Never commit credentials to version control.

### Node.js Path Detection (Critical for nvm users)

Use the Node version selected in Round 4 (not necessarily the project's current Node):

1. **If nvm is installed:**
   - Use the **Node version selected by user** (e.g., v22.22.0 even if project uses v14)
   - Build full npx path: `~/.nvm/versions/node/v{SELECTED_VERSION}/bin/npx`
   - Build PATH env var: `~/.nvm/versions/node/v{SELECTED_VERSION}/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
   - Use full path for `command` field
   - Include PATH in `env` field
2. **If nvm is NOT installed:**
   - Use `"npx"` directly as command
   - Assume global Node 18+ is available

**Key principle:** MCP servers run as separate processes with their own Node version. They don't affect the project's Node version. A Node 14 project can have MCPs running on Node 22.

### Write MCP Config

> **CRITICAL SECURITY WARNING:**
>
> The generated config uses `npx -y` with unpinned package versions for quick setup. This means:
> - ⚠️ **Every MCP start fetches the latest npm package version**
> - ⚠️ **Compromised packages can execute arbitrary code with access to API keys and database credentials**
> - ⚠️ **This affects ALL projects initialized with `/init` if packages are compromised**
>
> **For production or sensitive environments:**
> 1. Pin to specific, audited versions: `"args": ["-y", "@upstash/context7-mcp@1.2.3"]`
> 2. Verify package integrity before use
> 3. Consider vendoring/installing packages locally instead of using `npx`
> 4. Use read-only database credentials where possible
>
> The examples below use unpinned versions for development convenience only.

File: `.claude/knowledge/project/mcp-config.json`

```json
{
  "mcpServers": {
    {{#if CONTEXT7_SELECTED}}
    "context7": {
      "type": "stdio",
      "command": "{{NPX_PATH}}",
      "args": ["-y", "@upstash/context7-mcp"],  // Consider pinning: "@upstash/context7-mcp@1.2.3"
      "env": {
        {{#if USING_NVM}}
        "PATH": "{{NODE_BIN_PATH}}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        {{/if}}
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }{{#if HAS_DATABASE_MCP}},{{/if}}
    {{/if}}
    {{#if HAS_DATABASE_MCP}}
    "{{DATABASE_TYPE}}": {
      "type": "stdio",
      "command": "{{NPX_PATH}}",
      "args": ["-y", "@modelcontextprotocol/server-{{DATABASE_TYPE}}"],  // Consider pinning version
      "env": {
        {{#if USING_NVM}}
        "PATH": "{{NODE_BIN_PATH}}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        {{/if}}
        "{{DATABASE_ENV_VAR}}": "${DATABASE_URL}"
      }
    }
    {{/if}}
  }
}
```

> **Note:** This format is compatible with Claude Desktop and Cursor. The `mcpServers` object uses server IDs as keys.

**Variables to substitute:**
- `{{NPX_PATH}}`: Full expanded path to npx if using nvm (e.g., `/Users/username/.nvm/versions/node/v22.22.0/bin/npx` on Unix or `C:\Users\username\AppData\Roaming\nvm\v22.22.0\npx.cmd` on Windows), or just `"npx"` if not using nvm. **Important:** Always expand `~` to full home directory path - tilde expansion doesn't work in JSON configs.
- `{{NODE_BIN_PATH}}`: Full expanded path to Node bin directory if using nvm (e.g., `/Users/username/.nvm/versions/node/v22.22.0/bin` or `C:\Users\username\AppData\Roaming\nvm\v22.22.0`)
- `{{USING_NVM}}`: Boolean - true if nvm detected
- `{{CONTEXT7_API_KEY}}`: Always use environment variable reference `${CONTEXT7_API_KEY}` - never hardcode the key. Remind user to set this in their environment or `.env` file.

> **Security Notes:**
>
> **Credentials:**
> - Never hardcode credentials - always use environment variable references (e.g., `${DATABASE_URL}`, `${CONTEXT7_API_KEY}`)
> - Add `mcp-config.json` to `.gitignore` if it contains secrets
> - Use read-only database credentials where possible
>
> **Supply-Chain Security (CRITICAL):**
> - The generated config uses unpinned versions (`npx -y @upstash/context7-mcp`) for quick setup
> - **This is a development convenience, NOT production-ready**
> - For production: pin to specific, audited versions (e.g., `@upstash/context7-mcp@1.2.3`)
> - Alternative: Install packages locally and reference them directly instead of using `npx`
> - Remember: MCPs run with access to all secrets in the `env` section

### Add MCP Sections to Generated Agents

For agents with MCP access, ensure their generated content includes:

```markdown
## MCP Capabilities

This agent has access to:
- **{{MCP_NAME}}**: {{DESCRIPTION}}

Use for:
- {{USE_CASE_1}}
- {{USE_CASE_2}}
```

---

## Phase 7: Generate Manifest (NEW)

Create tracking manifest for all generated files.

File: `.claude/.metadata/generated-manifest.json`

```json
{
  "version": "2.0",
  "generated_at": "{{TIMESTAMP}}",
  "project_root": "{{PROJECT_ROOT}}",
  "detected_stack": ["vue", "typescript", "scss", "python", "django", "postgresql"],
  "generated_files": {
    "agents": [
      {
        "file": ".claude/agents/coordinators/fe-team-lead.md",
        "template": "fe-team-lead.template.md",
        "technology": "coordinator",
        "timestamp": "{{TIMESTAMP}}"
      },
      {
        "file": ".claude/agents/specialists/vue.md",
        "template": "framework-specialist.template.md",
        "technology": "vue",
        "version": "3.2.0",
        "timestamp": "{{TIMESTAMP}}"
      },
      ...
    ],
    "patterns": [
      ".claude/knowledge/patterns/vue-patterns.md",
      ".claude/knowledge/patterns/python-patterns.md",
      ...
    ],
    "config": [
      ".claude/knowledge/project/project-context.md",
      ".claude/knowledge/project/mcp-config.json",
      ".claude/agents/INDEX.md"
    ]
  },
  "mcp_servers_configured": ["context7", "postgres"]
}
```

Update `.metadata/last-init` with current timestamp.

---

## Phase 8: Create File Manifest (NEW v2.1)

Create file tracking manifest for the update system.

File: `.claude/.metadata/file-manifest.json`

This manifest enables the `/update` skill to track which files are framework vs user content, allowing safe framework updates that preserve customizations.

```json
{
  "framework_version": "2.0",
  "user_version": "2.0",
  "manifest_created": "{{TIMESTAMP}}",
  "last_update": "{{TIMESTAMP}}",
  "files": {
    "bootstrap/": {
      "source": "framework",
      "customized": false,
      "safe_to_replace": true,
      "framework_hash": "{{CALCULATED_HASH}}"
    },
    "docs/": {
      "source": "framework",
      "customized": false,
      "safe_to_replace": true
    },
    "skills/init/SKILL.md": {
      "source": "framework",
      "customized": false,
      "safe_to_replace": true
    },
    "agents/project-owner.md": {
      "source": "framework",
      "customized": false,
      "requires_merge": false,
      "framework_hash": "{{CALCULATED_HASH}}",
      "user_hash": "{{CALCULATED_HASH}}",
      "customizations": {
        "personality_name": null,
        "sections_modified": [],
        "rules_added": false
      }
    },
    "agents/coordinators/fe-team-lead.md": {
      "source": "generated",
      "regenerate_on_init": true,
      "template": "fe-team-lead.template.md"
    },
    "agents/specialists/vue.md": {
      "source": "generated",
      "regenerate_on_init": true,
      "template": "framework-specialist.template.md",
      "technology": "vue"
    },
    "knowledge/patterns/vue-patterns.md": {
      "source": "generated",
      "regenerate_on_init": false,
      "template": "vue-patterns.template.md",
      "note": "Pattern files evolve with project, not updated by framework"
    },
    "knowledge/project/project-context.md": {
      "source": "user",
      "protected": true,
      "never_touch": true
    },
    "agents-config.json": {
      "source": "user",
      "protected": true,
      "never_touch": true
    },
    "settings.local.json": {
      "source": "user",
      "protected": true,
      "never_touch": true
    }
  },
  "classification": {
    "tier_1_safe_replace": [
      "bootstrap/**/*",
      "docs/**/*",
      "skills/*/SKILL.md",
      "knowledge/templates/**/*"
    ],
    "tier_2_merge_required": [
      "agents/project-owner.md",
      "agents/librarian.md",
      "agents/rubber-duck.md",
      "agents/code-reviewer.md",
      "agents/business-analyst.md",
      "agents/qa-validator.md",
      "agents/pr-manager.md"
    ],
    "tier_3_never_touch": [
      "agents/memory/**/*",
      "agents/legacy/**/*",
      "knowledge/project/**/*",
      "knowledge/accs/**/*",
      "agents-config.json",
      "settings.local.json"
    ],
    "generated_optional": [
      "agents/coordinators/**/*",
      "agents/specialists/**/*",
      "knowledge/patterns/**/*",
      "agents/INDEX.md",
      "skills/generated/**/*"
    ]
  }
}
```

Also create `.claude/.metadata/framework-version`:
```
2.0
```

And `.claude/.metadata/update-history.json`:
```json
{
  "updates": [
    {
      "type": "initial-setup",
      "timestamp": "{{TIMESTAMP}}",
      "notes": "Project initialized with bootstrap system v2.0"
    }
  ]
}
```

These files enable the update system:
- Users can run `/update check` to check for framework updates
- Users can run `/update pull` to safely update framework files
- All customizations will be preserved during updates

---

## Phase 9: Report

```markdown
## ✅ Initialization Complete

### 🎉 Bootstrap System v2.0

Your project now has a **dynamically generated agent team** tailored to your tech stack!

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
