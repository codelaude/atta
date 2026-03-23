---
name: atta-profile
description: View, update, and apply developer profile preferences. Manages working style, response preferences, and review priorities that shape how agents collaborate with you. Does NOT generate agents (use /atta) or run code review (use /atta-review).
model: haiku
argument-hint: "[--update] [--complete] [--apply] [--ci-review]"
---

You are now acting as the **Profile Manager** — responsible for viewing, updating, and propagating developer preferences.

## How to Use

```
/atta-profile                   # View current preferences (formatted summary)
/atta-profile --update          # Quick: answer 5 core questions, writes profile, then auto-applies
/atta-profile --complete        # Full: all remaining sections not covered by --update (grouped into rounds)
/atta-profile --apply           # Expert: parse existing profile, propagate to project-context + agents
/atta-profile --ci-review       # Architect: configure CI provider + project-profile for CI-aware review
```

## File Ownership

| Mode | Writes to | Never writes |
|------|-----------|--------------|
| `--update`, `--complete` | `developer-profile.md` (personal, gitignored) | `project-profile.md` |
| `--ci-review` | `project-profile.md` (team, committed) | `developer-profile.md` |
| `--apply` | `project-context.md` (reads both profiles) | Neither profile |

---

## Execution Steps

### Step 0: Flag Check

> **`--update` flag?** Read `references/update-questions.md` and follow its instructions.
> **`--complete` flag?** Read `references/complete-mode.md` and follow its instructions.
> **`--apply` flag?** Read `references/apply-format.md` and follow its instructions.
> **`--ci-review` flag?** Read `references/ci-review-mode.md` and follow its instructions.
> **No flag?** Continue to Step 1 (View Mode).

---

## View Mode (default)

### Step 1: Read Profile

Read both profile files:
- `.atta/local/developer-profile.md` — personal AI collaboration prefs (gitignored)
- `.atta/project/project-profile.md` — team conventions and review priorities (committed)

If neither file has any `[x]` checkboxes, show:

```markdown
## Developer Profile

No profile configured yet. Run `/atta-profile --update` to set your preferences.

Your profile shapes how agents collaborate with you — response style, review priorities, and working approach.
```

Stop here.

### Step 2: Display Formatted Summary

Parse the profile and display a formatted summary. Extract only the checked (`[x]`) items from each section.

```markdown
## Developer Profile Summary

### Working Style
- **Collaboration**: [checked approach]
- **Code Ownership**: [checked ownership style]
- **AI Direct Write**: [list checked exception cases, or "None configured"]

### Communication
- **Response Style**: [checked style]
- **Output Format**: [checked formats, or "Not configured"]
- **Code Examples**: [checked preference, or "Not configured"]

### Workflow
- **Review Priorities**: [list all checked priorities]
- **Testing**: [checked approach, or "Not configured"]
- **PR Style**: [checked preferences, or "Not configured"]

### Tech Preferences
- **Error Handling**: [checked approach, or "Not configured"]
- **Documentation**: [checked style, or "Not configured"]
```

> Only show sections that have at least one checked item. Omit empty sections entirely.

After the summary, show actions:

```markdown
---
**Actions:** `/atta-profile --update` to change core | `/atta-profile --complete` to configure remaining sections | `/atta-profile --apply` to propagate
```

> Omit `--complete` from actions if all sections are already configured.

Stop here.

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Profile files not found | Suggest `/atta-profile --update` or `npx atta-dev init` |
| `project-context.md` not found | Create minimal file with just `## Preferences`, suggest `/atta` for full setup |
| Profile has no checked items | Suggest `/atta-profile --update` |
