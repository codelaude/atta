# Vue.js Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Vue version: {{FRAMEWORK_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Component Structure
- Use `<script setup>` with Composition API (Vue 3)
- Component name must match filename (PascalCase)
- Props defined with `defineProps()` and TypeScript interfaces
- Emits defined with `defineEmits()` and type-safe signatures
- Use `expose()` if parent needs access to component internals

### Reactivity
- Use `ref()` for primitives, `reactive()` for objects
- Use `computed()` for derived state (never set computed values)
- Use `watch()` / `watchEffect()` for side effects
- Avoid destructuring reactive objects (loses reactivity)
- Use `toRefs()` when destructuring is needed

### Props and Events
- Props are readonly — never mutate directly
- Emit events for parent state changes
- Use `v-model` with `modelValue` prop and `update:modelValue` emit
- Validate props with `validator` function for complex rules
- Default values for object/array props must be factory functions

### Lifecycle
- `onMounted()` for DOM access and initial API calls
- `onUnmounted()` for cleanup (event listeners, timers, subscriptions)
- `onBeforeUnmount()` for cleanup before DOM removal
- `nextTick()` for DOM updates after state changes
- Avoid `onBeforeMount()` — use `<script setup>` top-level instead

### Composables
- Extract reusable logic into composables (`use*.ts`)
- Follow naming convention: `useFeatureName`
- Return reactive refs and functions
- Handle cleanup with `onUnmounted` inside composable
- Accept refs as parameters for reactive inputs

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Options API in new Vue 3 code | Refactor to Composition API with `<script setup>` | HIGH |
| Mutating props directly | Emit event to parent for state changes | CRITICAL |
| `any` type for props | Define proper TypeScript interfaces | HIGH |
| Missing `key` on `v-for` | Add unique `:key` binding | CRITICAL |
| `v-if` with `v-for` on same element | Move `v-if` to wrapper or use computed | HIGH |
| `setTimeout` without cleanup | Clear timer in `onUnmounted` | HIGH |
| Direct DOM manipulation | Use template refs and Vue reactivity | HIGH |
| Deeply nested event chains | Use provide/inject or state management | MEDIUM |

## Template Patterns

### DO: Semantic HTML with Accessibility
```vue
<template>
  <button
    type="button"
    :aria-label="label"
    :disabled="isDisabled"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
```

### DON'T: Div Soup Without Semantics
```vue
<!-- Avoid -->
<template>
  <div @click="handleClick" class="button">
    <span>{{ text }}</span>
  </div>
</template>
```

## State Management

- Component-local state: `ref()` / `reactive()`
- Parent-child: props down, events up
- Siblings: shared parent state or provide/inject
- App-wide: Pinia store (recommended) or Vuex
- Avoid global event bus pattern

## See Also

- [Vue 3 Docs](https://vuejs.org/)
- [VueUse Composables](https://vueuse.org/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia State Management](https://pinia.vuejs.org/)
