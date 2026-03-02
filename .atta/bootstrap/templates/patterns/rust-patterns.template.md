# Rust Patterns

> Auto-generated pattern file for {{PROJECT_NAME}}
> Rust version: {{LANGUAGE_VERSION}}
> Generated: {{GENERATED_DATE}}

## Key Rules

### Ownership and Borrowing
- Each value has exactly one owner
- Use references (`&T`) for borrowing, (`&mut T`) for mutable borrowing
- Prefer borrowing over cloning
- Use lifetimes explicitly when compiler needs help
- Use `Cow<T>` for flexible owned-or-borrowed semantics

### Error Handling
- Use `Result<T, E>` for recoverable errors
- Use `?` operator for error propagation
- Define custom error types with `thiserror`
- Use `anyhow` for application-level error handling
- Reserve `panic!` for truly unrecoverable situations

### Concurrency
- Use `Arc<Mutex<T>>` for shared mutable state
- Prefer message passing with channels
- Use `tokio` or `async-std` for async runtime
- Use `Send` + `Sync` bounds for thread safety
- Avoid blocking in async code

### Patterns
- Use `match` for exhaustive pattern matching
- Use `Option<T>` instead of null
- Use `impl Trait` for return types
- Use derive macros: `Debug`, `Clone`, `PartialEq`
- Use `From`/`Into` traits for type conversion

### Idiomatic Rust
- Use iterators over manual loops
- Use `cargo fmt` for consistent formatting
- Use `cargo clippy` for linting
- Write documentation with `///` doc comments
- Use modules for code organization

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| Ignoring errors with `unwrap()` | Use `?` or handle explicitly | HIGH |
| Shared memory without sync | Use Arc<Mutex<T>> or channels | CRITICAL |
| Panic in library code | Return Result<T, E> instead | HIGH |
| Unnecessary cloning | Use references or Cow | MEDIUM |
| Blocking in async context | Use async alternatives | CRITICAL |

## See Also

- [The Rust Book](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Rust Standard Library](https://doc.rust-lang.org/std/)
