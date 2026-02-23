# .metadata Directory

This directory contains system metadata for the adaptive bootstrap system.

## Files

### `version`
Contains the current user's version of the `.claude/` system.
- **Current version**: 2.5.1
- **Used by**: `/atta` and `/migrate` skills for version detection
- **Note**: This is the user's version, which may have customizations

### `framework-version` (introduced in v2.1)
Contains the framework version that was last applied.
- **Current version**: 2.5
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
Tracks all files in `.claude/` and their source (framework/generated/user).
- **Purpose**: Enable safe framework updates that preserve customizations
- **Used by**: `/update` skill to classify files and detect customizations
- **Created by**: `/atta` on new projects, `/migrate --add-update-system` on existing v2.0 projects
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
      "knowledge/project/project-context.md": {
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

- **2.5.0** (2026-02-23): Pattern detection system (8 tracks) — correction logging, aggregation, `/patterns` skill (7 subcommands), agent adaptation with acceptance rates, learning dashboard with trends and recommendations, schema v1.1.0
- **2.4.3** (2026-02-22): npm distribution (`npx atta-dev init`), cross-tool adapters (Claude Code, Copilot, Codex, Gemini), capability matrix, automated check suite
- **2.4.2** (2026-02-22): Renamed `/init` → `/atta`, removed cosmetic version numbers from footers/headers
- **2.4.1** (2026-02-20): Session tracking expanded to all skills, hardening fixes
- **2.4** (2026-02-19): Multi-agent `/collaborate` skill (parallel 2-4 agent collaboration)
- **2.3** (2026-02-17): Security sprint (`/security-audit`, security specialist template, security detection rules)
- **2.2** (2026-02-17): Tutorial skill, session tracking infrastructure, error handling, recent work context
- **2.1** (2026-02-16): Update system with file tracking and smart merge
- **2.0** (2026-02-14): Adaptive bootstrap system with dynamic agent generation
- **1.0**: Static agent system (Vue/AEM focused, legacy)
