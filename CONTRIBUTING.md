# Contributing to Atta

Thank you for your interest in contributing to Atta! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **python3** (used by shell scripts for JSON processing)
- **Ruby** (optional, used by `validate-framework.sh` for YAML validation)
- **ripgrep** (`rg`) (optional, `grep` fallback used when unavailable)
- **Unix/macOS** or **WSL on Windows** (shell scripts require bash)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/codelaude/atta.git
cd atta

# Install dependencies
npm install

# Verify everything works
bash .claude/scripts/validate-framework.sh
```

## Project Structure

```
.claude/          # Framework source (committed)
  agents/         # Core agent definitions
  bootstrap/      # Tech detection YAML + templates
  docs/           # Documentation
  knowledge/      # Knowledge templates and schemas
  scripts/        # Shell scripts (validation, session cleanup, pattern detection)
  skills/         # Skill definitions (slash commands)
src/              # npm package source (CLI, adapters, commands)
bin/              # CLI entry point
```

## Code Style

### Shell Scripts

- Always use `set -euo pipefail`
- Double-quote all variables
- Use `python3 -c` with `sys.argv[]` for data passing (never interpolate shell variables into Python strings)
- Use `%` string formatting in inline Python (not f-strings, to avoid issues with `python3 -c "..."` quoting)
- Add `grep` fallbacks when using `rg`

### JavaScript

- ESM only (`"type": "module"` in package.json)
- Use `node:` prefixed imports for built-in modules
- Atomic file writes: write to `.tmp`, then `renameSync`

### SKILL.md Files

- YAML frontmatter with `name` and `description`
- Session tracking blocks (A, B, C) for skills that modify state
- Error handling section with session finalization reminder

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Run validation: `bash .claude/scripts/validate-framework.sh`
4. Run `npm pack --dry-run` to verify package contents if you changed `package.json` or file structure
5. Submit a pull request

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Ensure `validate-framework.sh` passes
- Add new validation assertions if you add new framework features

## Reporting Issues

- Use the [GitHub issue tracker](https://github.com/codelaude/atta/issues)
- Include your Node.js version, OS, and AI tool (Claude Code, Copilot, etc.)
- For security vulnerabilities, see [SECURITY.md](.github/SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
