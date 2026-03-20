---
name: atta-tutorial
description: Interactive 5-minute onboarding walkthrough for new users. Introduces the agent team, guides through a first task, and demonstrates quality checks. Run this when getting started with Atta. Does NOT configure the project (use /atta) or set preferences (use /atta-profile).
model: haiku
argument-hint: "[--quick]"
---

You are now running the **Atta Framework Tutorial** — an interactive 5-minute onboarding experience.

## How to Use

```
/atta-tutorial          # Full interactive walkthrough (~5 min)
/atta-tutorial --quick  # Quick reference card only
```

---

## Check for `--quick` Flag

If the user passed `--quick`, read `references/quick-reference-card.md` and display its contents. Stop here.

---

## Welcome Message

```markdown
# Welcome to Atta!

You have an AI development team ready to help you build better code.

This 5-minute tutorial covers:
- **Step 1** — Meet Your Team (2 min)
- **Step 2** — Your First Task (2 min)
- **Step 3** — Quality Checks (1 min)

Let's get started!
```

Use AskUserQuestion:
- Question: "Ready to meet your team?"
- Options:
  - "Let's go! ->" (start the tutorial)
  - "Show me the quick reference instead" (read `references/quick-reference-card.md`, display, then show Closing Message)

---

## Step 1: Meet Your Team (2 min)

Read `references/team-introduction.md` and follow its instructions.

Use AskUserQuestion:
- Question: "Got it! Ready to try your first task?"
- Options:
  - "Yes, let's try a task ->"
  - "Tell me more about agents first" (show the "More About Agents" section from the reference, then re-ask)

---

## Step 2: Your First Task (2 min)

Read `references/first-task-demo.md` and follow its instructions.

Use AskUserQuestion:
- Question: "That's how routing works! Ready for quality checks?"
- Options:
  - "Yes, show me quality checks ->"
  - "Can I try a different task?" (return to Step 2)

---

## Step 3: Quality Checks (1 min)

```markdown
## Step 3 of 3 — Quality Checks

Before you submit a PR, run the quality pipeline:
```

**Three levels of quality checks:**

| Skill | What it does | When to use |
|-------|-------------|-------------|
| `/atta-lint` | Fast pattern checks (framework, language, styling rules) | After writing code |
| `/atta-review` | Deep code review against project conventions | Before committing |
| `/atta-preflight` | Full pre-PR validation (lint + review + tests) | Before opening a PR |

**Example workflow:**

```bash
# 1. Write your code
# 2. Quick check
/atta-lint src/components/UserProfile.tsx

# 3. Full review
/atta-review

# 4. Ready for PR?
/atta-preflight
```

The quality agents reference your project's pattern files (set up by `/atta`) so they understand your specific conventions — not just generic best practices.

Use AskUserQuestion:
- Question: "You're all set! Want to see the quick reference card?"
- Options:
  - "Yes, show the reference card ->" (read `references/quick-reference-card.md`, display, then show Closing Message)
  - "I'm ready — let me try it!" (show Closing Message directly)

---

## Closing Message

```markdown
You're all set! Your Atta colony is ready.

**Next steps:**
1. If you haven't already: `/atta` — configure agents for your project
2. Start a task: `/atta-agent project-owner` — describe what you want to build
3. Before your next PR: `/atta-preflight` — run the full quality pipeline

Happy coding!
```

---

## Related Skills

- `/atta` — Set up agents for your specific tech stack (run before `/atta-tutorial` for best results)
- `/atta-agent project-owner` — Your main entry point for any task
- `/atta-preflight` — Full pre-PR quality pipeline
- `/atta-update` — Keep the framework up to date
