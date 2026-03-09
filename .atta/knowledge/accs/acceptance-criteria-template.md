---
type: acceptance_criteria
feature: "[Feature/Component Name]"
ticket: "[TICKET-ID]"
branch: "[branch-name]"
status: template
date: YYYY-MM-DD
---

# [Feature/Component Name] - Acceptance Criteria ([TICKET-ID])

> Replace this with a summary of the feature's purpose and acceptance criteria.

---

## User Stories

**As a** [user type]
**I want** [goal]
**So that** [benefit]

---

## Acceptance Criteria

| ID | Category | Acceptance Criteria | Criticality |
|----|----------|---------------------|-------------|
| ACC-001 | Functionality | [Testable statement describing expected behavior] | High/Medium/Low |
| ACC-002 | UI/UX | [Testable statement about user interface] | High/Medium/Low |
| ACC-003 | Accessibility | [Testable statement about WCAG compliance] | High/Medium/Low |
| ACC-004 | Performance | [Testable statement about performance metrics] | High/Medium/Low |
| ACC-005 | Security | [Testable statement about security requirements] | High/Medium/Low |

---

## Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| [Error condition] | [How system should handle it] |
| [Boundary condition] | [Expected result] |
| [Invalid input] | [Validation message or behavior] |

---

## Testing Checklist

### Functional Testing
- [ ] ACC-001: [Description of test]
- [ ] ACC-002: [Description of test]

### Accessibility Testing
- [ ] Keyboard navigation works (Tab, Enter, Esc, Arrow keys)
- [ ] Screen reader announces correctly
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] Focus indicators visible

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Responsive Testing
- [ ] Mobile (320px - 767px)
- [ ] Tablet (768px - 1023px)
- [ ] Desktop (1024px+)

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Accessibility audit passed
- [ ] Code review approved
- [ ] Documentation updated
- [ ] No console errors or warnings

---

## Notes

Add any additional context, dependencies, or technical considerations here.
