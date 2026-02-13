---
type: quick_reference
priority: critical
format: decision_tree
---

# Quick Reference - Decision Trees & Anti-Patterns

> **Fast lookups only.** Each section is self-contained.

---

## When I See -> Then I Do

### TypeScript
| I See | I Do | Severity |
|-------|------|----------|
| `any` | Replace with proper type, `unknown`, or `Partial<T> as T` | CRITICAL |
| `as any` | Use `as Partial<Type> as Type` | CRITICAL |
| `\|\|` for nullish | Replace with `??` | HIGH |
| Interface without `I` prefix | Rename to `IInterfaceName` | MEDIUM |

### Vue
| I See | I Do | Severity |
|-------|------|----------|
| `<script setup>` alone | Wrap in `defineComponent` | CRITICAL |
| `inject: { default: () => ({}) }` | Change to `default: {}` | HIGH |
| `setTimeout` without cleanup | Add `beforeUnmount` with `clearTimeout` | HIGH |
| kebab-case prop in template | Use camelCase everywhere | MEDIUM |

### Accessibility
| I See | I Do | Severity |
|-------|------|----------|
| `<ul>` with `list-style: none` | Add `role="list"` and `role="listitem"` | CRITICAL |
| Live region in child component | Move to parent, emit events instead | CRITICAL |
| Live region created with content | Prime empty first, then update | CRITICAL |
| Focus without `nextTick` | Add `await nextTick()` | HIGH |
| `<div @click>` | Change to `<button>` | HIGH |

### Testing
| I See | I Do | Severity |
|-------|------|----------|
| `config.global.provide` | Use local `provide` in mount() | CRITICAL |
| `mount()` without cleanup | Add `wrapper?.unmount()` in `afterEach` | HIGH |
| Focus test without `attachTo` | Add `attachTo: document.body` | HIGH |
| `as any` in test | Use `as Partial<T> as T` | MEDIUM |

### SCSS
| I See | I Do | Severity |
|-------|------|----------|
| `@import` | Replace with `@use` with alias | CRITICAL |
| Hardcoded color `#fff` | Use theme variables | HIGH |
| Hardcoded spacing `16px` | Use spacing tokens | MEDIUM |
| Non-BEM class | Refactor to `.cmp-block__element--modifier` | MEDIUM |

---

## Bug Fixing - Root Cause First

### Before Writing Code
```
1. "What's the simplest thing that SHOULD work?"
2. "Why doesn't it work?" -> Inspect directly (DevTools, logs)
3. Find the CAUSE, not the symptom
4. Remove code > Add code
```

### Red Flags (Stop & Re-evaluate)
- Writing JS to work around CSS behavior
- Adding complexity to "fix" detection logic
- Investigation doc has 5+ failed attempts
- Calculating something browser should handle

---

## File Type -> Required Reading

| Editing | Read First |
|---------|------------|
| `*.vue` | vue patterns + accessibility patterns |
| `*.test.ts` | testing patterns + typescript patterns |
| `*.scss` | scss patterns |
| `*.ts` | typescript patterns |
| Any UI/UX | accessibility patterns |

---

## Pre-Commit Checklist

### TypeScript
- [ ] No `any` types
- [ ] Interfaces prefixed with `I`
- [ ] `?.` and `??` for null checks

### Vue
- [ ] `defineComponent` wrapper (no standalone `<script setup>`)
- [ ] `inject` uses `default: {}` (object literal)
- [ ] `setTimeout` cleaned up in `beforeUnmount`

### Accessibility
- [ ] `role="list"` on styled lists
- [ ] `nextTick` before focus
- [ ] Live regions in parent only
- [ ] Buttons for actions, links for navigation

### Testing
- [ ] No `config.global.provide` (local provide only)
- [ ] `wrapper.unmount()` in `afterEach`
- [ ] `attachTo: document.body` for focus tests

### SCSS
- [ ] `@use` (not `@import`)
- [ ] BEM naming
- [ ] Theme variables (no hardcoded colors)

---

## Code Smell Patterns

### Memory Leaks
```typescript
// BAD: setTimeout without cleanup
mounted() {
  setTimeout(() => this.doSomething(), 1000)
}

// GOOD: Store ID and clear
data() { return { timeoutId: null } },
mounted() {
  this.timeoutId = setTimeout(() => this.doSomething(), 1000)
},
beforeUnmount() {
  if (this.timeoutId) clearTimeout(this.timeoutId)
}
```

### Test Pollution
```typescript
// BAD: Global provide
config.global.provide = { i18n: mock }

// GOOD: Local provide
mount(Component, { provide: { i18n: mock } })
```

### Type Casting
```typescript
// BAD
wrapper.vm.element = element as any

// GOOD
const mockEl = { focus: jest.fn() } as Partial<HTMLElement> as HTMLElement
```

---

## Decision Trees

### New Component?
```
1. Can I reuse existing? -> Check existing components first
2. No -> Create: .vue + .scss + .test.ts + IComponentName.ts
3. Needs i18n? -> Add to all language files
```

### Testing Setup?
```
1. Needs i18n? -> Add local provide
2. Tests focus? -> Add attachTo: document.body
3. Uses timers? -> Add fake timers
4. Needs store? -> Add store setup
5. Always -> Add afterEach unmount
```

### Focus Management?
```
1. Mobile? -> Often use native browser behavior
2. Desktop? -> Custom focus management OK
3. After content change? -> nextTick then focus
4. Target visible? -> Focus it
5. Target hidden? -> Focus nearest visible element
```
