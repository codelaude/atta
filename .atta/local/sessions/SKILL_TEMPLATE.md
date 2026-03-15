# Session Tracking - Skill Integration Template

Session tracking is handled automatically by Claude Code hooks since v2.5.3. Skills no longer need session tracking boilerplate.

See `TRACKING_GUIDE.md` for details on the hook-based approach.

## Skill Template (no session tracking needed)

```markdown
---
name: atta-your-skill
description: Your skill description
---

You are now acting as **Your Skill**.

## How to Use

\`\`\`
/atta-your-skill              # Default usage
/atta-your-skill --flag       # With flags
\`\`\`

## Execution Steps

### Step 1: ...
### Step 2: ...

## Error Handling & Recovery

### Error Name

\`\`\`markdown
Error description.

Recovery options:
1. Option 1
2. Option 2
\`\`\`
```
