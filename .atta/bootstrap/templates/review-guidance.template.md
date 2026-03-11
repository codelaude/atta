# Review Guidance

> Stack-specific code review rules for {{PROJECT_NAME}}
> Generated: {{GENERATED_DATE}}

<!--
  This template provides the base structure for review guidance generation.
  The review-guidance.js module reads pattern templates (Key Rules + Anti-Patterns)
  from detected technologies and formats them into each tool's native review format.

  Sections:
  - Universal rules: always included regardless of tech stack
  - Stack-specific rules: extracted from pattern templates based on detection
  - Skip rules: files and directories to exclude from review

  Severity mapping:
    Pattern CRITICAL → review CRITICAL / 🔴 blocker
    Pattern HIGH     → review HIGH / 🟠 normal
    Pattern MEDIUM   → review MEDIUM / 🟡 nit
    Pattern LOW      → not surfaced by formatters (ignored in review output)
-->

## Always Check (Universal)

- No hardcoded secrets (API keys, passwords, tokens) in source code
- No `eval()` or dynamic code execution with user-controlled input
- Input validation at system boundaries (user input, external APIs)
- Error handling: no swallowed exceptions, no exposed stack traces
- No TODO/FIXME/HACK comments in production code paths
- Lock files committed and consistent with package manifests
- No disabled linter rules without justification comments

## Style (Universal)

- Consistent naming conventions within each file
- Functions do one thing; files have a single responsibility
- No unused imports, variables, or dead code
- No commented-out code blocks (delete or use version control)

## Skip (Universal)

- Generated files: `dist/`, `build/`, `out/`, `.next/`, `coverage/`
- Dependencies: `node_modules/`, `vendor/`, `.venv/`, `__pycache__/`
- Lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock`, `Cargo.lock`, `go.sum`
- Minified files: `*.min.js`, `*.min.css`
- Binary and media files: images, fonts, videos
- IDE and OS files: `.idea/`, `.vscode/settings.json`, `.DS_Store`
