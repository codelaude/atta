---
type: agent_registry
priority: critical
version: 3.0
---

# Agent System Registry

> A virtual software house team for guided development.
> Each agent provides expertise, reviews, and recommendations. You remain in control.

## Agent Registry

| Agent | ID | Aliases | Role | Reports To |
|-------|-----|---------|------|------------|
| **Project Owner** | `project-owner` | `orchestrator` | Orchestrator | User |
| **FE Team Lead** | `fe-team-lead` | `lead`, `coordinator` | FE Coordinator | Project Owner |
| **Rubber Duck** | `rubber-duck` | `guide`, `duck` | Guided Learning | User |
| **Vue** | `vue` | `fe-vue` | Vue.js specialist | FE Team Lead |
| **SCSS** | `scss` | `fe-scss` | SCSS/BEM specialist | FE Team Lead |
| **Accessibility** | `accessibility` | `fe-a11y`, `a11y` | WCAG/ARIA specialist | FE Team Lead |
| **TypeScript** | `typescript` | `fe-typescript`, `ts` | TypeScript specialist | FE Team Lead |
| **Tester** | `tester` | `fe-tester`, `testing` | Testing specialist | FE Team Lead |
| **Code Reviewer** | `code-reviewer` | `reviewer` | Code reviewer | FE Team Lead |
| **QA Validator** | `qa-validator` | `qa` | QA / ACC Validation | Project Owner |
| **Business Analyst** | `business-analyst` | `ba`, `requirements` | Requirements / Docs | Project Owner |
| **PR Manager** | `pr-manager` | `pm`, `pr` | PR preparation | Project Owner |
| **Backend Consultant** | `backend-consultant` | `be`, `backend` | Backend advisor | Project Owner |
| **Librarian** | `librarian` | `knowledge-keeper` | Knowledge keeper | Project Owner |

## Hierarchy

```
Project Owner (orchestrator)
├── FE Team Lead (coordinator)
│   ├── vue (specialist)
│   ├── scss (specialist)
│   ├── typescript (specialist)
│   ├── accessibility (specialist)
│   ├── tester (specialist)
│   ├── code-reviewer (reviewer)
│   └── pr-manager (organization)
├── Backend Consultant (advisor)
├── QA Validator (qa)
├── Business Analyst (ba)
├── Rubber Duck (guided learning)
└── Librarian (knowledge keeper)
```

## Routing

| Task Pattern | Route To |
|-------------|----------|
| New component / complex FE feature | fe-team-lead (coordinates specialists) |
| Style / CSS / SCSS | fe-team-lead -> scss |
| Accessibility / WCAG / ARIA | fe-team-lead -> accessibility |
| Tests / coverage | fe-team-lead -> tester |
| Types / TypeScript / interfaces | fe-team-lead -> typescript |
| Code review / critique | code-reviewer |
| QA / acceptance criteria | qa-validator |
| Requirements / documentation | business-analyst |
| Backend / API / server-side | backend-consultant |
| PR preparation | pr-manager |
| "Remember to..." / directives | librarian (auto-activates) |
| Cross-cutting (FE + BE) | project-owner (coordinates fe-team-lead + backend-consultant) |
| Guided learning mode | rubber-duck |

## Key Principles

- **Agents guide, they don't auto-generate** code
- **Stateless** invocations (except Librarian-captured directives)
- **Conflicts escalate to user** for final decision
- **Knowledge-driven**: all agents reference `.claude/knowledge/` patterns

## Files

- Agent definitions: `.claude/agents/<agent-id>.md`
- Skills (slash commands): `.claude/skills/`
- Knowledge base: `.claude/knowledge/`
- Web resources reference: `.claude/knowledge/web-resources.md`
- Persistent memory: `.claude/agents/memory/directives.md`
