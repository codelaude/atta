---
applyTo: "**"
description: PR Description Template Guidelines
---

# Pull Request Description Template

When creating pull request descriptions, follow this structure for clarity and completeness.

## Structure

### Header
```markdown
# [TICKET-ID]
## About
[1-2 paragraph description of the feature/fix and its purpose]
```

### Changes Section
Organize changes by category:

#### New Components Created
For each new component, document:
- Component name and file path
- Props (name and type)
- Emits (event names)
- Key features (bullet points)
- Test coverage percentage

#### Modified Components
For each modified component:
- Component name and brief description of changes
- Key functionality added/changed
- API changes (new props, events, methods)

#### Shared Utilities/Composables
Document changes to shared code:
- File path
- Function signature changes
- New parameters/return values
- Backward compatibility notes

#### Styling Updates
Document CSS/SCSS changes:
- File names
- New classes/variants
- Theme variable changes
- Component registrations

#### Tests
For each test file:
- Test file name
- Key test scenarios covered
- Number of tests
- Coverage percentage (if applicable)
- Snapshot updates

### Testing Section
```markdown
## Testing
- [Step-by-step instructions for testing]
- [Any required setup or configuration]
- [Expected behavior to verify]
- [Edge cases to test]
```

### Notes Section
```markdown
## Notes
- [Important callouts]
- [Dependencies or prerequisites]
- [Known limitations]
- [Future improvements needed]
```

## Best Practices

### Be Specific
- Bad: "Updated component"
- Good: "Added state management with cookie persistence to chat.vue"

### Document Test Coverage
- Always include test counts and coverage percentages for new components
- Note snapshot updates separately

### Highlight Breaking Changes
- Document migration steps if needed

### Group Related Changes
- Keep component changes together
- Separate frontend and backend changes
- Group test updates by component
