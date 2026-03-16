# Extending the System

The entire bootstrap system is configuration-driven. **No code changes required** to add new technologies.

## Adding a New Technology

### 1. Add Detection Rule

Add to the appropriate file in `.atta/bootstrap/detection/`:
- `frontend-detectors.yaml`
- `backend-detectors.yaml`
- `database-detectors.yaml`
- `tool-detectors.yaml`
- `security-tools.yaml` (for security scanners/middleware)

**Example: Adding Remix support**
```yaml
# frontend-detectors.yaml, under frameworks:
  - name: Remix
    identifier: remix
    requires:                          # Only activate if React is also detected
      - react
    detection:
      package_json:
        dependencies:
          - "@remix-run/react"
      config_files:
        - remix.config.js
        - remix.config.ts
    content_analysis:                  # Semantic labels for deeper context
      - file: "app/routes/**/*.{tsx,jsx}"
        match_type: exists
        label: file-based-routing
        description: "Uses file-based routing"
      - file: "app/**/*.{tsx,jsx}"
        pattern: "useLoaderData|loader"
        label: loader-pattern
        description: "Uses Remix loader pattern for data fetching"
    version_detection:
      file: package.json
      path: dependencies["@remix-run/react"]
    metadata:
      type: frontend_framework
      component_model: hooks
      needs_coordinator: true
      specialist_type: framework
      extends: react
      owasp_type: fullstack
```

#### Detection YAML Schema Reference

| Field | Type | Purpose |
|-------|------|---------|
| `identifier` | string | Unique kebab-case ID |
| `requires` | string[] | Other identifiers that must be detected first |
| `detection` | object | File/package/config matching rules |
| `content_analysis` | array | Semantic analysis entries (see below) |
| `version_detection` | object | Version extraction from files or commands |
| `metadata` | object | Classification (type, language, specialist_type, etc.) |

**`content_analysis` entries:**

| Field | Type | Purpose |
|-------|------|---------|
| `file` | string | Glob pattern for files to check |
| `match_type` | string | `exists` — check if matching files exist (no content scan) |
| `pattern` | string | Regex to match against file content (sampled, up to 5 files) |
| `label` | string | Machine-readable label (kebab-case) |
| `description` | string | Human-readable description for project-context.md |

### 2. Add Agent Mapping

Add to `.atta/bootstrap/mappings/agent-mappings.yaml`:

```yaml
remix:
  template: framework-specialist.template.md
  output: agents/specialists/remix.md
  variables:
    FRAMEWORK_NAME: "Remix"
    FRAMEWORK_ID: "remix"
    FRAMEWORK_TYPE: "full-stack React"
    TEAM_LEAD: "fe-team-lead"
    STYLING_SPECIALIST: "tailwind / css-modules"
    TESTING_SPECIALIST: "vitest"
  rules:
    - "Use loader functions for server-side data fetching"
    - "Use action functions for mutations"
    - "Leverage nested routing for better UX"
    - "Prefer form submissions over fetch for mutations"
  anti_patterns:
    - pattern: "Using useEffect for data fetching"
      fix: "Use loader functions instead"
      severity: "HIGH"
    - pattern: "Client-side state for server data"
      fix: "Use loader data and revalidation"
      severity: "MEDIUM"
  documentation_urls:
    - "https://remix.run/docs"
```

### 3. Create Pattern Template (Optional)

Create `.atta/bootstrap/templates/patterns/remix-patterns.template.md`:

```markdown
# Remix Patterns

> Auto-generated for Remix {{VERSION}} detected in your project.

## Key Principles

- **Progressive Enhancement**: Forms work without JavaScript
- **Server-First**: Data fetching happens on the server
- **Nested Routing**: Layout composition through route nesting
- **Optimistic UI**: Built-in support for optimistic updates

## Data Loading

### DO: Use Loader Functions
\```typescript
// app/routes/posts.$id.tsx
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const post = await getPost(params.id);
  return json({ post });
};
\```

### DON'T: Client-Side Fetching
\```typescript
// ❌ Avoid
export default function Post() {
  const [post, setPost] = useState(null);
  useEffect(() => {
    fetchPost().then(setPost);
  }, []);
}
\```

## Mutations

### DO: Use Action Functions + Forms
\```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  await createPost(formData);
  return redirect("/posts");
};

export default function NewPost() {
  return <Form method="post">...</Form>;
}
\```

## See Also

- [Official Remix Docs](https://remix.run/docs)
- [Remix Examples](https://github.com/remix-run/examples)
```

### 4. Run `/atta`

That's it! The new technology will be:
- ✅ Detected during project scan
- ✅ Mapped to the appropriate template
- ✅ Generated as a specialist agent
- ✅ Included in routing table
- ✅ Referenced in pattern files

## Adding Custom MCP Servers

Add to `.atta/bootstrap/mappings/mcp-mappings.yaml`:

```yaml
custom_api_mcp:
  enabled_by_default: false
  priority: medium
  description: "Custom API integration for internal tools"

  your_api:
    condition: has_custom_config_file  # Define your condition
    agents_with_access:
      - project-owner
      - custom-specialist
    recommendation_reason: "Detected custom API config - MCP can help with endpoint discovery"
    capabilities:
      - "API endpoint documentation"
      - "Request/response validation"
      - "Authentication flow testing"
```

## Best Practices

### Detection Rules
- Be specific with file/dependency indicators to avoid false positives
- Include version extraction for tech-specific guidance
- Use meaningful category names

### Agent Mappings
- Provide comprehensive anti-patterns (these are the most valuable!)
- Link to official documentation
- Keep rules actionable and specific
- Consider what the specialist delegates to (styling, testing, etc.)

### Pattern Templates
- Include "DO" and "DON'T" examples
- Cover the most common use cases
- Link to official resources
- Keep it focused (one page max for most patterns)

## File Structure Reference

```
.atta/
├── bootstrap/
│   ├── detection/
│   │   ├── frontend-detectors.yaml   # Add frontend framework detection here
│   │   ├── backend-detectors.yaml    # Add backend framework detection here
│   │   ├── database-detectors.yaml   # Add database detection here
│   │   ├── tool-detectors.yaml       # Add build tool/testing framework detection here
│   │   └── security-tools.yaml       # Add security tool detection here
│   ├── mappings/
│   │   ├── agent-mappings.yaml       # Add agent mapping here
│   │   ├── mcp-mappings.yaml         # Add MCP server mapping here
│   │   └── skill-mappings.yaml       # Add custom skill mappings here
│   └── templates/
│       ├── agents/                   # Universal agent templates
│       │   ├── _common.md                        # Shared partial (constraints, knowledge base, etc.)
│       │   ├── framework-specialist.template.md
│       │   ├── language-specialist.template.md
│       │   ├── database-specialist.template.md
│       │   ├── styling-specialist.template.md
│       │   ├── testing-specialist.template.md
│       │   ├── e2e-testing-specialist.template.md
│       │   ├── security-specialist.template.md
│       │   ├── accessibility-specialist.template.md
│       │   ├── prompt-engineer.template.md
│       │   ├── fe-team-lead.template.md
│       │   └── be-team-lead.template.md
│       └── patterns/                 # Tech-specific pattern templates (optional)
│           └── your-tech-patterns.template.md
```

## See Also

- [Bootstrap System](bootstrap-system.md) - How detection & generation works
- [Changelog](changelog.md) - Version history
- [Main README](../../README.md) - Quick start guide
