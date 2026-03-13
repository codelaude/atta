---
name: atta-ship
description: Completion workflow — run tests, validate ACCs, generate PR description, and capture learnings. Use after /atta-preflight passes.
disable-model-invocation: true
argument-hint: "[--skip-tests]"
---

You are now running the **ship** completion workflow. This finalizes work for PR submission.

## How to Use

```
/atta-ship                    # Full completion workflow
/atta-ship --skip-tests       # Skip test execution (if already verified)
```

---

## Prerequisites

- All changes are implemented and reviewed
- `/atta-preflight` has passed (or user has explicitly decided to skip it)

---

## Execution Steps

### Step 0: Load Scoped Directives

Read `.claude/agents/memory/directives-pr.md` if it exists (skip silently if absent). Apply any directives found as additional shipping/PR constraints.

### Step 1: Run Tests

```bash
npm test
```

If the project uses snapshot tests (detected from `package.json` for Jest or Vitest), ask the user whether snapshots are expected to change. Only add `--updateSnapshot` if the user confirms; otherwise run without it.

**If tests fail, stop and report.** Do not proceed to PR generation with failing tests.

> If `--skip-tests` flag is set, skip this step.

### Step 2: Extract Ticket ID

Extract ticket ID from the current git branch name:

```bash
git rev-parse --abbrev-ref HEAD
```

If the result is `HEAD` or empty (detached HEAD state), trigger the "No Git Branch Detected" recovery.

Look for patterns: `feature/ABC-123`, `bugfix/ABC-123`, `fix/ABC-123`, `hotfix/ABC-123`.

If no ticket ID is found, note "No ticket ID detected" and continue.

### Step 3: Validate Acceptance Criteria

Check if ACC files exist in `.atta/local/accs/` or `{attaDir}/local/accs/`.

If ACCs exist for the current feature:
- Read the relevant ACC file
- Verify each criterion against the implemented changes
- Report status: MET / NOT MET / PARTIAL for each criterion
- If any critical ACCs are NOT MET, warn but don't block

If no ACC files exist, skip this step silently.

### Step 4: Generate PR Description

Ensure `{attaDir}/local/PR/` exists (create if needed). Write the PR file to `{attaDir}/local/PR/PR-{branch-slug}.md` following the full structure in `.atta/team/templates/pr-template.md` (Header, Suggested Commit Message, PR Title, PR Description).

`branch-slug` is the branch name with `/` replaced by `-` (e.g., `feature/ABC-123` → `feature-ABC-123`).

The PR Description section (inside the markdown code block) should contain:

- `## Summary` — 1-3 bullet points describing the change
- `## Changes` — Grouped by category (Features, Fixes, Refactoring, Docs). Include file names for significant changes.
- `## Verification` — Checkmark list (tests, lint, security, ACCs if applicable)
- `## Notes` — Breaking changes, migration steps, or reviewer guidance

### Step 5: Capture Learnings

Ask the user: "Any learnings or corrections from this session to capture?"

If yes, invoke the librarian to capture them.
If no, skip.

### Step 6: Present Summary

Present to the user:
1. Test results (pass/fail count)
2. ACC validation results (if applicable)
3. The generated PR description (ready to copy-paste)
4. Suggested commit message

---

## Error Handling & Recovery

### Tests Fail

```markdown
Tests failed — cannot proceed with ship.

Recovery:
1. Fix failing tests
2. Rerun `/atta-ship` (or `/atta-ship --skip-tests` if tests are flaky and you've verified manually)
```

### No Git Branch Detected

```markdown
Could not determine current branch.

Recovery:
1. Ensure you're in a git repository
2. Check that you're on a feature/bugfix branch
3. Rerun `/atta-ship`
```

### PR File Already Exists

If a PR file for this branch already exists, ask the user whether to overwrite or append.

---

## Related Skills

- `/atta-preflight` - Run before `/atta-ship` to validate code quality
- `/atta-review` - Code review only
- `/atta-lint` - Quick pattern checks
- `/atta-agent pr-manager` - PR description generation (standalone)
- `/atta-librarian` - Knowledge capture (standalone)
