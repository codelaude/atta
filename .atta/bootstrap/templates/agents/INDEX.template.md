# Agent Index

> Auto-generated routing table for your Atta agent team. Updated by `/atta`.

## Team Hierarchy

```
{{HIERARCHY}}
```

## Routing Table

Use this to determine which agent handles what:

| Pattern / Topic | Route |
|----------------|-------|
{{#each ROUTING_RULES}}
| {{pattern}} | {{route}} |
{{/each}}

## Quick Reference

### Core Agents (Always Available)

| Agent | Role | Invoke With |
|-------|------|------------|
| project-owner | Strategic coordinator, escalation endpoint | `/agent project-owner` |
| code-reviewer | Code review and quality checks | `/agent code-reviewer` |
| librarian | Knowledge capture and directives | `/agent librarian` |
| architect | System design, ADRs, and blueprints | `/agent architect` |

### Optional Agents (if installed)

| Agent | Role | Invoke With |
|-------|------|------------|
| business-analyst | Requirements and acceptance criteria | `/agent business-analyst` |
| qa-validator | Acceptance criteria validation | `/agent qa-validator` |
| pr-manager | PR descriptions and completion tracking | `/agent pr-manager` |
| rubber-duck | Guided learning and problem exploration | `/agent rubber-duck` |

> Optional agents are selected during `atta init`. If not installed, invoking them falls back to the closest core agent.

{{#if HAS_FRONTEND}}
### Frontend Team

| Agent | Role | Invoke With |
|-------|------|------------|
| fe-team-lead | Frontend coordination | `/agent fe-team-lead` |
{{#each FRONTEND_SPECIALISTS}}
| {{id}} | {{role}} | `/agent {{id}}` |
{{/each}}
{{/if}}

{{#if HAS_BACKEND}}
### Backend Team

| Agent | Role | Invoke With |
|-------|------|------------|
| be-team-lead | Backend coordination | `/agent be-team-lead` |
{{#each BACKEND_SPECIALISTS}}
| {{id}} | {{role}} | `/agent {{id}}` |
{{/each}}
{{/if}}

## How Routing Works

1. **Direct invocation**: `/agent [id]` routes to specific agent
2. **Team lead routing**: `/team-lead` decomposes tasks and delegates to specialists
3. **Escalation chain**: Specialist → Coordinator → Project Owner

## Regenerate

To update this index after adding new technologies:
```
/atta --rescan
```
