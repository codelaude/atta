---
name: init
description: Interactive project setup with dynamic agent generation. Detects tech stack, generates specialized agents, creates pattern files, and configures MCP servers based on your project's needs.
---

You are now running **project initialization** — an interactive setup that uses the adaptive bootstrap system to configure agents tailored to your project.

## How to Use

```
/init                    # Full interactive setup
/init --rescan           # Re-detect tech stack and regenerate (skip questions)
```

---

## What This Skill Does (Bootstrap v2.0)

1. **Ask** key questions about your project
2. **Detect** tech stack from config files using bootstrap detection rules
3. **Generate** specialized agents dynamically from templates
4. **Configure** MCP servers based on detected stack
5. **Create** pattern files with best practices
6. **Generate** routing table (INDEX.md)
7. **Report** what was created

**NEW in v2.0:** Agents are now generated dynamically! This system adapts to ANY tech stack.

---

## Bootstrap System Integration

Before starting, note that this skill uses:
- **Detection rules**: `.claude/bootstrap/detection/*.yaml` (100+ tech detectors)
- **Agent templates**: `.claude/bootstrap/templates/agents/*.template.md` (8 templates)
- **Pattern templates**: `.claude/bootstrap/templates/patterns/*.template.md`
- **Mappings**: `.claude/bootstrap/mappings/*.yaml` (tech → templates)
- **Generator logic**: `.claude/bootstrap/generator.md` (how to generate)

Read these files to understand detection and generation logic.

---

## Phase 1: User Interview

Ask questions using AskUserQuestion. Group related questions (max 4 per call).

### Round 1: Project Basics

Use AskUserQuestion with these 3 questions:

**Question 1 — Project root**
> "Is the current directory the project root, or is the source code in a subdirectory?"
- Options: "Current directory is root", "Source is in a subdirectory", "This is a monorepo"
- header: "Project root"

**Question 2 — Project scope**
> "What does this project include?"
- Options: "Frontend only", "Frontend + Backend", "Backend only", "Full-stack monorepo"
- header: "Project scope"

**Question 3 — Your role**
> "What's your primary role on this project?"
- Options: "Frontend developer", "Backend developer", "Full-stack developer", "Tech lead"
- header: "Your role"

### Round 2: Commands & Paths

Based on Round 1 answers, ask conditionally:

**If subdirectory or monorepo:**
> "Where should build commands be run from? (relative to project root)"
- Free text input

**If Frontend + Backend or Backend only:**
> "What backend technology does this project use?"
- Options: "Python (Django/Flask/FastAPI)", "Java (Spring Boot/Maven/Gradle)", "Node.js (Express/Fastify/NestJS)", "Go (Gin/Fiber/Echo)", "Rust", "Ruby (Rails)", "Other"

**If Frontend + Backend:**
> "Where is the backend code relative to project root?"
- Free text input

### Round 3: Workflow Preferences

**Question — Git workflow**
> "What's your branching strategy?"
- Options: "Feature branches off main", "Feature branches off develop", "Trunk-based (main only)", "Other"

**Question — Package manager** (if Node.js project)
> "How do you run commands?"
- Options: "npm", "yarn", "pnpm", "bun"

### Round 4: MCP Configuration (NEW in v2.0)

After detecting the tech stack (Phase 2), ask about MCP servers:

> "Model Context Protocol (MCP) servers can extend agent capabilities. Based on your project, I recommend:"

Build recommendations by reading `.claude/bootstrap/mappings/mcp-mappings.yaml` and checking detected stack.

Present up to 3 high-priority recommendations:

```markdown
**Recommended MCP Servers:**

✨ **Documentation MCP** (High Priority)
   - Why: [Framework] detected - provides live API references
   - Access: [framework specialist], [language specialist], [team lead]
   - Setup: Automatic (configure sources based on detected frameworks)

💾 **Database MCP** (High Priority)
   - Why: [Database] detected - can inspect schemas and validate queries
   - Access: [database specialist], be-team-lead
   - ⚠️  Requires: Database connection string (read-only mode)
   - Security: Read-only access, no data modifications

🌐 **Browser MCP** (Medium Priority)
   - Why: Frontend project - helps with E2E testing and accessibility validation
   - Access: accessibility, tester, fe-team-lead

Would you like to configure MCP servers?
```

Use AskUserQuestion with multiSelect enabled:
- Documentation MCP
- Database MCP
- Browser MCP
- Filesystem MCP (if monorepo)
- None - skip MCP configuration

For each selected MCP, gather required config (connection strings, etc.)

---

## Phase 2: Auto-Detection

**Read bootstrap detection files** to understand what to detect:
- `.claude/bootstrap/detection/frontend-detectors.yaml`
- `.claude/bootstrap/detection/backend-detectors.yaml`
- `.claude/bootstrap/detection/database-detectors.yaml`
- `.claude/bootstrap/detection/tool-detectors.yaml`

Scan the project following the detection rules.

### Detection Strategy

1. **Read package.json** (if exists):
   - Check dependencies and devDependencies against detection rules
   - Extract versions for detected packages
   - Note scripts (test, build, lint commands)

2. **Scan for config files**:
   - Look for framework configs (vite.config, tsconfig.json, etc.)
   - Look for backend configs (pom.xml, go.mod, requirements.txt, etc.)
   - Look for database indicators

3. **Check file patterns**:
   - Search for *.ts, *.tsx → TypeScript
   - Search for *.py → Python
   - Search for *.java → Java
   - Search for *.go → Go
   - Etc.

4. **Sample source files** (up to 10):
   - Detect naming conventions
   - Detect component patterns (Composition API vs Options API, hooks vs class, etc.)
   - Detect import patterns
   - Detect styling approach

### Build Detection Manifest

Create a structured detection result:

```javascript
{
  "frontend": {
    "framework": { "name": "Vue.js", "id": "vue", "version": "3.2.0" },
    "language": { "name": "TypeScript", "id": "typescript", "version": "5.3.3" },
    "styling": { "name": "SCSS", "id": "scss" },
    "testing": { "name": "Jest", "id": "jest" },
    "build_tool": { "name": "Vite", "id": "vite" }
  },
  "backend": {
    "language": { "name": "Python", "id": "python", "version": "3.11" },
    "framework": { "name": "Django", "id": "django", "version": "5.0" },
    "database": { "name": "PostgreSQL", "id": "postgresql" }
  },
  "detected_stack": ["vue", "typescript", "scss", "jest", "python", "django", "postgresql"]
}
```

---

## Phase 3: Reconcile & Confirm

Present detection results to user for confirmation:

```markdown
## 🔍 Detected Configuration

**Project root**: [path]
**Bootstrap system**: v2.0 (adaptive agent generation)

### Frontend Stack
{{#if HAS_FRONTEND}}
- **Framework**: {{FRONTEND_FRAMEWORK}} {{VERSION}}
- **Language**: {{LANGUAGE}}
- **Styling**: {{STYLING}}
- **Testing**: {{TESTING_FRAMEWORK}}
- **Build**: {{BUILD_TOOL}}
{{#if STATE_MANAGEMENT}}
- **State**: {{STATE_MANAGEMENT}}
{{/if}}
{{else}}
No frontend framework detected
{{/if}}

### Backend Stack
{{#if HAS_BACKEND}}
- **Language**: {{BACKEND_LANGUAGE}} {{VERSION}}
- **Framework**: {{BACKEND_FRAMEWORK}}
- **Database**: {{DATABASE}}
- **ORM**: {{ORM}} (if detected)
{{else}}
No backend framework detected
{{/if}}

### Agents to Generate

**Core agents** (always present):
- project-owner, librarian, rubber-duck, code-reviewer, business-analyst, qa-validator, pr-manager

{{#if HAS_FRONTEND}}
**Frontend team**:
- fe-team-lead (coordinator)
- {{FRONTEND_FRAMEWORK}} specialist (from template)
{{#if HAS_LANGUAGE}}
- {{LANGUAGE}} specialist
{{/if}}
{{#if HAS_STYLING}}
- {{STYLING}} specialist
{{/if}}
- accessibility specialist
{{#if HAS_TESTING}}
- {{TESTING_FRAMEWORK}} specialist
{{/if}}
{{/if}}

{{#if HAS_BACKEND}}
**Backend team**:
- be-team-lead (coordinator)
- {{BACKEND_LANGUAGE}} specialist
- {{BACKEND_FRAMEWORK}} specialist
{{#if HAS_DATABASE}}
- {{DATABASE}} specialist
{{/if}}
{{/if}}

### MCP Servers
{{#if MCP_SELECTED}}
{{#each MCP_SERVERS}}
- {{name}}: {{status}}
{{/each}}
{{else}}
None configured (can add later)
{{/if}}

**Total agents to generate**: {{AGENT_COUNT}}

Does this look correct? Any adjustments needed?
```

Wait for user confirmation. If user wants changes, loop back to questions.

---

## Phase 4: Generate Agents (NEW - Bootstrap System)

Now use the bootstrap system to generate agents dynamically!

### Step 1: Load Agent Mappings

Read `.claude/bootstrap/mappings/agent-mappings.yaml` to determine which agents to generate based on detected stack.

For each detected technology, find its mapping:
```yaml
# Example: Vue detected
vue:
  template: framework-specialist.template.md
  output: agents/specialists/vue.md
  variables:
    FRAMEWORK_NAME: "Vue.js"
    FRAMEWORK_ID: "vue"
    ...
  rules: [...]
  anti_patterns: [...]
```

### Step 2: Generate Coordinators

**If has_frontend:**
1. Read template: `.claude/bootstrap/templates/agents/fe-team-lead.template.md`
2. Substitute variables:
   - FRONTEND_FRAMEWORK
   - FRONTEND_SPECIALISTS (list of detected frontend agents)
   - PATTERN_FILES (list of pattern files to reference)
   - MCP_SERVERS (if configured)
3. Write to: `.claude/agents/coordinators/fe-team-lead.md`

**If has_backend:**
1. Read template: `.claude/bootstrap/templates/agents/be-team-lead.template.md`
2. Substitute variables:
   - BACKEND_LANGUAGE
   - BACKEND_FRAMEWORK
   - BACKEND_SPECIALISTS
   - DATABASE
   - MCP_SERVERS
3. Write to: `.claude/agents/coordinators/be-team-lead.md`

### Step 3: Generate Specialists

For each detected technology in the stack:

1. **Load template** based on mapping:
   - Framework → `framework-specialist.template.md`
   - Language → `language-specialist.template.md`
   - Database → `database-specialist.template.md`
   - etc.

2. **Prepare variables** from mapping + detection:
   ```javascript
   {
     FRAMEWORK_NAME: "Vue.js",
     FRAMEWORK_ID: "vue",
     FRAMEWORK_VERSION: "3.2.0",
     TEAM_LEAD: "fe-team-lead",
     RULES: [...rules from mapping...],
     ANTI_PATTERNS: [...anti-patterns from mapping...],
     DOCUMENTATION_URLS: ["https://vuejs.org/api/"],
     HAS_MCP_ACCESS: user_configured_doc_mcp,
     MCP_SERVERS: [...]
   }
   ```

3. **Perform template substitution**:
   - Replace `{{VARIABLE}}` with values
   - Process `{{#if CONDITION}}...{{/if}}`
   - Process `{{#each ARRAY}}...{{/each}}`
   - Build anti-pattern tables
   - Build delegation sections

4. **Write generated agent**:
   - Output path from mapping (e.g., `agents/specialists/vue.md`)
   - Add header comment: `<!-- Auto-generated by /init v2.0 -->`

5. **Track in manifest**:
   - Add to `.metadata/generated-manifest.json`

### Step 4: Generate Pattern Files

For each detected technology with a pattern template:

1. Check if pattern template exists:
   - `.claude/bootstrap/templates/patterns/python-patterns.template.md`
   - `.claude/bootstrap/templates/patterns/django-patterns.template.md`
   - etc.

2. Load template and substitute variables:
   - PROJECT_NAME
   - VERSION
   - GENERATED_DATE
   - Conditional sections based on detection

3. Write to `.claude/knowledge/patterns/{tech}-patterns.md`

4. Track in manifest

---

## Phase 5: Generate INDEX.md (NEW)

Dynamically generate the routing table based on generated agents.

### Build Agent Registry Table

```markdown
| Agent | ID | Aliases | Role | Reports To |
|-------|-----|---------|------|------------|
| Project Owner | `project-owner` | `orchestrator` | Routes tasks | User |
{{#if HAS_FRONTEND}}
| FE Team Lead | `fe-team-lead` | `lead` | FE Coordinator | Project Owner |
{{#each FRONTEND_SPECIALISTS}}
| {{name}} | `{{id}}` | - | {{role}} | FE Team Lead |
{{/each}}
{{/if}}
{{#if HAS_BACKEND}}
| BE Team Lead | `be-team-lead` | - | BE Coordinator | Project Owner |
{{#each BACKEND_SPECIALISTS}}
| {{name}} | `{{id}}` | - | {{role}} | BE Team Lead |
{{/each}}
{{/if}}
| Code Reviewer | `code-reviewer` | `reviewer` | Quality review | Team Leads |
| ... | ... | ... | ... | ... |
```

### Build Hierarchy Visualization

```
Project Owner (orchestrator)
{{#if HAS_FRONTEND}}
├── FE Team Lead (coordinator)
{{#each FRONTEND_SPECIALISTS}}
│   ├── {{id}} ({{role}})
{{/each}}
{{/if}}
{{#if HAS_BACKEND}}
├── BE Team Lead (coordinator)
{{#each BACKEND_SPECIALISTS}}
│   ├── {{id}} ({{role}})
{{/each}}
{{/if}}
├── Code Reviewer (cross-domain)
├── QA Validator (qa)
├── Business Analyst (ba)
├── PR Manager (pr)
├── Rubber Duck (guided learning)
└── Librarian (knowledge keeper)
```

### Build Routing Rules

Auto-generate routing based on specialists:

```markdown
| Task Pattern | Route To |
|-------------|----------|
{{#if HAS_FRONTEND}}
| New {{FRAMEWORK}} component | fe-team-lead → {{FRAMEWORK}} |
| Styling / {{STYLING}} | fe-team-lead → {{STYLING}} |
| Accessibility / WCAG | fe-team-lead → accessibility |
{{/if}}
{{#if HAS_BACKEND}}
| {{BACKEND_FRAMEWORK}} API endpoint | be-team-lead → {{BACKEND_FRAMEWORK}} |
| {{DATABASE}} query / schema | be-team-lead → {{DATABASE}} |
{{/if}}
| Code review | code-reviewer |
| Requirements | business-analyst |
| "Remember to..." | librarian |
```

### Write INDEX.md

Write to `.claude/agents/INDEX.md` with:
- Auto-generated header comment
- Registry table
- Hierarchy
- Routing rules
- Timestamp

---

## Phase 6: Configure MCP Servers (NEW)

If user selected MCP servers, generate configuration:

### Write MCP Config

File: `.claude/knowledge/project/mcp-config.json`

```json
{
  "version": "1.0",
  "generated_at": "{{TIMESTAMP}}",
  "servers": [
    {{#if HAS_DOCUMENTATION_MCP}}
    {
      "id": "docs-mcp",
      "name": "Documentation MCP",
      "type": "documentation",
      "enabled": true,
      "access": [{{SPECIALIST_IDS_WITH_ACCESS}}],
      "config": {
        "sources": [
          {{#each DOCUMENTATION_SOURCES}}
          "{{this}}"
          {{/each}}
        ]
      }
    },
    {{/if}}
    {{#if HAS_DATABASE_MCP}}
    {
      "id": "db-mcp",
      "name": "Database MCP",
      "type": "database",
      "enabled": true,
      "access": ["{{DATABASE_SPECIALIST}}", "be-team-lead"],
      "config": {
        "connection": "{{DATABASE_CONNECTION_STRING}}",
        "readonly": true
      }
    },
    {{/if}}
  ],
  "global_access": ["librarian", "project-owner"]
}
```

### Add MCP Sections to Generated Agents

For agents with MCP access, ensure their generated content includes:

```markdown
## MCP Capabilities

This agent has access to:
- **{{MCP_NAME}}**: {{DESCRIPTION}}

Use for:
- {{USE_CASE_1}}
- {{USE_CASE_2}}
```

---

## Phase 7: Generate Manifest (NEW)

Create tracking manifest for all generated files.

File: `.claude/.metadata/generated-manifest.json`

```json
{
  "version": "2.0",
  "generated_at": "{{TIMESTAMP}}",
  "project_root": "{{PROJECT_ROOT}}",
  "detected_stack": ["vue", "typescript", "scss", "python", "django", "postgresql"],
  "generated_files": {
    "agents": [
      {
        "file": "agents/coordinators/fe-team-lead.md",
        "template": "fe-team-lead.template.md",
        "technology": "coordinator",
        "timestamp": "{{TIMESTAMP}}"
      },
      {
        "file": "agents/specialists/vue.md",
        "template": "framework-specialist.template.md",
        "technology": "vue",
        "version": "3.2.0",
        "timestamp": "{{TIMESTAMP}}"
      },
      ...
    ],
    "patterns": [
      "knowledge/patterns/vue-patterns.md",
      "knowledge/patterns/python-patterns.md",
      ...
    ],
    "config": [
      "knowledge/project/project-context.md",
      "knowledge/project/mcp-config.json",
      "agents/INDEX.md"
    ]
  },
  "mcp_servers_configured": ["docs-mcp", "db-mcp"]
}
```

Update `.metadata/last-init` with current timestamp.

---

## Phase 8: Report

```markdown
## ✅ Initialization Complete

### 🎉 Bootstrap System v2.0

Your project now has a **dynamically generated agent team** tailored to your tech stack!

### Files Created/Updated

**Configuration:**
- `.claude/knowledge/project/project-context.md`
{{#if HAS_MCP}}
- `.claude/knowledge/project/mcp-config.json`
{{/if}}
- `.claude/agents/INDEX.md` (dynamic routing)
- `.claude/.metadata/generated-manifest.json`

**Pattern Files** ({{PATTERN_COUNT}}):
{{#each PATTERN_FILES}}
- `.claude/knowledge/patterns/{{this}}`
{{/each}}

**Generated Agents** ({{AGENT_COUNT}}):

**Coordinators:**
{{#each COORDINATORS}}
- `.claude/agents/coordinators/{{this}}.md`
{{/each}}

**Specialists:**
{{#each SPECIALISTS}}
- `.claude/agents/specialists/{{this}}.md`
{{/each}}

{{#if HAS_MCP}}
### 🔌 MCP Servers Configured

{{#each MCP_SERVERS}}
- **{{name}}**: {{status}}
  - Access: {{agents}}
{{/each}}
{{/if}}

### 🤖 Active Agent Hierarchy

\```
{{HIERARCHY_VISUALIZATION}}
\```

### 🚀 Quick Start

- `/agent {{PRIMARY_COORDINATOR}}` — Decompose a task
- `/agent {{PRIMARY_SPECIALIST}}` — Get framework-specific guidance
- `/agent rubber-duck` — Guided learning mode
- `/review` — Multi-agent code review
- `/preflight` — Full pre-PR validation

### 📝 Next Steps

- **Add patterns**: Use `/agent librarian` to capture project-specific rules
- **Update stack**: Run `/init --rescan` when dependencies change
- **Customize agents**: Edit generated agents in `agents/specialists/` (preserved on rescan)
- **Add specialists**: Manually add to `agents/specialists/` for custom domains

---

**Bootstrap System**: Detected {{TECH_COUNT}} technologies, generated {{AGENT_COUNT}} agents from {{TEMPLATE_COUNT}} templates.

_Your `.claude/` system is now adaptive! It will regenerate specialists as your tech stack evolves._
```

---

## Rescan Mode (`--rescan`)

When `--rescan` is used:

1. **Skip user interview** - Read previous answers from `project-context.md` and `mcp-config.json`
2. **Re-run detection** - Scan project files again
3. **Compare with manifest** - Check what was previously generated
4. **Regenerate changed** - If new tech detected, generate new specialists
5. **Preserve custom edits** - Don't overwrite manually edited sections (check for custom markers)
6. **Update INDEX.md** - Regenerate routing with new specialists
7. **Report changes** - Show what was added/updated/removed

---

## Related Skills

- `/agent librarian` — Capture project-specific patterns and directives
- `/agent {{team-lead}}` — Decompose tasks using generated specialists
- `/review` — Multi-agent code review with generated specialists
- `/preflight` — Full pre-PR validation

---

## Troubleshooting

**If generation fails:**
1. Check `.claude/bootstrap/` files exist
2. Verify detection rules in YAML files
3. Check template syntax in `.template.md` files
4. Review manifest for errors: `.metadata/generated-manifest.json`

**To regenerate single agent:**
Run `/init --rescan` - it will detect and regenerate as needed

**To start fresh:**
Delete `.metadata/generated-manifest.json` and run `/init`

---

_Bootstrap System v2.0 - Adaptive agent generation for any tech stack_
