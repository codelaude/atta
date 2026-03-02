---
applyTo: "**"
description: PR Description Template
---

# Pull Request Description Template

When generating a PR description, follow this exact structure. Ensure `{claudeDir}/knowledge/PR/` exists (create if needed). Write the file to `{claudeDir}/knowledge/PR/PR-{branch-slug}.md`, where `branch-slug` is the branch name with `/` replaced by `-` (e.g., `feature/ABC-123` → `feature-ABC-123`).

## File Structure

The PR file has 4 sections in this order:

### 1. Header

`# PR: {branch-name}`

Here, `{branch-name}` is the original branch name (e.g., `feature/ABC-123`), not the slugified `{branch-slug}` used in the filename.

### 2. Suggested Commit Message

A `## Suggested Commit Message` heading followed by a code block with a concise commit message (what and why, not how).

### 3. PR Title

A `## PR Title` heading followed by a code block with a short title (under 70 characters).

### 4. PR Description

A `## PR Description` heading followed by a **markdown code block** (` ```markdown `) containing:

- `## Summary` — 1-3 bullet points describing the change and its purpose
- `## Changes` — Grouped by category (Features, Fixes, Refactoring, Docs). Use **NEW**, **MODIFIED**, **REMOVED** prefixes. Include file names for significant changes.
- `## Verification` — Checkmark list of what was tested
- `## Notes` — Breaking changes, migration steps, known limitations, deferred items

The markdown code block makes the description ready to paste directly into GitHub/GitLab.

## Best Practices

- **Be specific**: "Added cookie persistence to ChatWidget state" not "Updated component"
- **Group related changes**: Keep component, test, and style changes together by feature
- **Highlight breaking changes**: Document migration steps if any
- **Include verification**: List what was tested and how
