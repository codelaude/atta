---
name: tutorial
description: Interactive 5-minute onboarding walkthrough for new users. Introduces the agent team, guides through a first task, and demonstrates quality checks. Run this when getting started with the AI Dev Team Framework.
---

You are now running the **AI Dev Team Framework Tutorial** — an interactive 5-minute onboarding experience.

## How to Use

```
/tutorial          # Full interactive walkthrough (~5 min)
/tutorial --quick  # Quick reference card only
```

---

## Check for `--quick` Flag

If the user passed `--quick`, skip directly to the **Quick Reference Card** section and stop. Do not create a session file.

---

## Session Tracking Setup

Before starting the interactive tutorial, initialize session tracking.

**Step 1: Get session timestamps, UUID, and Unix start time**

Run these commands:
```bash
date +%Y-%m-%d-%H%M%S
uuidgen | tr '[:upper:]' '[:lower:]'
date -u +%Y-%m-%dT%H:%M:%SZ
date +%s
```

This gives you (in order): filename timestamp, session UUID, ISO-8601 timestamp for the JSON field, and Unix start time for duration calculation.

**Step 2: Create session file**

File: `{claudeDir}/.sessions/session-{TIMESTAMP}.json`

Set `args` to the actual arguments the user passed (e.g. `"--quick"`), or `""` if none.

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "{UUID}",
  "timestamp": "{ISO-8601-UTC-from-step-1}",
  "startedBy": "user",
  "skill": {
    "name": "tutorial",
    "args": "{args-passed-by-user-or-empty-string}",
    "status": "in_progress"
  },
  "agents": [],
  "metadata": {
    "projectPath": "{current-working-directory}",
    "claudeDir": "{claudeDir}",
    "duration": null,
    "tokensUsed": null,
    "costUSD": null
  }
}
```

> `duration` starts as `null` — it is set to elapsed milliseconds at finalization.

Record the session filename and the Unix start timestamp (4th command above) — you will need both at the end.

---

## Welcome Message

Display this to the user:

```markdown
# Welcome to the AI Dev Team Framework!

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

If the user selects the quick reference, skip to the **Quick Reference Card** section, then proceed to **Finalize Session** before closing.

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
│   ├── [framework specialist] (e.g., vue, react, angular)
│   ├── [language specialist] (e.g., typescript)
│   ├── [styling specialist] (e.g., scss, tailwind)
│   ├── [accessibility specialist]
│   └── [testing specialist]
├── BE Team Lead — coordinates backend specialists (if applicable)
└── [cross-cutting agents: code-reviewer, librarian, etc.]
```

### 1c. Explain How to Invoke Agents

Show the user:

**How to invoke an agent** — use `/agent` followed by the agent ID:

- `/agent project-owner` — Start here for any new task
- `/agent rubber-duck` — When you're stuck or thinking through a problem
- `/agent librarian` — To capture a rule ("remember to always...")
- `/agent code-reviewer` — Direct code review

**Or let `/team-lead` decompose the task for you** — describe the feature and it routes to the right specialists automatically:

Example: `/team-lead Add a user profile page`

### 1d. Continue Prompt

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
- **Knowledge** of your project's patterns (from `/init`)

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
`/team-lead [their task description]`
```

Update session file to record the project-owner agent invocation:
- Run `date -u +%Y-%m-%dT%H:%M:%SZ` to get the current ISO-8601 UTC timestamp
- Add to `agents` array: `{ "name": "project-owner", "role": "universal", "invokedAt": "{output of above command}", "status": "completed" }`

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
| `/lint` | Fast pattern checks (TypeScript, Vue, SCSS rules) | After writing code |
| `/review` | Deep code review against project conventions | Before committing |
| `/preflight` | Full pre-PR validation (lint + review + tests) | Before opening a PR |

**Example workflow:**

```bash
# 1. Write your code
# 2. Quick check
/lint src/components/MyComponent.vue

# 3. Full review
/review

# 4. Ready for PR?
/preflight
```

The quality agents reference your project's pattern files (set up by `/init`) so they understand your specific conventions — not just generic best practices.

### 3c. Continue Prompt

Use AskUserQuestion:
- Question: "You're all set! Want to see the quick reference card?"
- Options:
  - "Yes, show the reference card →"
  - "I'm ready — let me try it!"

If user selects "Yes, show the reference card →": proceed to the **Quick Reference Card** section below, then proceed to **Finalize Session**, then show the Closing Message.

If user selects "I'm ready — let me try it!": proceed directly to **Finalize Session**, then show the Closing Message.

---

## Quick Reference Card

Display this (whether reached from the end of the tutorial, from the `--quick` flag, or from the Welcome skip):

```markdown
## AI Dev Team — Quick Reference

### Getting Started
| Command | What it does |
|---------|-------------|
| `/init` | Set up agents for your project (run once) |
| `/tutorial` | This tutorial |
| `/tutorial --quick` | Show this card |

### Daily Workflow
| Command | What it does |
|---------|-------------|
| `/agent project-owner` | Route any task to the right specialist |
| `/team-lead [task]` | Decompose a feature into specialist tracks |
| `/agent rubber-duck` | Think through a problem with guided questions |

### Code Quality
| Command | What it does |
|---------|-------------|
| `/lint [file]` | Fast pattern check on a file or folder |
| `/review` | Full code review against project conventions |
| `/preflight` | Complete pre-PR validation |

### Knowledge & Memory
| Command | What it does |
|---------|-------------|
| `/librarian` | Capture rules ("always...", "never...") |
| `/agent librarian` | Review or update project directives |

### Agent Shortcuts
| Command | What it does |
|---------|-------------|
| `/agent [id]` | Invoke any agent directly |
| `/agent code-reviewer` | Direct code critique |
| `/agent qa-validator` | Validate feature requirements |
| `/agent pr-manager` | Generate a PR description |
| `/agent business-analyst` | Clarify requirements |

### Keeping Agents Up to Date
| Command | What it does |
|---------|-------------|
| `/update` | Check for framework updates |
| `/init --rescan` | Re-detect tech stack changes |

---

**Tip:** Start every task with `/agent project-owner` — it will route you to the right specialist automatically.

**Tip:** Capture team decisions with `/librarian` so agents remember your project's rules across sessions.

---

*AI Dev Team Framework v2.2 — run `/update` to keep agents current*
```

---

## Finalize Session

At the end of the tutorial (whether fully completed, skipped to reference card, or exited early) — always finalize if a session file was created.

**Step 1: Calculate duration**

Run: `date +%s` → current Unix timestamp in seconds.

Compute: `(current_unix_timestamp - start_unix_timestamp) * 1000` = duration in milliseconds.

**Step 2: Update session file**

Edit `{claudeDir}/.sessions/session-{TIMESTAMP}.json`:
- Change **`skill.status`** from `"in_progress"` → `"completed"`
- Set **`metadata.duration`** to elapsed milliseconds

**Step 3: Run cleanup**

```bash
.claude/scripts/session-cleanup.sh
```

> Note: The cleanup script always lives in `.claude/scripts/` (framework source), regardless of `{claudeDir}`. Pass `{claudeDir}` as an argument if sessions are in a non-default location: `.claude/scripts/session-cleanup.sh {claudeDir}`

---

## Closing Message

End with:

```markdown
You're all set! Your AI dev team is ready.

**Next steps:**
1. If you haven't already: `/init` — configure agents for your project
2. Start a task: `/agent project-owner` — describe what you want to build
3. Before your next PR: `/preflight` — run the full quality pipeline

Happy coding!
```

---

## Related Skills

- `/init` — Set up agents for your specific tech stack (run before `/tutorial` for best results)
- `/agent project-owner` — Your main entry point for any task
- `/preflight` — Full pre-PR quality pipeline
- `/update` — Keep the framework up to date
