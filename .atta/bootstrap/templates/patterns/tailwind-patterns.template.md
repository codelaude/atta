# Tailwind CSS Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Utility-First
- Use utility classes directly in markup
- Use `@apply` sparingly — prefer component composition
- Custom values in `tailwind.config.js`, not inline styles
- Group utilities logically: layout → spacing → typography → colors → effects

### Responsive Design
- Mobile-first: base styles are mobile, add breakpoint modifiers
- Breakpoint modifiers: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Test at all breakpoints
- Use container queries where supported

### Component Patterns
- Extract repeated utility combinations into components
- Use `clsx` or `cn()` for conditional classes
- Keep class lists readable with line breaks
- Use Tailwind's group/peer modifiers for interactive states

### Customization
- Extend theme in `tailwind.config.js` (don't override defaults)
- Define design tokens as theme values
- Use CSS custom properties for dynamic theming
- Configure content paths for proper tree-shaking

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Overusing `@apply` | Use utility classes or extract component | MEDIUM |
| Inline `style` attributes | Use Tailwind utilities or config | HIGH |
| Arbitrary values everywhere | Define in tailwind.config.js | MEDIUM |
| Not configuring content paths | Add all template paths to content config | CRITICAL |

## See Also

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
