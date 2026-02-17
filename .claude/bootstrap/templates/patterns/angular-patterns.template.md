# Angular Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Angular version: {{FRAMEWORK_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Components
- Use standalone components (Angular 14+)
- Use Signals for reactive state (Angular 16+)
- OnPush change detection strategy for performance
- Smart/dumb component pattern (container/presentational)
- Use `inject()` function for dependency injection

### Reactive Programming
- Use Signals for synchronous reactive state
- Use RxJS for async operations and streams
- Always unsubscribe from observables (async pipe, takeUntil, or DestroyRef)
- Avoid nested subscriptions — use operators (switchMap, mergeMap)
- Use `toSignal()` and `toObservable()` for interop

### Services
- Use `@Injectable({ providedIn: 'root' })` for singletons
- Keep services focused (single responsibility)
- Use constructor injection (or `inject()` function)
- Separate HTTP logic into dedicated services

### Forms
- Reactive Forms for complex validation
- Template-driven forms for simple cases
- Custom validators for business rules
- Use form arrays for dynamic fields

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| NgModules for new components | Use standalone components | MEDIUM |
| Not unsubscribing from observables | Use async pipe or takeUntil | CRITICAL |
| Nested subscriptions | Use RxJS operators | HIGH |
| Default change detection everywhere | Use OnPush strategy | MEDIUM |

## See Also

- [Angular Documentation](https://angular.dev/)
- [RxJS Documentation](https://rxjs.dev/)
