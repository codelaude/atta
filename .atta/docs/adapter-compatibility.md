# Adapter Compatibility Reference

> How Atta works across different AI development tools.

Atta supports five adapters. Each installs a different file structure optimized for the target tool's discovery mechanism.

---

## Quick Reference

| Aspect | Claude Code | Copilot CLI | Codex CLI | Gemini CLI | Cursor |
|--------|-------------|-------------|-----------|------------|--------|
| **Instruction file** | `CLAUDE.md` | `AGENTS.md` + `.github/copilot-instructions.md` | `AGENTS.md` (multi-level) | `GEMINI.md` (hierarchical) | `AGENTS.md` |
| **Skill location** | `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` | `.agents/skills/*/SKILL.md` | `.gemini/commands/*.toml` | `.cursor/rules/atta-*.mdc` |
| **Skill invocation** | `/skill-name` | `/skill-name` | `$skill-name` | `/command-name` | `@atta-skill-name` |
| **Skill format** | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | TOML (description + prompt) | MDC (Markdown + YAML frontmatter) |
| **Agent definitions** | `.claude/agents/*.md` | `.github/atta/agents/*.md` | `.agents/agents/*.md` | `.gemini/agents/*.md` | `.cursor/agents/*.md` |
| **Bootstrap assets** | `.atta/bootstrap/` | `.atta/bootstrap/` | `.atta/bootstrap/` | `.atta/bootstrap/` | `.atta/bootstrap/` |
| **Agent generation** | Full (`/atta` bootstrap) | `/atta` with adapter detection | `/atta` with adapter detection | `/atta` with adapter detection | `@atta-atta` with adapter detection |
| **Session tracking** | Yes (hooks) | No | No | No | No |
| **Project-scoped** | Yes | Yes | Yes | Commands yes, extensions no | Yes |

---

## Claude Code (Full Support)

Claude Code is the primary adapter with complete framework support.

### What Gets Installed
```
project/
├── .claude/                      # Claude Code-specific files
│   ├── agents/                   # Core + generated agents
│   ├── hooks/                    # Session tracking hook
│   ├── skills/*/SKILL.md         # Skill definitions
│   └── settings.local.json       # Hook config + permissions
├── .atta/                        # Tool-agnostic shared content
│   ├── bootstrap/                # Tech detection + templates
│   ├── docs/
│   ├── knowledge/
│   ├── scripts/
│   ├── .context/
│   ├── .metadata/
│   └── .sessions/                # Schema + developer templates
├── .claude-plugin/plugin.json    # Plugin manifest
└── CLAUDE.md                     # Instructions
```

### Discovery Mechanism
- Plugin system reads `plugin.json` which lists skills and agent index
- `CLAUDE.md` is the primary instruction file
- Skills invoked as `/skill-name` slash commands

### Unique Capabilities
- **Full bootstrap system**: `/atta` detects tech stack and generates specialist agents
- **Session tracking**: Hook-based lifecycle tracking (PostToolUse, Stop events)
- **Pattern detection**: Corrections logged and analyzed over time
- **Developer profile**: Two-layer propagation (generation-time + runtime)
- **Context generation**: `generate-context.sh` produces `.context/recent.md`

### Limitations
- None significant — this is the reference implementation

---

## GitHub Copilot CLI

### What Gets Installed
```
project/
├── .atta/bootstrap/              # Shared bootstrap assets (detection, templates, mappings)
├── .github/
│   ├── copilot-instructions.md   # Repo-level instructions
│   ├── skills/*/SKILL.md         # Skill definitions (conflicts renamed with atta- prefix)
│   └── atta/agents/*.md          # Agent definitions (NOT .github/agents/ — see below)
├── AGENTS.md                     # Agent registry + instructions
└── GETTING-STARTED.md
```

**Important**: Agent definitions go to `.github/atta/agents/`, NOT `.github/agents/`. Copilot reserves `.github/agents/` for its own native agent system which requires specific YAML frontmatter. Our markdown-only agent files placed there cause parse errors.

### Discovery Mechanism

**Instructions** (all merged into context):

| Source | Location | Scope |
|--------|----------|-------|
| Repo instructions | `.github/copilot-instructions.md` | All requests in repo |
| Path-matched instructions | `.github/instructions/*.instructions.md` | Files matching `applyTo:` glob |
| Agent instructions | `AGENTS.md` at repo root | Agent-mode context |
| User instructions | `~/.copilot/copilot-instructions.md` | All sessions |

**Skills** (scanned at startup, loaded on match):

| Priority | Path |
|----------|------|
| 1 | `.github/skills/*/SKILL.md` |
| 2 | `.claude/skills/*/SKILL.md` (alternate) |
| 3 | `~/.copilot/skills/*/SKILL.md` (user) |
| 4 | `~/.copilot/plugins/*/skills/*/SKILL.md` (plugin) |
| 5 | `.agents/skills/*/SKILL.md` (workspace) |

Skills use progressive loading: metadata (name + description) loaded first, full body loaded when matched.

### Skill Invocation
- **Explicit**: `/skill-name` (registered automatically from SKILL.md name)
- **Implicit**: Model auto-selects based on `description` field match
- Controlled by frontmatter: `user-invokable: true`, `disable-model-invocation: false`

### Built-in Conflicts & Renames

Copilot has built-in commands that conflict with some Atta skill names. The adapter automatically renames these:

| Original | Renamed | Reason |
|----------|---------|--------|
| `/review` | `/atta-review` | Copilot has built-in `/review` |
| `/agent` | `/atta-agent` | Copilot has built-in `/agent` for its native agent system |

The SKILL.md files are copied with updated frontmatter `name:` fields. The AGENTS.md command table also reflects the renamed commands.

### What Works (Validated March 2026)
- Instruction files loaded and merged (AGENTS.md + copilot-instructions.md)
- Skills discovered from `.github/skills/` (17/17 skills found)
- Agent definitions available at `.github/atta/agents/`
- `/atta-agent` skill resolves agent files from `.github/atta/agents/` path
- Slash command invocation
- SKILL.md frontmatter parsed (name, description)
- Implicit skill matching by description
- `/atta` skill executes with adapter detection — generates agents to `.github/atta/agents/`, reads bootstrap from `.atta/bootstrap/`

### Limitations
- No session tracking (no hook support)
- No pattern detection or learning
- No runtime profile re-propagation (generation-time injection works via `/atta`; re-run `/atta --rescan` to re-apply after profile changes)

### SKILL.md Frontmatter

```yaml
---
name: review
description: Comprehensive code review with automated pattern checks.
user-invokable: true
---
```

---

## OpenAI Codex CLI

### What Gets Installed
```
project/
├── .atta/bootstrap/              # Shared bootstrap assets (detection, templates, mappings)
├── .agents/
│   ├── skills/*/SKILL.md         # Skill definitions
│   └── agents/*.md               # Agent definitions
├── AGENTS.md                     # Agent registry + instructions
└── GETTING-STARTED.md
```

### Discovery Mechanism

**Instructions** (AGENTS.md, concatenated root-to-leaf):

| Scope | Path | Notes |
|-------|------|-------|
| Global | `~/.codex/AGENTS.md` | Or `AGENTS.override.md` (exclusive) |
| Per-directory | `AGENTS.md` from repo root to CWD | One file per level |
| Fallback | Configurable in `~/.codex/config.toml` | `project_doc_fallback_filenames` |

Size limit: 32 KiB combined across all AGENTS.md files (configurable via `project_doc_max_bytes`).

**Skills** (scanned from multiple paths):

| Priority | Path |
|----------|------|
| 1 | `.agents/skills/` (CWD up to repo root) |
| 2 | `~/.agents/skills/` (user) |
| 3 | `/etc/codex/skills/` (admin) |
| 4 | Built-in (OpenAI-bundled) |

### Skill Invocation

**IMPORTANT**: Codex uses `$skill-name`, NOT `/skill-name`.

- **Explicit**: `$skill-name` prefix in prompt (e.g., `$review src/auth.ts`)
- **Browser**: `/skills` command opens skill picker
- **Implicit**: Model auto-selects based on description (configurable via `allow_implicit_invocation`)
- Slash commands (`/`) are reserved for 26 built-in commands only

### What Works
- AGENTS.md loaded as system prompt context
- Skills discovered from `.agents/skills/`
- Agent definitions available at `.agents/agents/`
- `$agent` skill resolves agent files from `.agents/agents/` path
- `$skill-name` invocation
- `/skills` browser for discovery
- Implicit skill matching

### Limitations
- No session tracking
- No pattern detection or learning
- `$` prefix differs from other tools (users may try `/` first)
- 32 KiB size cap on combined instruction files
- If two skills share a name, neither overrides the other

### SKILL.md Frontmatter

```yaml
---
name: review
description: Comprehensive code review with automated pattern checks.
---
```

Optional: `agents/openai.yaml` in skill directory for `allow_implicit_invocation` control.

---

## Google Gemini CLI

### What Gets Installed
```
project/
├── .atta/bootstrap/              # Shared bootstrap assets (detection, templates, mappings)
├── .gemini/
│   ├── commands/*.toml            # Converted skill commands
│   └── agents/*.md               # Agent definitions
├── GEMINI.md                      # Project context
└── GETTING-STARTED.md
```

### Discovery Mechanism

**Context** (GEMINI.md, hierarchical — all concatenated):

| Level | Path |
|-------|------|
| Global | `~/.gemini/GEMINI.md` |
| Project | `<git-root>/GEMINI.md` (and parent dirs) |
| JIT | GEMINI.md in any directory tools access |

Supports `@file.md` import syntax for modular composition. Managed via `/memory` commands at runtime.

**Commands** (TOML files):

| Scope | Path |
|-------|------|
| Global | `~/.gemini/commands/*.toml` |
| Project | `<project>/.gemini/commands/*.toml` |
| Extension | `~/.gemini/extensions/*/commands/*.toml` |

Subdirectories create namespaced commands: `.gemini/commands/git/commit.toml` becomes `/git:commit`.

**Extensions** (global only):

Extensions live in `~/.gemini/extensions/` and are installed via `gemini extensions install <source>`. There is **no project-scoped extension directory** — extensions are strictly user-global.

### Skill → TOML Conversion

Atta converts SKILL.md files to TOML format:

```toml
description = "One-line description from frontmatter"

prompt = """
Full SKILL.md body content here.
Supports {{args}} for argument injection.
"""
```

Also supports `!{shell command}` execution and `@{file/path}` content embedding.

### What Works
- GEMINI.md loaded as project context
- Custom commands from `.gemini/commands/*.toml`
- Agent definitions available at `.gemini/agents/`
- `/agent` skill (via TOML command) resolves agent files from `.gemini/agents/` path
- Slash command invocation (`/command-name`)
- Argument passing via `{{args}}`
- `/memory` commands for context management

### Limitations
- No session tracking
- No pattern detection or learning
- Extensions are global only — no project-scoped extension directory
- TOML escaping required for backslashes and triple quotes in skill content
- Session restart may be needed after adding new TOML files
- Name conflicts: extension commands get prefix (e.g., `/gcp.deploy`)
- `trust` option not supported in extensions
- `!{...}` shell blocks require balanced braces

### TOML Command Format

```toml
description = "Short description shown in /help"

prompt = """
Full prompt content.
Use {{args}} to inject user arguments.
Use @{path/to/file} to embed file content.
Use !{shell command} to execute commands (requires user confirmation).
"""
```

---

## Cursor

### What Gets Installed
```
project/
├── .atta/bootstrap/              # Shared bootstrap assets (detection, templates, mappings)
├── .cursor/
│   ├── rules/
│   │   ├── atta.mdc              # Always-applied framework context (alwaysApply: true)
│   │   └── atta-*.mdc            # Individual skill rules (alwaysApply: false)
│   └── agents/*.md               # Agent definitions
├── AGENTS.md                     # Agent registry (supported natively by Cursor)
└── GETTING-STARTED.md
```

### Discovery Mechanism

**Instructions** (AGENTS.md):
Cursor supports `AGENTS.md` at the project root as a native instruction file. It is loaded automatically into the model context.

**Rules** (`.cursor/rules/*.mdc`):
| Activation | Frontmatter | Behavior |
|-----------|------------|----------|
| Always | `alwaysApply: true` | Injected into every conversation |
| Intelligent | `alwaysApply: false` + `description` | Cursor applies when relevant |
| File-scoped | `alwaysApply: false` + `globs` | Applied when matching files are open |
| Manual | `alwaysApply: false` | User @-mentions the rule name in chat |

Atta generates:
- `atta.mdc` — always-applied framework overview
- `atta-{name}.mdc` — individual skills (intelligent + manual @-mention)

**Note**: `.cursorrules` is the legacy format (deprecated). Atta uses `.cursor/rules/*.mdc`.

### Skill Invocation

Cursor has no custom slash command system. Skills are invoked by @-mentioning the rule file in chat:

```
@atta-review      Code review against conventions
@atta-preflight   Full pre-PR validation
@atta-atta        Set up agents for your stack
@atta-test        Run and analyze tests
```

Cursor may also apply skills intelligently based on the `description` field without explicit @-mention.

### Skill → MDC Conversion

Skills are converted from SKILL.md to `.mdc` format:

```markdown
---
description: One-line description from frontmatter
globs:
alwaysApply: false
---

Full SKILL.md body content here.
```

### What Works
- AGENTS.md loaded as project context
- `atta.mdc` always applied for framework awareness
- Skills available as @-mentionable rules in `.cursor/rules/`
- Agent definitions available at `.cursor/agents/`
- Intelligent skill application via description matching
- `@atta-atta` bootstrap generates agents for detected stack

### Limitations
- No session tracking (no hook support)
- No pattern detection or learning
- No runtime profile re-propagation (generation-time via `@atta-atta`; rerun to re-apply after profile changes)
- No slash command invocation — @-mention or intelligent application only
- Cannot validate without live Cursor environment (dry-run only, see smoke tests)

### SKILL.md Frontmatter

```yaml
---
name: review
description: Comprehensive code review with automated pattern checks.
---
```

---

## Feature Comparison Matrix

| Feature | Claude Code | Copilot | Codex | Gemini | Cursor |
|---------|:-----------:|:-------:|:-----:|:------:|:------:|
| Tech stack detection | Yes | Yes | Yes | Yes | Yes |
| Agent generation | Yes | Yes | Yes | Yes | Yes |
| Agent definitions | Yes | Yes | Yes | Yes | Yes |
| Agent invocation | Yes | Yes | Yes | Yes | Via AGENTS.md |
| Skill execution | Yes | Yes | Yes | Yes | Yes |
| Skill commands | `/name` | `/name` | `$name` | `/name` | `@atta-name` |
| Session tracking | Yes | — | — | — | — |
| Pattern detection | Yes | — | — | — | — |
| Developer profile | Yes | Gen-time | Gen-time | Gen-time | Gen-time |
| Context generation | Yes | — | — | — | — |
| Implicit skill match | — | Yes | Yes | — | Yes (via description) |
| Custom instructions | CLAUDE.md | Multi-source | Multi-level | Hierarchical | AGENTS.md |
| Update system | Yes | — | — | — | — |

**Legend**: Yes = full support, Gen-time = generation-time only (via `/atta`), — = not available

---

## Known Issues & Workarounds

### Cross-Adapter
- Skills that reference `.atta/scripts/` (pattern logging, context generation) won't work outside Claude Code
- The `/agent` skill searches multiple adapter paths — it will find definitions regardless of which adapter was used

### Copilot-Specific
- **`.github/agents/` is reserved**: Copilot's native agent system uses `.github/agents/` with YAML frontmatter. Atta agents go to `.github/atta/agents/` instead.
- **Built-in skill conflicts**: `/review` and `/agent` are Copilot built-ins. Atta renames these to `/atta-review` and `/atta-agent` during install.
- Home-directory instructions (`~/.copilot/copilot-instructions.md`) has a reporting bug — `/instructions` doesn't list it as a source even though it's consumed (as of Feb 2026)

### Codex-Specific
- `$skill-creator` built-in references a `package_skill.py` script that may not exist in some environments
- Two skills with the same name both appear but neither overrides

### Gemini-Specific
- Extensions cannot auto-approve tool calls or set yolo mode
- Configuration changes require CLI session restart

### Cursor-Specific
- No slash command invocation — users must @-mention rules or rely on intelligent application
- `.cursorrules` (legacy root file) is deprecated; Atta uses `.cursor/rules/*.mdc` only
- Cursor does not auto-discover `.cursor/agents/` — agents are referenced from AGENTS.md
- Cannot be smoke-tested without a live Cursor license and IDE environment

---

## Directory Layout (v2.8+)

Atta uses a **dual-root** layout: tool-specific files go to `.claude/`, everything else goes to `.atta/`.

### Why Two Directories?

| Directory | Purpose | Who uses it |
|-----------|---------|-------------|
| `.claude/` | Claude Code discovery (agents, skills, hooks) | Claude Code only |
| `.atta/` | Tool-agnostic shared content (knowledge, scripts, docs, bootstrap) | All adapters |

The split exists because Claude Code discovers agents from `.claude/agents/` and skills from `.claude/skills/`. Other tools (Copilot, Codex, Gemini) install agents and skills to their own paths (`.github/atta/agents/`, `.agents/`, `.gemini/`) but all share the same `.atta/` for bootstrap assets, knowledge, and scripts.

### What to Commit vs Gitignore

**Commit** — framework content installed by `npx atta init`:
```
.claude/agents/           # Agent definitions
.claude/hooks/            # Session tracking hook
.claude/skills/           # Skill definitions
.atta/bootstrap/          # Detection YAML, templates, mappings
.atta/docs/               # Framework documentation
.atta/knowledge/          # Pattern files, project context, directives
.atta/scripts/            # Utility scripts
.atta/.metadata/          # Version and file manifest
.atta/.sessions/          # Schema, integration docs (not runtime JSON)
```

**Gitignore** — runtime-generated files:
```
.claude/.sessions/        # Runtime session JSON files (ephemeral)
.atta/.context/           # Auto-generated recent.md (rebuilt on each run)
.atta/.context/corrections.jsonl   # Pattern detection log
.atta/.context/patterns-learned.json
```

The framework's own `.gitignore` includes these patterns automatically.

### CI Environments

Most Atta features work in CI without Claude Code running:

| Feature | Works in CI? | Notes |
|---------|:---:|-------|
| Skills (as static markdown) | ✅ | Readable by any tool or human |
| Agent definitions | ✅ | Readable by any tool or human |
| Pattern files | ✅ | Checked in, always available |
| Session tracking | ❌ | Requires Claude Code hooks |
| Context generation (`recent.md`) | ❌ | Generated at runtime by hooks |
| Pattern detection logging | ❌ | Requires hook execution |

**Implication**: Skills that call `.atta/scripts/generate-context.sh` or `.atta/scripts/pattern-log.sh` will silently skip those steps in non-Claude-Code environments. Skill execution continues — only the tracking side-effects are skipped.

### .gitignore Recommendations

Add to your project's `.gitignore`:

```
# Atta runtime files (auto-generated, not committed)
.claude/.sessions/
.atta/.context/recent.md
.atta/.context/corrections.jsonl
.atta/.context/patterns-learned.json
```

The `.atta/.sessions/` directory contains **framework docs** (schema, templates) and **is committed**. Only the runtime JSON files in `.claude/.sessions/` (or `{claudeDir}/.sessions/`) are excluded.

---

*Last updated: 2026-03-03. Based on tool documentation, dry-run testing, and live smoke tests.*
*Validated against: Copilot CLI GA (Feb 2026), Codex CLI, Gemini CLI. Cursor: documentation-only (dry-run). See temp-*/SMOKE-TEST.md for detailed results.*
