# .atta/ — Shared Content Directory

This directory contains tool-agnostic content shared across all AI coding tool adapters.

## Structure

| Directory | Purpose |
|-----------|---------|
| `bootstrap/` | Tech stack detection YAML, templates, mappings |
| `docs/` | User-facing documentation |
| `knowledge/` | Patterns, templates, developer profile, ACCs |
| `project/` | Project context and CI profile (`project-context.md`, `project-profile.md`) |
| `scripts/` | Shell scripts (context generation, pattern analysis) |
| `.context/` | Runtime corrections, patterns, staleness data |
| `.metadata/` | Version, framework info, manifests |
| `.sessions/` | Session tracking schema and templates |

## Why `.atta/`?

Skills and agents must live in each tool's discovery path (`.claude/skills/`, `.github/skills/`, `.agents/skills/`, `.gemini/commands/`). Everything else — knowledge, scripts, docs, metadata — is just files that get `Read` when referenced. These can live in a single shared location.

This eliminates duplication across adapter directories and makes the framework's shared core tool-agnostic.
