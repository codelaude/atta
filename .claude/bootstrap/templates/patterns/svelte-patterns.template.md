# Svelte Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Svelte version: {{FRAMEWORK_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Reactivity
- Use `$:` label for reactive declarations
- Use `$:` for derived values (computed state)
- Assignments trigger reactivity (push/splice don't — reassign)
- Use stores for shared state across components

### Components
- Props with `export let` (Svelte 4) or `$props()` (Svelte 5)
- Events with `createEventDispatcher` or callback props
- Two-way binding with `bind:value`
- Slots for component composition
- Use `{#if}`, `{#each}`, `{#await}` blocks

### Stores
- Writable stores for mutable shared state
- Readable stores for derived/external state
- Use `$store` auto-subscription syntax
- Custom stores with subscribe method
- Derived stores for computed values

### Transitions
- Built-in transitions: `fade`, `slide`, `fly`, `scale`
- Use `transition:` directive for enter/exit
- Use `in:` / `out:` for separate enter/exit animations
- Custom transitions for complex animations

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Manual DOM manipulation | Use Svelte's reactive declarations | HIGH |
| Array.push without reassignment | Reassign array to trigger reactivity | CRITICAL |
| Global mutable state without stores | Use Svelte stores | HIGH |

## See Also

- [Svelte Documentation](https://svelte.dev/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
