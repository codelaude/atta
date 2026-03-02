# Accessibility Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Standard: WCAG 2.1 AA
> Generated: {{GENERATED_DATE}}

## Key Rules

### Semantic HTML
- Use `<button>` for clickable actions (not `<div @click>`)
- Use `<a>` for navigation links
- Use heading hierarchy (`h1` → `h2` → `h3`, no skipping)
- Use `<nav>`, `<main>`, `<aside>`, `<footer>` for landmarks
- Use `<ul>`/`<ol>` for lists (with `role="list"` if styled)

### ARIA
- Use ARIA only when native HTML is insufficient
- `aria-label` for elements without visible text
- `aria-labelledby` to reference visible text
- `aria-describedby` for supplementary descriptions
- `aria-live="polite"` for dynamic content updates
- `aria-expanded` for expandable sections
- `aria-hidden="true"` for decorative elements

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Logical tab order (DOM order matches visual order)
- Focus visible styles on all focusable elements
- Escape key closes modals/dropdowns
- Trap focus within modals while open
- Use `nextTick` for focus management after state changes

### Color and Contrast
- Text contrast ratio: 4.5:1 minimum (AA)
- Large text contrast: 3:1 minimum
- Never convey information by color alone
- Use patterns, icons, or text alongside color
- Test with color blindness simulators

### Forms
- Every input has an associated `<label>`
- Error messages linked with `aria-describedby`
- Required fields marked with `aria-required="true"`
- Group related fields with `<fieldset>` and `<legend>`
- Live error announcements with `aria-live`

### Images and Media
- All `<img>` must have `alt` attribute
- Decorative images: `alt=""` and `aria-hidden="true"`
- Complex images: provide long description
- Video: captions and transcripts
- Audio: transcripts

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| `<div @click>` or `<span @click>` | Use `<button>` element | CRITICAL |
| Missing `alt` on images | Add descriptive alt text | CRITICAL |
| Styled `<ul>` without `role="list"` | Add `role="list"` | HIGH |
| Color-only information | Add text or icon indicator | HIGH |
| No focus management in modals | Trap focus and manage with nextTick | HIGH |
| Missing form labels | Add `<label>` or `aria-label` | CRITICAL |
| `aria-live` on the element that changes | Place `aria-live` on parent container | HIGH |
| Keyboard trap (can't escape) | Add Escape key handler | CRITICAL |
| Heading level skipping (h1 → h3) | Use proper hierarchy | MEDIUM |

## Testing Checklist

- [ ] Tab through entire page — all interactive elements reachable
- [ ] Screen reader announcement makes sense
- [ ] Zoom to 200% — no content hidden or overlapping
- [ ] High contrast mode — all content visible
- [ ] Keyboard-only — all functionality accessible
- [ ] Focus indicators visible on all interactive elements

## See Also

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
