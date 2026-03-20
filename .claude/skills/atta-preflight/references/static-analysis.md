# Static Analysis (New Files Only)

Derive the new-file subset using the same base-branch range from Step 1 with `--diff-filter=A`:

```bash
git diff --diff-filter=A --name-only origin/main...HEAD
```

When Step 1 falls back to local diffs, or to ensure untracked files are also analyzed, additionally collect untracked files:

```bash
git ls-files --others --exclude-standard
```

Include both sets in the new-file list. Run these quick checks on new files before the full review:

**Unused imports** — scan for imported symbols not referenced in the file body:
- JS/TS: named (`import { X }`), default (`import X`), namespace (`import * as NS`), and aliased (`import { X as Y }`) — check the *bound identifier* (Y, not X) for usage after the import block
- Python: `from module import X`, `import module`, and aliased forms (`as Y`) — check the bound name
- When confident the import is unused, report as HIGH (signals unfinished refactoring). If unsure due to complex patterns (re-exports, side-effect imports), downgrade to MEDIUM or skip.

**Cross-file consistency** — for new files that reference values also found in existing files:
- URLs, version strings, config keys: verify they match the canonical source (e.g., `package.json`, central config)
- Directory paths or conventions: verify they match patterns already established in the codebase
- Counts or feature claims in user-facing strings: verify they match the actual generated/configured output

**Platform portability** — scan for common cross-platform footguns in JS/TS:
- `.split('/')` on file paths -> prefer `path.basename()`, `path.parse()`, or other `path` APIs; use `path.posix` when handling git/repo-relative paths (which always use `/`)
- Unquoted variable interpolation in shell command strings -> paths with spaces will break

**Shell script safety** — for `.sh` files with `set -euo pipefail`:
- `find <dir>` in a pipeline -> aborts if dir doesn't exist; guard with `[ -d "$dir" ]` or `|| true`
- `grep` in a pipeline -> aborts on zero matches; use `|| true` or `{ grep ... || true; }`

**Test coverage** — if the new-file subset includes a new module, command, or entry point:
- Check whether a corresponding test file exists or is being added in the same changeset
- Report as MEDIUM if missing — new modules without tests are a regression risk

Report as a separate **Static Analysis** row in the summary table, using HIGH/MEDIUM severities for prioritization. Static analysis findings do **not** block preflight on their own — they are informational and feed into the overall status alongside Review findings. If there are no new files in the changeset, report "N/A — no new files" and move on.
