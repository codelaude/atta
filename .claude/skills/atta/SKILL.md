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

## Step 0: Adapter Detection (BEFORE anything else)

Determine which AI tool is running this skill by checking which directories exist in the project root. This controls where you read bootstrap assets from and where you write generated files.

**Detect adapter:**
1. If `.claude/skills/` exists → **Claude Code** (native)
2. Else if `.atta/bootstrap/` exists → **Non-Claude adapter** (Copilot, Codex, or Gemini)
3. If neither exists → Warn the user: "Bootstrap assets not found. Run `npx atta-dev init --adapter <tool>` first to install the framework, then re-run /atta."

**Resolve paths based on adapter:**

| Path variable | Claude Code | Copilot (`.github/skills/`) | Codex (`.agents/skills/`) | Gemini (`.gemini/commands/`) |
|---------------|-------------|---------------------------|-------------------------|---------------------------|
| `{bootstrapDir}` | `.atta/bootstrap` | `.atta/bootstrap` | `.atta/bootstrap` | `.atta/bootstrap` |
| `{knowledgeDir}` | `.atta/knowledge` | `.atta/knowledge` | `.atta/knowledge` | `.atta/knowledge` |
| `{agentsDir}` | `.claude/agents` | `.github/atta/agents` | `.agents/agents` | `.gemini/agents` |
| `{metadataDir}` | `.atta/.metadata` | `.atta/.metadata` | `.atta/.metadata` | `.atta/.metadata` |

**Sub-detect non-Claude adapter** (if `.atta/bootstrap/` was found):
- If `.github/skills/` exists → Copilot → agents go to `.github/atta/agents/`
- Else if `.agents/skills/` exists → Codex → agents go to `.agents/agents/`
- Else if `.gemini/commands/` exists → Gemini → agents go to `.gemini/agents/`

**All paths below use these variables.** Substitute `.atta/bootstrap/` → `{bootstrapDir}/`, `.atta/knowledge/` → `{knowledgeDir}/`, `.claude/agents/` → `{agentsDir}/`, `.atta/.metadata/` → `{metadataDir}/`.

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

Ask if user wants MCP servers (live docs, database access, browser testing, code intelligence). If no, skip to Phase 2.

If yes: verify Node 18+ (check `node --version`, try nvm if needed, offer to skip if unavailable). Read `.atta/bootstrap/mappings/mcp-mappings.yaml` for stack-specific recommendations. Present multiSelect: Context7 (always), Database MCP (if DB detected), Browser MCP (if FE), Serena (optional). Gather required config per selection.

> **Security:** Use env variable references for credentials (`${VAR}`). Pin versions in production. Add `mcp-config.json` to `.gitignore` if it contains secrets.

---

## Phase 2: Auto-Detection

Scan config files at confirmed project root.

### Tech Stack Detection

Load detection rules from `.atta/bootstrap/detection/` YAML files:
- `frontend-detectors.yaml` — frameworks, styling, state management
- `backend-detectors.yaml` — languages, frameworks, databases
- `database-detectors.yaml` — database engines and ORMs
- `tools-detectors.yaml` — build tools, package managers, testing frameworks
- `security-detectors.yaml` — dependency security, SAST, secrets scanning
- `architectural-detectors.yaml` — project structure patterns

Scan `package.json` (dependencies, scripts), lock files (package manager), config files (`tsconfig.json`, `vite.config.*`, etc.), and tool configs at confirmed project root. Match against YAML detector rules.

#### Security Tools (cross-cutting)

Security detection is handled by `security-detectors.yaml` (dependency security, SAST, secrets scanning, security middleware).

**Specialist triggers:**
- E2E framework with `triggers_e2e_specialist: true` → generate E2E specialist, attach to `fe-team-lead` (or `project-owner`)
- Security tool with `triggers_security_specialist: true` → generate `security-specialist`, attach to `be-team-lead` (or `fe-team-lead`, or `project-owner`)

### Detect Conventions

Sample up to 10 source files from `src/` or `lib/` (Read tool, no shell). Detect dominant patterns for:
- **Naming**: functions, variables, constants, interfaces/types, CSS classes (camelCase/snake_case/PascalCase/UPPER_SNAKE_CASE/kebab-case/BEM/IPrefix)
- **Documentation**: jsdoc, inline comments, or minimal

ESLint/Prettier/EditorConfig rules override file sampling when present. Mark "mixed" if no clear dominant pattern. Skip entirely if fewer than 3 source files.

Hold results in memory as `conventions: { functions, variables, constants, interfaces, cssClasses, documentation }` for Phase 4.

### Architectural Pattern Extraction

Load rules from `.atta/bootstrap/detection/architectural-detectors.yaml`. For each category (structure, components, routes, api, state), check `directory_exists`, `file_patterns`, and `files` conditions (AND logic). Hold matched patterns in memory for Phase 4. Only include categories with a match.

### PR Template Detection

Check (in order): `.github/PULL_REQUEST_TEMPLATE.md`, lowercase variant, `.github/PULL_REQUEST_TEMPLATE/` dir, `.gitlab/merge_request_templates/`, `.azuredevops/pull_request_template.md`, `docs/pull_request_template.md`. Stop at first match. For directories, use `default.md` or first `.md` alphabetically. Read content for Phase 3/4.

---

## Phase 3: Reconcile & Confirm

Present detected stack to user: project root, command directory, package manager, frontend stack, backend stack, security tooling, agents to activate (including security-specialist (if triggered)), PR template (if detected — show path and platform), detected conventions (naming + documentation style, if detected), and architectural patterns (if detected — list matched categories with descriptions). Wait for confirmation before writing files.

---

## Phase 4: Generate Files

### project-context.md

Write `.atta/project/project-context.md`:

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

## Architectural Patterns
[Only include if architectural pattern extraction detected matches. Max 10 lines. Example:]
- **Structure**: Feature-sliced design (features/, entities/, shared/)
- **Components**: Co-located components (index + styles per folder)
- **Routing**: File-based routing (pages/ or app/)
- **API**: Service layer abstraction (services/)
- **State**: Store-per-feature pattern
```

> The `## Architectural Patterns` section is only written if at least one pattern was detected. Use the `description` field from the matched detector in `architectural-detectors.yaml`. Omit categories with no match. On `--rescan`, replace this section entirely with fresh detection results — but if the user has manually edited it (added lines not matching any detector description), preserve those manual additions at the end.

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

If a PR template was detected: overwrite `.atta/knowledge/templates/pr-template.md` with a mapped version keeping Atta frontmatter + structure, adding the project template verbatim in a code block, a section mapping table, and instructions to format PR descriptions matching the project's structure while preserving Atta content.

If no PR template detected: do nothing (default `pr-template.md` is already in place).

### Pre-Fill Project Profile

If convention detection produced results, update `.atta/project/project-profile.md`:
- **Naming Conventions**: replace placeholder values (e.g., `[camelCase / snake_case / PascalCase]`) with detected values. Skip "mixed" conventions. Add `_Auto-detected from project source. Edit if needed._`
- **Documentation**: check the matching checkbox (jsdoc/inline/minimal). Leave unchecked if "mixed".

> Only pre-fill sections without existing `[x]` checkboxes. Never overwrite user selections.

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

If user selected MCPs, write `.atta/project/mcp-config.json` with `mcpServers` entries. Each entry: `type: "stdio"`, `command` (full npx path — expand `~`, no tilde in JSON), `args` (with pinned version), `env` (credentials as `${VAR}` references, `PATH` only if using nvm).

For agents with MCP access, add an "MCP Capabilities" section to their generated definition.

---

## Phase 7: Generate Manifest

Write `.atta/.metadata/generated-manifest.json`: version (`{{FRAMEWORK_VERSION}}`), timestamp, project root, detected stack, generated files (with templates), MCP servers. Update `.metadata/last-init`.

---

## Phase 8: Create File Manifest

Write `.atta/.metadata/file-manifest.json` for the update system. Include:
- `framework_version`, `user_version`, `manifest_created`, `last_update`
- `files`: one entry per file with `source` (framework|generated|user), `customized`, `safe_to_replace`, `framework_hash`, `user_hash`. For generated sources, add `regenerate_on_init: true` and `template`.
- `classification` tiers: `tier_1_safe_replace` (bootstrap, docs, skills, templates), `tier_2_merge_required` (core agents), `tier_3_never_touch` (memory, project, ACCs, config, metadata), `generated_optional` (coordinators, specialists, patterns, INDEX.md)

> If a custom `pr-template.md` was generated in Phase 4, classify it as `tier_3_never_touch` (not tier 1).

Also write `.atta/.metadata/framework-version` and `.atta/.metadata/update-history.json` with initial setup entry.

---

## Phase 9: Report

Display initialization summary: files created/updated, active agents table, quick start commands (`/agent fe-team-lead`, `/review`, `/preflight`), next steps (`/atta --rescan`, `/agent librarian`).

---

## Rescan Mode (`--rescan`)

Skip interview (reuse `project-context.md`). Re-detect: tech stack, architectural patterns (preserve manual additions), PR templates. Update pattern files. Preserve manual edits.

**Profile sync**: If either profile file has checked items, run `/profile --apply` logic (Steps 5-6) — write `## Preferences` to `project-context.md`.

**Staleness reset**: Record mtimes of detection source files in `generated-manifest.json` `detection_sources`.

Report what changed.

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
