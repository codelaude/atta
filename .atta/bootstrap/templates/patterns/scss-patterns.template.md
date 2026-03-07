# SCSS Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Naming Convention (BEM)
- Block: `.cmp-component-name`
- Element: `.cmp-component-name__element`
- Modifier: `.cmp-component-name--modifier`
- State classes: `.is-active`, `.is-disabled`, `.has-error`

### Variables and Tokens
- Use design tokens for colors (no hardcoded hex values)
- Use spacing tokens (no magic numbers)
- Use typography tokens for font sizes/weights
- Define breakpoints as variables
- Use `@use` and `@forward` (never `@import`)

### Nesting
- Maximum 3 levels deep
- Avoid nesting selectors just for specificity
- Use `&` for pseudo-classes and BEM modifiers
- Flatten structure when nesting exceeds 3 levels

### Responsive Design
- Mobile-first approach (use `min-width` media queries)
- Use breakpoint mixins for consistency
- Test at standard breakpoints and edge cases
- Avoid fixed widths — use relative units

### Theming
- All colors from theme variables
- Support light/dark themes via CSS custom properties
- Use `prefers-color-scheme` for system preference
- Test both themes for contrast compliance

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| `@import` statements | Use `@use` and `@forward` | MEDIUM |
| Hardcoded colors | Use theme variables | HIGH |
| Magic numbers for spacing | Use spacing tokens | HIGH |
| Nesting > 3 levels | Flatten structure with BEM | HIGH |
| `!important` | Fix specificity issue instead | HIGH |
| `max-width` media queries | Use mobile-first `min-width` | MEDIUM |

## See Also

- [Sass Documentation](https://sass-lang.com/documentation)
- [BEM Methodology](https://getbem.com/)
- [MDN CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
