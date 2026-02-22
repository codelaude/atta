# Bootstrap Generator Logic

> **Purpose**: This file contains the core logic for dynamically generating agents, skills, and configurations based on detected project technology stacks.
>
> **Used by**: The `/atta` skill reads this file to understand how to:
> 1. Load detection rules from YAML files
> 2. Map detected technologies to templates
> 3. Perform variable substitution
> 4. Generate specialized agents
> 5. Create MCP configurations

---

## Overview

The bootstrap system transforms the `.claude/` framework from a static, Vue/AEM-focused setup into an adaptive system that generates appropriate agents for ANY tech stack.

**Architecture**:
```
Detection Files (YAML) → Agent Mappings (YAML) → Templates (Markdown) → Generated Agents (Markdown)
       ↓                         ↓                       ↓                      ↓
  What tech is used?    Which agents to create?    Agent structure       Final specialized agents
```

---

## Phase 1: Load Detection Rules

### Files to Load
Load YAML detection rules from:
1. `bootstrap/detection/frontend-detectors.yaml`
2. `bootstrap/detection/backend-detectors.yaml`
3. `bootstrap/detection/database-detectors.yaml`
4. `bootstrap/detection/tool-detectors.yaml`
5. `bootstrap/detection/security-tools.yaml`

### Detection Process

For each detection file, scan the project for matching indicators:

**Package.json detection** (Node.js projects):
```javascript
// Pseudo-logic
for each detector in frontend_detectors.frameworks:
  if package.json exists:
    read dependencies and devDependencies
    for each dependency in detector.detection.package_json:
      if dependency in (dependencies OR devDependencies):
        mark detector as DETECTED
        extract version from package.json
        store detector.metadata
```

**File-based detection** (All projects):
```javascript
for each detector in all_detectors:
  if detector.detection.files:
    for each file_pattern in detector.detection.files:
      if file exists matching pattern:
        mark detector as DETECTED

  if detector.detection.content_match:
    for each file, pattern in detector.detection.content_match:
      if file exists AND contains pattern:
        mark detector as DETECTED

  if detector.detection.directory_exists:
    for each directory in detector.detection.directory_exists:
      if directory exists:
        mark detector as DETECTED
```

**File pattern detection** (glob patterns):
```javascript
for each detector with file_patterns:
  search_results = glob(detector.file_patterns)
  if search_results.length > 0:
    mark detector as DETECTED
```

### Detection Results

Build a detection manifest:
```yaml
detected:
  frontend:
    - vue:
        version: "3.2.0"
        metadata:
          type: frontend_framework
          component_model: reactive
          needs_coordinator: true
    - typescript:
        version: "5.3.3"
        metadata:
          type: language
          typed: true
  backend:
    - python:
        version: "3.11"
        metadata:
          type: language
    - django:
        version: "5.0"
        metadata:
          type: backend_framework
          api_pattern: rest
  databases:
    - postgresql:
        detected_via: package.json (pg)
        metadata:
          type: database
          category: sql
  styling:
    - scss:
        detected_via: file_patterns (*.scss)
  testing:
    - jest:
        detected_via: package.json devDependencies
  build_tools:
    - vite:
        version: "5.0.0"
  security:
    - snyk:
        detected_via: file (.snyk)
        metadata:
          type: dependency_scanner
          category: security
          triggers_security_specialist: true
```

---

## Phase 2: Determine Agent Requirements

### Load Agent Mappings

Read `bootstrap/mappings/agent-mappings.yaml` to determine which agents to generate.

### Apply Mapping Rules

For each detected technology:
1. Look up technology identifier in agent-mappings.yaml
2. Check if mapping exists
3. Check condition (if specified)
4. Add to generation queue

**Example**:
```yaml
# Detection: vue detected
# Mapping lookup: agent-mappings.yaml → frontend_frameworks.vue
# Result: Generate vue specialist agent

detected: vue
mapping: frontend_frameworks.vue
  template: framework-specialist.template.md
  output: agents/specialists/vue.md
  variables:
    FRAMEWORK_NAME: "Vue.js"
    FRAMEWORK_ID: "vue"
    ...
  rules: [...]
  anti_patterns: [...]
```

### Coordinator Generation

Determine which coordinators to generate:

```javascript
coordinators_to_generate = []

if has_any_frontend_framework:
  coordinators_to_generate.push({
    id: 'fe-team-lead',
    mapping: coordinators.fe-team-lead,
    specialists: [list of detected frontend specialists]
  })

if has_any_backend_framework:
  coordinators_to_generate.push({
    id: 'be-team-lead',
    mapping: coordinators.be-team-lead,
    specialists: [list of detected backend specialists]
  })

// Security specialist (cross-cutting — attaches to whichever team lead exists)
// Only tools with triggers_security_specialist: true cause generation
has_security_tools = (detected.security || []).some(s => s.metadata.triggers_security_specialist)
if has_security_tools:
  security_mapping = security['security-specialist']
  // Assign to coordinator if present (prefer backend), otherwise safe fallback
  if has_any_backend_framework:
    security_mapping.variables.TEAM_LEAD = 'be-team-lead'
  elif has_any_frontend_framework:
    security_mapping.variables.TEAM_LEAD = 'fe-team-lead'
  else:
    security_mapping.variables.TEAM_LEAD = 'project-owner'
```

### Agent Generation Queue

Build the complete list of agents to generate:
```javascript
generation_queue = [
  ...coordinators_to_generate,
  ...specialists_from_mappings,
  ...universal_agents_if_missing
]
```

---

## Phase 3: Template Variable Substitution

### Load Templates

For each agent in the generation queue:
1. Read template file from `bootstrap/templates/agents/{template}`
2. Extract all variable placeholders `{{VARIABLE}}`
3. Load variables from mapping

### Substitution Rules

**Simple variables**:
```
Template: "# Agent: {{FRAMEWORK_NAME}}"
Variables: { FRAMEWORK_NAME: "Vue.js" }
Result: "# Agent: Vue.js"
```

**Conditional blocks**:
```markdown
{{#if HAS_STYLING}}
- Styling questions → {{STYLING_SPECIALIST}}
{{/if}}

# If HAS_STYLING is true and STYLING_SPECIALIST is "scss":
Result:
- Styling questions → scss
```

**Iterative blocks** (rules, anti-patterns):
```markdown
## Key Rules
{{#each RULES}}
- {{this}}
{{/each}}

# Given RULES array:
Result:
## Key Rules
- Use Composition API with `<script setup>`
- Use `ref()` for primitives, `reactive()` for objects
- Props should be defined with `defineProps()`
```

**Anti-pattern tables**:
```markdown
| I See | I Do | Severity |
|-------|------|----------|
{{#each ANTI_PATTERNS}}
| {{pattern}} | {{fix}} | {{severity}} |
{{/each}}

# Given ANTI_PATTERNS array:
Result:
| I See | I Do | Severity |
|-------|------|----------|
| Using Options API | Use Composition API | HIGH |
| Mutating props | Emit events to parent | CRITICAL |
```

### Template Syntax Reference

- `{{VARIABLE}}` - Simple substitution
- `{{#if CONDITION}}...{{/if}}` - Conditional rendering
- `{{#each ARRAY}}{{this}}{{/each}}` - Array iteration
- `{{#each ARRAY}}{{property}}{{/each}}` - Object array iteration

> **Note:** There is no external template engine (like Handlebars or Mustache). The `{{syntax}}` is pseudo-code that instructs Claude Code on what to replace when generating files. During `/atta`, Claude reads the template, performs the substitutions itself using the variables from mappings and detection, and writes the final output. The syntax is documentation for the AI, not executable code.

---

## Phase 4: Agent Generation

### For Each Agent in Queue

1. **Load template**:
   ```javascript
   template_content = read_file(`bootstrap/templates/agents/${mapping.template}`)
   ```

2. **Prepare variables**:
   ```javascript
   variables = {
     ...mapping.variables,  // From mapping file
     ...detected_metadata,  // From detection
     ...additional_context  // From project scan
   }
   ```

3. **Perform substitution**:
   ```javascript
   generated_content = substitute_variables(template_content, variables)
   ```

4. **Write agent file**:
   ```javascript
   write_file(mapping.output, generated_content)
   ```

5. **Update manifest**:
   ```javascript
   manifest.generated_files.push({
     file: mapping.output,
     template: mapping.template,
     technology: detected_tech,
     timestamp: now()
   })
   ```

### Pattern File Generation

For each agent that has `pattern_file` specified:
1. Check if rich pattern template exists: `bootstrap/templates/patterns/{tech}-patterns.template.md`
2. **If template exists**: load and substitute variables (full rich content)
3. **If template does NOT exist**: generate a basic pattern file from the agent mapping's `rules` and `anti_patterns` arrays — this ensures every detected technology gets a pattern file
4. Write to `knowledge/patterns/{pattern_file}`
5. Link agent to pattern file in Knowledge Base section

---

## Phase 5: INDEX.md Generation

### Load INDEX Template

Read `bootstrap/templates/agents/INDEX.template.md`

### Build Routing Table

For each generated agent:
1. Extract agent ID, aliases, role
2. Determine reporting structure (specialist → coordinator → project-owner)
3. Build routing rules based on agent metadata

**Example routing rule generation**:
```javascript
// Vue specialist generated
routing_rules.push({
  pattern: "Vue.js component / Composition API / reactivity",
  route: "fe-team-lead -> vue"
})

// PostgreSQL specialist generated
routing_rules.push({
  pattern: "PostgreSQL queries / schema / migrations",
  route: "be-team-lead -> postgresql"
})
```

### Generate Hierarchy Visualization

```javascript
hierarchy = `
Project Owner (orchestrator)
${has_frontend ? `
├── FE Team Lead (coordinator)
${frontend_specialists.map(s => `│   ├── ${s.id} (${s.role})`).join('\n')}
` : ''}
${has_backend ? `
├── BE Team Lead (coordinator)
${backend_specialists.map(s => `│   ├── ${s.id} (${s.role})`).join('\n')}
` : ''}
├── Code Reviewer (cross-domain)
├── QA Validator (qa)
├── Business Analyst (ba)
├── PR Manager (pr)
├── Rubber Duck (guided learning)
└── Librarian (knowledge keeper)
`
```

### Write INDEX.md

Substitute all variables in INDEX template and write to `agents/INDEX.md`

---

## Phase 6: MCP Configuration

### Load MCP Mappings

Read `bootstrap/mappings/mcp-mappings.yaml`

### Generate Recommendations

For each detected technology:
1. Check if MCP mapping exists
2. Check condition
3. Build recommendation object:
   ```javascript
   {
     server_type: "documentation",
     reason: "Vue.js detected - MCP can provide live API references",
     priority: "high",
     sources: ["https://vuejs.org/api/"],
     agents_with_access: ["vue", "typescript", "fe-team-lead"]
   }
   ```

### User Prompting (during /atta)

Present recommendations to user:
```
Based on your project, I recommend these MCP servers:

✨ HIGH PRIORITY:
  ☐ Documentation MCP
     Reason: Vue.js detected - provides live API references
     Access: vue, typescript, fe-team-lead agents

  ☐ Database MCP
     Reason: PostgreSQL detected - can inspect schemas and validate queries
     Access: postgresql, be-team-lead agents
     ⚠️  Requires database connection string (read-only recommended)
     ⚠️  Security: Use environment variables (e.g., $DATABASE_URL), never hardcode credentials

🔧 MEDIUM PRIORITY:
  ☐ Browser MCP
     Reason: Frontend project - can help with accessibility testing
     Access: accessibility, fe-team-lead agents

Would you like to configure any of these? (Select all that apply)
```

### Generate mcp-config.json

Based on user selections:
```json
{
  "version": "1.0",
  "last_updated": "2026-02-14T...",
  "servers": [
    {
      "id": "docs-mcp-vue",
      "name": "Vue.js Documentation MCP",
      "type": "documentation",
      "enabled": true,
      "access": ["vue", "typescript", "fe-team-lead"],
      "config": {
        "sources": [
          "https://vuejs.org/api/",
          "https://vueuse.org"
        ]
      }
    }
  ],
  "global_access": ["librarian", "project-owner"]
}
```

### Add MCP Sections to Generated Agents

For agents with MCP access, append to their generated content:
```markdown
## MCP Capabilities

This agent has access to the following MCP servers:

### Vue.js Documentation MCP
**Type**: documentation
**Purpose**: Live access to official Vue.js API references and VueUse composables

**Usage in this role:**
- Look up current best practices for Composition API
- Check latest API signatures for Vue 3 features
- Reference official examples for complex patterns
```

---

## Phase 7: Generated Manifest

### Create Manifest File

Write `.metadata/generated-manifest.json`:
```json
{
  "version": "2.0",
  "generated_at": "2026-02-14T10:30:00Z",
  "project_root": "/path/to/project",
  "detected_stack": {
    "frontend": ["vue", "typescript", "scss", "vite"],
    "backend": ["python", "django", "postgresql"],
    "testing": ["jest", "pytest"],
    "build_tools": ["vite"]
  },
  "generated_files": {
    "agents": [
      {
        "file": "agents/coordinators/fe-team-lead.md",
        "template": "fe-team-lead.template.md",
        "technology": "coordinator",
        "timestamp": "2026-02-14T10:30:05Z"
      },
      {
        "file": "agents/specialists/vue.md",
        "template": "framework-specialist.template.md",
        "technology": "vue",
        "timestamp": "2026-02-14T10:30:06Z"
      }
    ],
    "patterns": [
      "knowledge/patterns/vue-patterns.md",
      "knowledge/patterns/typescript-patterns.md",
      "knowledge/patterns/django-patterns.md"
    ],
    "skills": [],
    "config": [
      "knowledge/project/mcp-config.json",
      "agents/INDEX.md"
    ]
  },
  "mcp_servers_configured": ["docs-mcp-vue", "db-mcp-postgresql"]
}
```

### Update Version Tracking

Write `.metadata/last-init`:
```
2026-02-14T10:30:00Z
```

---

## Error Handling

### Missing Templates

If a template file is missing:
1. Log warning
2. Skip agent generation
3. Continue with other agents
4. Report skipped agents to user

### Invalid YAML

If detection or mapping YAML is invalid:
1. Log error with file name and line number
2. Fall back to manual configuration
3. Prompt user for missing information

### Variable Substitution Failures

If a required variable is missing:
1. Log warning with variable name
2. Use placeholder: `[MISSING: {VARIABLE_NAME}]`
3. Mark agent as incomplete in manifest
4. Report to user for manual fix

---

## Best Practices

### Template Variables

- Use UPPERCASE for variable names
- Use snake_case for multi-word variables: `FRAMEWORK_NAME`
- Prefix booleans with HAS_ or IS_: `HAS_STYLING`, `IS_ASYNC`
- Use arrays for iterative content: `RULES`, `ANTI_PATTERNS`

### Conditional Logic

- Keep conditions simple
- Prefer existence checks over complex boolean logic
- Default to safe fallback if condition unclear

### File Organization

- Coordinators in `agents/coordinators/`
- Specialists in `agents/specialists/`
- Patterns in `knowledge/patterns/`
- Generated skills in `skills/generated/`
- Never modify core agents at `agents/` root (universal agents)

---

## Usage in /atta Skill

The `/atta` skill should:

1. **Phase 1 - Detection**:
   ```javascript
   detected = run_detection_from_yaml_files()
   ```

2. **Phase 2 - Mapping**:
   ```javascript
   agents_to_generate = load_mappings_and_determine_agents(detected)
   ```

3. **Phase 3 - User Confirmation**:
   ```javascript
   confirmed = present_detection_results_to_user(detected, agents_to_generate)
   ```

4. **Phase 4 - Generation**:
   ```javascript
   for each agent in agents_to_generate:
     generated_agent = load_template_and_substitute_variables(agent)
     write_file(agent.output, generated_agent)
   ```

5. **Phase 5 - INDEX Generation**:
   ```javascript
   index_content = generate_index_from_template(agents_to_generate)
   write_file('agents/INDEX.md', index_content)
   ```

6. **Phase 6 - MCP Configuration**:
   ```javascript
   mcp_recommendations = generate_mcp_recommendations(detected)
   user_selections = prompt_user_for_mcp_choices(mcp_recommendations)
   mcp_config = generate_mcp_config(user_selections)
   write_file('knowledge/project/mcp-config.json', mcp_config)
   ```

7. **Phase 7 - Manifest**:
   ```javascript
   manifest = build_manifest(agents_to_generate, detected, mcp_config)
   write_file('.metadata/generated-manifest.json', manifest)
   ```

8. **Phase 8 - Report**:
   ```javascript
   display_completion_report(manifest)
   ```

---

## Extension Points

### Adding New Tech Stack Support

1. Add detection rules to appropriate YAML file in `bootstrap/detection/`
2. Create or reuse template in `bootstrap/templates/agents/`
3. Add mapping in `bootstrap/mappings/agent-mappings.yaml`
4. Add MCP recommendations in `bootstrap/mappings/mcp-mappings.yaml`
5. Run `/atta` - new tech stack is now supported!

### Custom Templates

Users can create custom templates in `bootstrap/templates/agents/custom/` and reference them in custom mapping files.

---

This generator logic enables the `.claude/` bootstrap system to adapt to ANY project while maintaining the sophisticated agent hierarchy and routing that makes the system effective.
