---
name: atta-tutorial
description: Interactive 5-minute onboarding walkthrough for new users. Introduces the agent team, guides through a first task, and demonstrates quality checks. Run this when getting started with Atta.
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

If the user passed `--quick`, skip directly to the **Quick Reference Card** section and stop.

---

## Welcome Message

Display this to the user:

```markdown
# Welcome to Atta!

You have an AI development team ready to help you build better code.

This 5-minute tutorial covers:
- **Step 1** — Meet Your Team (2 min)
- **Step 2** — Your First Task (2 min)
- **Step 3** — Quality Checks (1 min)

Let's get started!
```

Then use AskUserQuestion:
- Question: "Ready to meet your team?"
- Options:
  - "Let's go! →" (start the tutorial)
  - "Show me the quick reference instead" (jump to Quick Reference Card)

If the user selects the quick reference, skip to the **Quick Reference Card** section, then show the Closing Message.

---

## Step 1: Meet Your Team (2 min)

### 1a. Read the Agent Registry

Check if `.claude/agents/INDEX.md` exists. If it does, read it to get the actual agent list. If not, use the default agent list below.

### 1b. Display the Team

Present the agent hierarchy. Use the actual agents from INDEX.md if available, otherwise use this default:

```markdown
## Step 1 of 3 — Meet Your Team

Your AI team is organized in a hierarchy:

**Project Owner** (you talk to this one first)
├── Code Reviewer — critiques your code quality
├── QA Validator — validates features meet requirements
├── Business Analyst — clarifies requirements and writes specs
├── PR Manager — writes pull request descriptions
├── Rubber Duck — helps you think through problems
└── Librarian — remembers your project's rules and patterns

> **How it works:** You describe a task → Project Owner routes it → the right
> specialist helps → you get expert guidance without switching context.
```

If a `fe-team-lead` or `be-team-lead` exists in the INDEX, show the extended hierarchy:

```markdown
**Project Owner**
├── FE Team Lead — coordinates frontend specialists
│   ├── [framework specialist] (e.g., react, vue, angular, svelte)
│   ├── [language specialist] (e.g., typescript)
│   ├── [styling specialist] (e.g., scss, tailwind)
│   ├── [accessibility specialist]
│   └── [testing specialist]
├── BE Team Lead — coordinates backend specialists (if applicable)
└── [cross-cutting agents: code-reviewer, librarian, etc.]
```

### 1c. Mention Developer Profile

After showing the team, briefly mention the profile system:

```markdown
> **Personalize your team:** Run `/atta-profile` to set your working preferences — collaboration style, response format, review priorities. Your agents adapt to match how you work.
```

### 1d. Explain How to Invoke Agents

Show the user:

**How to invoke an agent** — use `/atta-agent` followed by the agent ID:

- `/atta-agent project-owner` — Start here for any new task
- `/atta-agent rubber-duck` — When you're stuck or thinking through a problem
- `/atta-agent librarian` — To capture a rule ("remember to always...")
- `/atta-agent code-reviewer` — Direct code review

**Or let `/atta-team-lead` decompose the task for you** — describe the feature and it routes to the right specialists automatically:

Example: `/atta-team-lead Add a user profile page`

### 1e. Continue Prompt

Use AskUserQuestion:
- Question: "Got it! Ready to try your first task?"
- Options:
  - "Yes, let's try a task →"
  - "Tell me more about agents first"

If user wants to know more about agents:

```markdown
**A bit more on agents:**

Each agent has:
- A **defined role** (what it does)
- **Explicit constraints** (what it will NOT do — keeps it focused)
- **Knowledge** of your project's patterns (from `/atta`)

Agents **guide** your decisions — they don't write code autonomously.
This keeps you in control while getting expert advice at every step.
```

Then repeat the same AskUserQuestion from above (same question and options) to continue.

---

## Step 2: Your First Task (2 min)

### 2a. Introduce the Step

```markdown
## Step 2 of 3 — Your First Task

Let's see how the team handles a real task.

We'll ask the **Project Owner** to decompose a feature and route it to the right specialists.
```

### 2b. Ask What They Want to Build

Use AskUserQuestion:
- Question: "What kind of feature would you like to use as an example?"
- Options:
  - "A UI component (button, modal, form)"
  - "An API endpoint or data fetch"
  - "A bug fix or refactor"
  - "Use a generic example"

### 2c. Invoke the Project Owner

Based on their answer, invoke the Project Owner agent inline:

**Read** `.claude/agents/project-owner.md` and act as the Project Owner for this step.

As Project Owner, decompose the chosen example task:

- If **UI component**: Route to fe-team-lead (or framework specialist directly if no team lead) — outline which specialists would handle framework, styling, accessibility, and testing sub-tasks
- If **API / data fetch**: Route to be-team-lead or project-owner-level — outline backend, integration, and testing sub-tasks
- If **bug fix / refactor**: Route to code-reviewer first for diagnosis, then relevant specialist
- If **generic**: Use "Add a search input with debounce" as the example

Format the decomposition as:

```markdown
**Project Owner routing:**

Task: [the example task]

I'm routing this as follows:
- [Specialist A] → [their sub-task]
- [Specialist B] → [their sub-task]
- [Specialist C] → [their sub-task] (after A completes)

**Suggested command to try:**
`/atta-team-lead [their task description]`
```

### 2d. Continue Prompt

Use AskUserQuestion:
- Question: "That's how routing works! Ready for quality checks?"
- Options:
  - "Yes, show me quality checks →"
  - "Can I try a different task?"

If user wants to try a different task, return to Step 2b.

---

## Step 3: Quality Checks (1 min)

### 3a. Introduce the Step

```markdown
## Step 3 of 3 — Quality Checks

Before you submit a PR, run the quality pipeline:
```

### 3b. Explain the Quality Skills

Show the user:

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

### 3c. Continue Prompt

Use AskUserQuestion:
- Question: "You're all set! Want to see the quick reference card?"
- Options:
  - "Yes, show the reference card →"
  - "I'm ready — let me try it!"

If user selects "Yes, show the reference card →": proceed to the **Quick Reference Card** section below, then show the Closing Message.

If user selects "I'm ready — let me try it!": show the Closing Message directly.

---

## Quick Reference Card

Display this (whether reached from the end of the tutorial, from the `--quick` flag, or from the Welcome skip):

```markdown
## Atta — Quick Reference

### Getting Started
| Command | What it does |
|---------|-------------|
| `/atta` | Set up agents for your project (run once) |
| `/atta-profile` | Set your working preferences (collaboration, review priorities) |
| `/atta-tutorial` | This tutorial |
| `/atta-tutorial --quick` | Show this card |

### Daily Workflow
| Command | What it does |
|---------|-------------|
| `/atta-agent project-owner` | Route any task to the right specialist |
| `/atta-team-lead [task]` | Decompose a feature into specialist tracks |
| `/atta-agent rubber-duck` | Think through a problem with guided questions |

### Code Quality
| Command | What it does |
|---------|-------------|
| `/atta-lint [file]` | Fast pattern check on a file or folder |
| `/atta-review` | Full code review against project conventions |
| `/atta-preflight` | Complete pre-PR validation |

### Knowledge & Memory
| Command | What it does |
|---------|-------------|
| `/atta-librarian` | Capture rules ("always...", "never...") |
| `/atta-agent librarian` | Review or update project directives |

### Agent Shortcuts
| Command | What it does |
|---------|-------------|
| `/atta-agent [id]` | Invoke any agent directly |
| `/atta-agent code-reviewer` | Direct code critique |
| `/atta-agent qa-validator` | Validate feature requirements |
| `/atta-agent pr-manager` | Generate a PR description |
| `/atta-agent business-analyst` | Clarify requirements |

### Keeping Agents Up to Date
| Command | What it does |
|---------|-------------|
| `/atta-update` | Check for framework updates |
| `/atta --rescan` | Re-detect tech stack changes |

---

**Tip:** Start every task with `/atta-agent project-owner` — it will route you to the right specialist automatically.

**Tip:** Capture team decisions with `/atta-librarian` so agents remember your project's rules across sessions.

---

*Atta — run `/atta-update` to keep agents current*
```

---

## Closing Message

End with:

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
