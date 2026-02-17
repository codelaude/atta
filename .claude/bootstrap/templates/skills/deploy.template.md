---
name: deploy
description: Deploy using {{DEPLOY_TYPE}}
---

You are assisting with project deployment via {{DEPLOY_TYPE}}.

## Commands

| Action | Command |
|--------|---------|
| Build/Deploy | `{{BUILD_COMMAND}}` |
{{#if STATUS_COMMAND}}
| Check status | `{{STATUS_COMMAND}}` |
{{/if}}
{{#if RUN_COMMAND}}
| Run locally | `{{RUN_COMMAND}}` |
{{/if}}

## Steps

1. **Pre-deploy checks**:
   - Verify all tests pass
   - Verify build succeeds
   - Check for uncommitted changes
2. **Execute deployment**: Run `{{BUILD_COMMAND}}`
3. **Verify deployment**:
   - Check deployment status
   - Verify the application is running
   - Report any errors or warnings
4. **Post-deploy**: Report deployment status and any action items

## Response Format

```markdown
## Deployment Results

**Status**: SUCCESS / FAILED
**Type**: {{DEPLOY_TYPE}}
**Command**: `{{BUILD_COMMAND}}`

### Pre-Deploy Checks
- [ ] Tests passing
- [ ] Build successful
- [ ] No uncommitted changes

### Deployment Output
[Command output summary]

### Post-Deploy Verification
[Status check results]
```

## Important

- Do NOT deploy without asking the user first
- Always run pre-deploy checks before deploying
- If deployment fails, report the error and suggest recovery steps
- Note any required environment variables or credentials
