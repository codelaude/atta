---
type: agent_registry
priority: critical
version: 2.0
generated: true
---

# Agent System Registry

> **Note:** This file is **auto-generated** by `/atta` based on your detected tech stack.
> It will be regenerated each time you run `/atta` to reflect your current project structure.

## About This System

A virtual software development team with specialized agents that provide expertise, reviews, and recommendations. You remain in control - agents guide, they don't replace you.

## Agent Hierarchy (Auto-Generated)

The agent structure adapts to your project:
- **Core Agents**: Always available (project-owner, code-reviewer, librarian, architect)
- **Coordinators**: Generated if frontend/backend detected (fe-team-lead, be-team-lead)
- **Specialists**: Generated based on detected technologies (Vue, React, Django, Java, PostgreSQL, etc.)

**Your current agent structure will appear here after running `/atta`.**

---

## Template Structure (Before Init)

Until you run `/atta`, here's the expected structure:

```
Core Agents (always installed)
├── Project Owner         (orchestrator)
├── Code Reviewer         (quality reviewer)
├── Librarian             (persistent memory)
└── Architect             (system design & blueprints)

Optional Agents (selected during init)
├── Business Analyst      (requirements)
├── QA Validator          (acceptance criteria)
├── PR Manager            (PR descriptions)
└── Rubber Duck           (guided learning)

Coordinators (generated per project)
├── FE Team Lead          (if frontend detected)
│   ├── [Framework]       (Vue, React, Angular, etc.)
│   ├── [Language]        (TypeScript, JavaScript)
│   ├── [Styling]         (SCSS, Tailwind, CSS-in-JS)
│   ├── [Testing]         (Jest, Vitest, Cypress)
│   └── [Accessibility]   (WCAG/ARIA)
│
└── BE Team Lead          (if backend detected)
    ├── [Language]        (Python, Java, Go, Node, etc.)
    ├── [Framework]       (Django, Spring, Express, Fiber, etc.)
    ├── [Database]        (PostgreSQL, MongoDB, MySQL, etc.)
    └── [Testing]         (pytest, JUnit, go test, etc.)
```

---

## How to Initialize

Run the initialization command to detect your tech stack and generate the appropriate agents:

```bash
/atta
```

This will:
1. Auto-detect your tech stack (100+ technology detectors)
2. Generate coordinators (FE/BE team leads) based on detected stacks
3. Generate specialists for each detected technology
4. Create this INDEX.md file with your actual agent hierarchy
5. Set up routing rules for your specific project

---

## After Initialization

Once initialized, this file will contain:

### 1. Agent Registry Table
A complete list of all agents in your project with their IDs, aliases, roles, and reporting structure.

### 2. Visual Hierarchy
A tree view showing how agents relate to each other and who coordinates whom.

### 3. Routing Rules
Task patterns and which agent to invoke for each type of work.

### 4. Key Principles
How agents work, their constraints, and collaboration patterns.

---

## Manual Agent Structure (If Not Using Init)

If you're not using the `/atta` system and want to manually configure agents:

1. **Core agents** are at `.claude/agents/` root
2. **Create coordinators** in `.claude/agents/coordinators/` if needed
3. **Create specialists** in `.claude/agents/specialists/` for your tech stack
4. **Update this file** manually with your agent registry and routing rules

---

## Key Principles

- **Agents guide, they don't auto-generate** code (except when explicitly requested)
- **Stateless** invocations (except Librarian-captured directives)
- **Conflicts escalate to user** for final decision
- **Knowledge-driven**: all agents reference `.atta/team/` patterns
- **Constraints are real**: Each agent has boundaries on what it can/cannot do

---

## Files

- **Core agents**: `.claude/agents/<agent-id>.md`
- **Coordinators**: `.claude/agents/coordinators/<team-lead>.md`
- **Specialists**: `.claude/agents/specialists/<specialist>.md`
- **Skills** (slash commands): `.claude/skills/`
- **Knowledge base**: `.atta/team/`
- **Pattern files**: `.atta/team/patterns/`
- **Project context**: `.atta/project/project-context.md`

---

**To get started, run `/atta` to generate your custom agent team!**
