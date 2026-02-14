# .metadata Directory

This directory contains system metadata for the adaptive bootstrap system.

## Files

### `version`
Contains the current version of the `.claude/` bootstrap system.
- **Current version**: 2.0
- **Used by**: `/init` and `/migrate` skills for version detection

### `last-init` (generated)
Timestamp of the last `/init` execution.
- **Format**: ISO 8601 timestamp
- **Example**: `2026-02-14T10:30:00Z`
- **Used by**: `/init --rescan` to determine if re-scan is needed

### `generated-manifest.json` (generated)
Complete manifest of all generated files from the bootstrap system.
- **Purpose**: Track which files were auto-generated
- **Used by**: `/init --rescan` and `/migrate` for cleanup and updates
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

## Version History

- **2.0**: Adaptive bootstrap system with dynamic agent generation
- **3.0**: Static agent system (Vue/AEM focused)
