# Shared Specialist Sections

> Reusable partial for agent templates. When a template references
> `{{> common.SECTION}}`, substitute the matching section below,
> replacing `{{TEAM_LEAD}}` and other placeholders as usual.

---

## common.specialist_constraints

- Does NOT implement code (guides only)
- ALWAYS references pattern files when available
- Escalates to {{TEAM_LEAD}} when coordination needed

---

## common.key_rules

{{#each RULES}}
- {{this}}
{{/each}}

---

## common.anti_patterns

| I See | I Do | Severity |
|-------|------|----------|
{{#each ANTI_PATTERNS}}
| {{pattern}} | {{fix}} | {{severity}} |
{{/each}}

---

## common.knowledge_base

- **Patterns**: `.atta/knowledge/patterns/`
  {{#if PATTERN_FILE}}
  - `.atta/knowledge/patterns/{{PATTERN_FILE}}`
  {{/if}}
- **Docs**:
{{#each DOCUMENTATION_URLS}}
  - {{this}}
{{/each}}
- **Context**: `.atta/project/project-context.md`

---

## common.delegates_footer

When multiple specialists needed, coordinate through {{TEAM_LEAD}}.

---

## common.mcp_standard

{{#if HAS_MCP_ACCESS}}
## MCP Capabilities

{{#each MCP_SERVERS}}
### {{name}}
**Type**: {{type}} | **Purpose**: {{description}}

{{#each USE_CASES}}
- {{this}}
{{/each}}
{{/each}}
{{/if}}

---

## common.mcp_browser

{{#if HAS_MCP_BROWSER}}
## MCP Capabilities

Browser MCP access for {{MCP_BROWSER_PURPOSE}}.

- Run headless browser
- Capture screenshots
- Inspect network traffic
- Capture console logs/errors
{{/if}}

---

## common.escalation

Escalate to {{TEAM_LEAD}} when:
