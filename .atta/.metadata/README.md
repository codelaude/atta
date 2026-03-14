# .metadata Directory

This directory contains system metadata for the adaptive bootstrap system.

## Files

### `version`
Contains the current user's version of the `.claude/` system.
- **Current version**: 2.7.1
- **Used by**: `/atta` and `/migrate` skills for version detection
- **Note**: This is the user's version, which may have customizations

### `framework-version` (introduced in v2.1)
Contains the framework version that was last applied.
- **Current version**: 2.7.1
- **Used by**: `/update` skill to check for framework updates
- **Note**: This is separate from user version to track framework updates independently

### `last-init` (generated)
Timestamp of the last `/atta` execution.
- **Format**: ISO 8601 timestamp
- **Example**: `2026-02-14T10:30:00Z`
- **Used by**: `/atta --rescan` to determine if re-scan is needed

### `generated-manifest.json` (generated)
Complete manifest of all generated files from the bootstrap system.
- **Purpose**: Track which files were auto-generated
- **Used by**: `/atta --rescan` and `/migrate` for cleanup and updates
- **Structure**:
  ```json
  {
    "version": "2.0",
    "generated_at": "timestamp",
    "detected_stack": {},
    "generated_files": {
      "agents": [],
      "patterns": [],
      "skills": [],
      "config": []
    },
    "mcp_servers_configured": []
  }
  ```

### `file-manifest.json` (introduced in v2.1)
Tracks all files in `.claude/` and `.atta/` and their source (framework/generated/user).
- **Purpose**: Enable safe framework updates that preserve customizations
- **Used by**: `/atta-update` skill to classify files and detect customizations
- **Created by**: `/atta` on new projects, `/atta-migrate` on existing projects
- **Structure**:
  ```json
  {
    "framework_version": "2.0",
    "user_version": "2.0",
    "manifest_created": "timestamp",
    "last_update": "timestamp",
    "files": {
      "bootstrap/": {
        "source": "framework",
        "customized": false,
        "safe_to_replace": true
      },
      "agents/project-owner.md": {
        "source": "framework",
        "customized": false,
        "requires_merge": false,
        "customizations": {}
      },
      "agents/coordinators/fe-team-lead.md": {
        "source": "generated",
        "regenerate_on_init": true
      },
      "project/project-context.md": {
        "source": "user",
        "protected": true,
        "never_touch": true
      }
    },
    "classification": {
      "tier_1_safe_replace": [],
      "tier_2_merge_required": [],
      "tier_3_never_touch": [],
      "generated_optional": []
    }
  }
  ```

### `update-history.json` (introduced in v2.1)
Records history of all framework updates applied.
- **Purpose**: Track update history and provide rollback information
- **Used by**: `/update` skill to log updates and `/update --history` to display
- **Structure**:
  ```json
  {
    "updates": [
      {
        "from": "2.0",
        "to": "2.1",
        "timestamp": "2026-02-16T14:30:00Z",
        "files_updated": 23,
        "files_merged": 2,
        "files_preserved": 14,
        "backup_location": ".claude-backup-update-v2.0-to-v2.1-20260216-143000",
        "notes": "Update system with file tracking and smart merge"
      }
    ]
  }
  ```

### `file-manifest.template.json`
Template for the file-manifest.json structure.
- **Purpose**: Reference for creating new file manifests
- **Not used at runtime**: This is documentation only

## Version History

- **2.7.1**: Multi-Tool Plugin Distribution + Review Guidance + Format Alignment — review guidance extraction (8 formatters × 6 adapters), plugin generator for 4 marketplace targets, cross-tool hook event mapping, SKILL.md frontmatter flags, agent YAML frontmatter with adapter transforms, preflight static analysis step, cross-reviewed by Codex + Copilot
- **2.7.0** (2026-03-03): .atta/ Architecture + Developer Profile + Cursor Adapter — tool-agnostic shared content architecture, dual-root adapters, `/profile` skill (two-layer propagation), `/optimize` skill (cross-tool context enrichment), architectural pattern extraction, staleness detection, `/preflight --auto-fix` iterative fix loop, Cursor adapter (5th adapter), CI review adapter (6th adapter), ~70 path migrations, migration detection
- **2.6.1**: Preflight Gap Closure — security deduplication, performance + bug/logic review dimensions, OWASP expansion, dev publish skill
- **2.6.0**: Enhanced Testing — PR template detection in `/atta`, E2E testing detection (5 frameworks), E2E specialist agent + patterns, `/test` skill with `--e2e`/`--coverage`/`--watch`
- **2.5.4**: Pre-v2.6 Cleanup — code deduplication, script performance, `/ship` skill, PR workflow refactor, docs refresh, pre-publish fixes
- **2.5.3**: Context Diet Pass 2 + Session Tracking Hooks — hook-based session tracking (replaced ~1,000 lines of in-skill boilerplate), compressed remaining skills (~880 lines), triaged v2.5.1 open items
- **2.5.2**: Context Diet — reduced SKILL.md and agent definition context footprint by ~55%, removed legacy agents, cross-AI reviewed
- **2.5.1**: OSS readiness audit — security hardening, community files, npm packaging
- **2.5.0** (2026-02-23): Pattern detection system (8 tracks) — correction logging, aggregation, `/patterns` skill (7 subcommands), agent adaptation with acceptance rates, learning dashboard with trends and recommendations, schema v1.1.0
- **2.4.3**: npm distribution (`npx atta-dev init`), cross-tool adapters (Claude Code, Copilot, Codex, Gemini), capability matrix, automated check suite
- **2.4.2**: Renamed `/init` → `/atta`, removed cosmetic version numbers from footers/headers
- **2.4.1**: Session tracking expanded to all skills, hardening fixes
- **2.4** (2026-02-19): Multi-agent `/collaborate` skill (parallel 2-4 agent collaboration)
- **2.3** (2026-02-17): Security sprint (`/security-audit`, security specialist template, security detection rules)
- **2.2** (2026-02-17): Tutorial skill, session tracking infrastructure, error handling, recent work context
- **2.1** (2026-02-16): Update system with file tracking and smart merge
- **2.0** (2026-02-14): Adaptive bootstrap system with dynamic agent generation
- **1.0**: Static agent system (Vue/AEM focused, legacy)
