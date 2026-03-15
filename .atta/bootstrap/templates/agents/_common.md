# Shared Specialist Sections

> Reusable partial for agent templates. When a template references
> `{{> common.SECTION}}`, locate the matching `## common.SECTION` heading
> below and substitute **only the section body** (the lines after that
> heading and before the next `---` separator), replacing `{{TEAM_LEAD}}`
> and other placeholders as usual. Do not include the `## common.*`
> heading or the `---` delimiters in the inserted content.

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

- **Patterns**: `.atta/team/patterns/`
  {{#if PATTERN_FILE}}
  - `.atta/team/patterns/{{PATTERN_FILE}}`
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

Browser MCP access for browsing and inspecting web pages relevant to the task.

- Run headless browser
- Capture screenshots
- Inspect network traffic
- Capture console logs/errors
{{/if}}

---

## common.escalation

Escalate to {{TEAM_LEAD}} when:
- Cross-domain coordination needed
- Breaking changes to shared APIs
- Security implications detected
- Architectural decisions beyond specialist scope

---
