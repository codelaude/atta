# Adapter Compatibility Reference

> How Atta works across different AI development tools.

Atta supports four adapters. Each installs a different file structure optimized for the target tool's discovery mechanism.

---

## Quick Reference

| Aspect | Claude Code | Copilot CLI | Codex CLI | Gemini CLI |
|--------|-------------|-------------|-----------|------------|
| **Instruction file** | `CLAUDE.md` | `AGENTS.md` + `.github/copilot-instructions.md` | `AGENTS.md` (multi-level) | `GEMINI.md` (hierarchical) |
| **Skill location** | `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` | `.agents/skills/*/SKILL.md` | `.gemini/commands/*.toml` |
| **Skill invocation** | `/skill-name` | `/skill-name` | `$skill-name` | `/command-name` |
| **Skill format** | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | TOML (description + prompt) |
| **Agent definitions** | `.claude/agents/*.md` | `.github/atta/agents/*.md` | `.agents/agents/*.md` | `.gemini/agents/*.md` |
| **Bootstrap assets** | `.atta/bootstrap/` | `.atta/bootstrap/` | `.atta/bootstrap/` | `.atta/bootstrap/` |
| **Agent generation** | Full (`/atta` bootstrap) | `/atta` with adapter detection | `/atta` with adapter detection | `/atta` with adapter detection |
| **Session tracking** | Yes (hooks) | No | No | No |
| **Project-scoped** | Yes | Yes | Yes | Commands yes, extensions no |

---

## Claude Code (Full Support)

Claude Code is the primary adapter with complete framework support.

### What Gets Installed
```
project/
├── .claude/                      # Full framework
│   ├── agents/                   # Core + generated agents
│   ├── bootstrap/                # Tech detection + templates
│   ├── docs/
│   ├── hooks/                    # Session tracking
│   ├── knowledge/
│   ├── scripts/
│   ├── skills/*/SKILL.md
│   ├── .context/
│   └── .metadata/
├── .claude-plugin/plugin.json    # Plugin manifest
├── CLAUDE.md                     # Instructions
└── .claude/settings.local.json   # Hook config + permissions
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

## Feature Comparison Matrix

| Feature | Claude Code | Copilot | Codex | Gemini |
|---------|:-----------:|:-------:|:-----:|:------:|
| Tech stack detection | Yes | Yes | Yes | Yes |
| Agent generation | Yes | Yes | Yes | Yes |
| Agent definitions | Yes | Yes | Yes | Yes |
| `/agent` invocation | Yes | Yes | Yes | Yes |
| Skill execution | Yes | Yes | Yes | Yes |
| Skill commands | `/name` | `/name` | `$name` | `/name` |
| Session tracking | Yes | — | — | — |
| Pattern detection | Yes | — | — | — |
| Developer profile | Yes | Gen-time | Gen-time | Gen-time |
| Context generation | Yes | — | — | — |
| Implicit skill match | — | Yes | Yes | — |
| Custom instructions | CLAUDE.md | Multi-source | Multi-level | Hierarchical |
| Update system | Yes | — | — | — |

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

---

*Last updated: 2026-03-01. Based on tool documentation, dry-run testing, and live smoke tests.*
*Validated against: Copilot CLI GA (Feb 2026), Codex CLI, Gemini CLI. See temp-*/SMOKE-TEST.md for detailed results.*
