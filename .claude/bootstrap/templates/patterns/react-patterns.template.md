# React Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> React version: {{FRAMEWORK_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Component Structure
- Use functional components with hooks (no class components)
- One component per file, named export matching filename
- Props defined with TypeScript interfaces
- Destructure props in function signature
- Keep components focused — extract when exceeding ~150 lines

### Hooks
- `useState` for local state, `useReducer` for complex state
- `useEffect` for side effects — always return cleanup function
- `useMemo` for expensive computations
- `useCallback` for stable function references passed to children
- `useRef` for mutable values that don't trigger re-renders
- Custom hooks for reusable logic (`use*.ts`)

### Effects
- Always specify dependency arrays
- Empty array `[]` = run once on mount
- Return cleanup function for subscriptions/timers
- Avoid unnecessary effects — derive from state when possible
- Use `useLayoutEffect` only for DOM measurement before paint

### Props
- TypeScript interfaces for all props
- Use `children: React.ReactNode` for component children
- Avoid prop drilling — use Context or composition
- Default values via destructuring, not `defaultProps`
- Use discriminated unions for variant props

### Rendering
- Use `key` prop on all mapped elements (stable IDs, not index)
- Conditional rendering with `&&` or ternary (not `if` in JSX)
- Extract complex conditions to variables
- Use `React.Fragment` or `<>` to avoid wrapper divs
- Memoize with `React.memo` only when measured benefit

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Class components in new code | Refactor to functional components with hooks | HIGH |
| Missing dependency in useEffect | Add all dependencies or restructure | CRITICAL |
| Inline objects/arrays in deps | Extract with useMemo or move outside | HIGH |
| State for derived data | Use useMemo or compute inline | MEDIUM |
| Direct DOM manipulation | Use refs and React state | HIGH |
| Index as key in dynamic lists | Use stable unique IDs | HIGH |
| Prop drilling >3 levels | Use Context or composition pattern | MEDIUM |
| useEffect for data fetching (if using framework) | Use framework data fetching (loader, RSC, etc.) | MEDIUM |

## State Management

- Component-local: `useState` / `useReducer`
- Shared between siblings: lift state to parent
- App-wide: Context API (simple) or Zustand/Redux (complex)
- Server state: React Query / SWR / framework data fetching
- URL state: React Router / framework routing

## See Also

- [React Docs](https://react.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
