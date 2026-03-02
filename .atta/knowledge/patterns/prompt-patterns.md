# Prompt Enrichment Patterns

> Guidelines for enriching prompts with project context for cross-tool handoff.

## Enrichment Principles

1. **Inject only what's missing** — the target tool may already know some things (e.g., Copilot sees the repo)
2. **Distill, don't dump** — 10 lines of relevant context beats 100 lines of everything
3. **Preserve intent** — the enriched prompt must do what the user asked, not what seems better
4. **Be explicit about versions** — "React 18" not "React", "TypeScript 5.3 strict" not "TypeScript"
5. **Conventions over opinions** — inject the project's actual patterns, not general best practices

## Common Enrichment Patterns

### Pattern: Stack Declaration
When to use: Always (minimum enrichment).

```
Tech stack: [Framework] [Version], [Language], [Styling], [Test runner]
Build: [command] | Test: [command] | Lint: [command]
```

### Pattern: Convention Injection
When to use: Task involves writing or modifying code.

```
Conventions:
- Functions: [camelCase/snake_case]
- Components: [co-located/flat] in [path]
- Testing: [framework] with [pattern]
- Docs: [jsdoc/inline/minimal]
```

### Pattern: Architecture Context
When to use: Task involves structure, new features, or file organization.

```
Architecture:
- Structure: [e.g., Feature-sliced (src/features/, src/entities/, src/shared/)]
- Routing: [e.g., File-based (src/pages/)]
- State: [e.g., Store-per-feature (src/stores/)]
- API: [e.g., Service layer (src/services/)]
```

### Pattern: Constraint Block
When to use: Task involves code that must follow specific rules.

```
Constraints:
- [Anti-pattern to avoid] → [what to do instead]
- [Convention] — [reason]
- [Preference] — [user's chosen approach]
```

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Do This Instead |
|-------------|-------------|----------------|
| Dumping full pattern files | Overwhelms the target tool, wastes tokens | Distill to 3-5 relevant rules |
| Including Atta internals | Confuses the target tool with framework-specific instructions | Only inject project context |
| Rewriting the user's prompt | Changes intent, user loses ownership | Clarify ambiguity, preserve the goal |
| Including secrets or env vars | Security risk | Use placeholders like `$DATABASE_URL` |
| Over-specifying for tools with repo access | Redundant context, wastes tokens | Focus on what Copilot/Codex can't infer |
| Generic best practices | Not project-specific, adds noise | Inject the project's actual conventions |

## Target Tool Characteristics

| Tool | Has Repo Access | Context Window | Best Format |
|------|----------------|----------------|-------------|
| Codex | Yes (full repo) | Large | Explicit file-level instructions |
| Copilot | Yes (current file + neighbors) | Medium | Concise conventions + constraints |
| ChatGPT | No | Large | Self-contained with examples |
| Gemini | No | Very large | Structured sections, can handle detail |
| Claude | No (unless MCP) | Large | Project summary + pattern references |
