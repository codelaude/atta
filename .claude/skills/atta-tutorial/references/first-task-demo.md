# Your First Task — Demo Walkthrough

## Introduce the Step

```markdown
## Step 2 of 3 — Your First Task

Let's see how the team handles a real task.

We'll ask the **Project Owner** to decompose a feature and route it to the right specialists.
```

## Ask What They Want to Build

Use AskUserQuestion:
- Question: "What kind of feature would you like to use as an example?"
- Options:
  - "A UI component (button, modal, form)"
  - "An API endpoint or data fetch"
  - "A bug fix or refactor"
  - "Use a generic example"

## Invoke the Project Owner

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
