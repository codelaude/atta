# Agent Index

> Auto-generated routing table for your AI Dev Team. Updated by `/init`.

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
| qa-validator | Quality assurance and validation | `/agent qa-validator` |
| business-analyst | Requirements and business logic | `/agent business-analyst` |
| pr-manager | Pull request workflow | `/agent pr-manager` |
| rubber-duck | Brainstorming and problem decomposition | `/agent rubber-duck` |
| librarian | Knowledge capture and directives | `/agent librarian` |

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
/init --rescan
```
