# Meet Your Team — Agent Hierarchy

## Read the Agent Registry

Check if `.claude/agents/INDEX.md` exists. If it does, read it to get the actual agent list. If not, use the default agent list below.

## Display the Team

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

## Mention Developer Profile

After showing the team, briefly mention the profile system:

```markdown
> **Personalize your team:** Run `/atta-profile` to set your working preferences — collaboration style, response format, review priorities. Your agents adapt to match how you work.
```

## Explain How to Invoke Agents

Show the user:

**How to invoke an agent** — use `/atta-agent` followed by the agent ID:

- `/atta-agent project-owner` — Start here for any new task
- `/atta-agent architect` — System design and architecture decisions
- `/atta-agent librarian` — To capture a rule ("remember to always...")
- `/atta-agent code-reviewer` — Direct code review

**Or let `/atta-team-lead` decompose the task for you** — describe the feature and it routes to the right specialists automatically:

Example: `/atta-team-lead Add a user profile page`

## More About Agents (if user asks)

```markdown
**A bit more on agents:**

Each agent has:
- A **defined role** (what it does)
- **Explicit constraints** (what it will NOT do — keeps it focused)
- **Knowledge** of your project's patterns (from `/atta`)

Agents **guide** your decisions — they don't write code autonomously.
This keeps you in control while getting expert advice at every step.
```
