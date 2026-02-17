# TypeScript Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> TypeScript version: {{LANGUAGE_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Type Safety
- Enable `strict: true` in tsconfig.json
- Never use `any` — use `unknown` with type guards if needed
- Avoid type assertions (`as`) — use type guards or proper typing
- Remove all `@ts-ignore` comments — fix the underlying type issue
- Use `satisfies` operator for type checking without widening

### Interfaces and Types
- Use `interface` for object shapes (extendable)
- Use `type` for unions, intersections, and primitives
- Prefix interfaces with `I` only if project convention requires it
- Export types alongside their related code
- Use `readonly` for immutable properties

### Generics
- Use generics for reusable, type-safe code
- Constrain generics with `extends` when needed
- Use descriptive names: `TItem`, `TResponse` (not just `T`)
- Default generic parameters for common cases

### Utility Types
- `Partial<T>` — make all properties optional
- `Required<T>` — make all properties required
- `Pick<T, K>` — select subset of properties
- `Omit<T, K>` — exclude properties
- `Record<K, V>` — typed key-value object
- `ReturnType<T>` — extract function return type
- `Parameters<T>` — extract function parameters

### Null Handling
- Use `?.` (optional chaining) for null checks
- Use `??` (nullish coalescing) instead of `||` for defaults
- Avoid `!` (non-null assertion) — handle null properly
- Use `undefined` over `null` unless API requires it
- Use discriminated unions for nullable state

### Functions
- Type function signatures explicitly (params and return)
- Use function overloads for complex signatures
- Prefer `unknown` over `any` in catch blocks
- Use `never` for exhaustive checks in switch statements

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| `any` type | Use proper types or `unknown` with type guards | CRITICAL |
| `as any` assertion | Fix the type issue properly | CRITICAL |
| `@ts-ignore` | Resolve the underlying type error | HIGH |
| `\|\|` for nullish defaults | Use `??` (nullish coalescing) | HIGH |
| Missing return type on public function | Add explicit return type | MEDIUM |
| Type assertion without validation | Use type guard with runtime check | HIGH |
| Enum for simple unions | Use string literal union type | LOW |

## Type Guard Patterns

### DO: Runtime Type Checking
```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}
```

### DON'T: Unsafe Assertion
```typescript
// Avoid
const user = response.data as User;
```

## See Also

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html)
