# MCP (Model Context Protocol) Setup Guide

MCP servers provide external context to AI assistants, enabling them to access live documentation, databases, browsers, and more.

## How the Bootstrap System Handles MCPs

The bootstrap system automates MCP configuration during `/init`:

1. **Detects your needs** during `/init` interview
2. **Checks Node.js version** (MCP servers require Node.js 18+)
3. **Recommends servers** based on detected stack
4. **Generates config**: `.claude/knowledge/project/mcp-config.json` with proper paths for nvm users
5. **Updates agents**: Adds "MCP Capabilities" sections to relevant specialists

## Recommended MCP Servers

### Context7 (Recommended for All Projects)
**What it does:** Provides up-to-date, version-specific documentation for your detected frameworks and libraries.

**Why use it:** No more outdated API references — Context7 fetches the latest docs for your exact framework versions.

- GitHub: https://github.com/upstash/context7
- Requires API key (free tier available): https://console.upstash.com/context7
- Works with: All agents
- Setup: `npx -y @upstash/context7-mcp`

### Database MCP (High Priority if Database Detected)
**What it does:** Direct schema browsing and query assistance.

**Why use it:** Inspects table schemas, validates queries, checks indexes without leaving the AI session.

- Works with: Database specialists, BE Team Lead
- Setup: `npx -y @modelcontextprotocol/server-postgres` (or mysql, mongodb, etc.)

### Browser MCP (Medium Priority for Frontend Projects)
**What it does:** Accessibility testing, DOM inspection, visual regression testing.

**Why use it:** Validate accessibility in a live browser environment.

- Works with: accessibility specialist, FE Team Lead, tester
- Use cases: Keyboard navigation testing, screen reader compatibility, color contrast checks

### Serena (Optional - Code Intelligence)
**What it does:** Semantic code understanding via language server (30+ languages).

**Why use it:** IDE-like code intelligence (go to definition, find references, symbol search).

- GitHub: https://github.com/oraios/serena
- Works with: code-reviewer, team leads
- **Note:** Most valuable for Cursor/Claude Desktop users. Claude Code has built-in code navigation, so Serena adds incremental (not essential) value.
- Setup: `uvx serena --workspace .`

## Configuration Example

**For nvm users:**
```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "/Users/username/.nvm/versions/node/v22.22.0/bin/npx",
      // For production, pin version: ["-y", "@upstash/context7-mcp@1.2.3"]
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "PATH": "/Users/username/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    },
    "postgres": {
      "type": "stdio",
      "command": "/Users/username/.nvm/versions/node/v22.22.0/bin/npx",
      // For production, pin version: ["-y", "@modelcontextprotocol/server-postgres@2.1.0"]
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "PATH": "/Users/username/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
        "POSTGRES_CONNECTION": "${DATABASE_URL}"
      }
    }
  }
}
```

**For non-nvm users (global Node 18+):**
```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

## Security Best Practices

> **Important Security Notes:**

### Credentials
- **Never hardcode credentials** in `mcp-config.json`
- Always use environment variable references (e.g., `${DATABASE_URL}`, `${CONTEXT7_API_KEY}`)
- Add `mcp-config.json` to `.gitignore` if it contains secrets
- Use read-only database connections where possible

### Package Integrity
- The examples use `npx -y` which automatically fetches the latest package version
- **For production use**, pin to specific versions to reduce supply-chain risks:
  ```json
  "args": ["-y", "@upstash/context7-mcp@1.2.3"]
  ```
- Consider verifying package integrity or vendoring packages locally for sensitive environments

### Node.js Requirements
- **Node.js 18+** required for all MCP servers
- **nvm users:** Must use full path to `npx` and include `PATH` in `env` (see example above)
- Using just `"npx"` will use system default Node, which may be outdated
- **Key principle:** MCP servers run as separate processes with their own Node version — they don't affect your project's Node version (a Node 14 project can have MCPs running on Node 22)

## Troubleshooting

### "Event is not defined" error
- You're using an outdated Node version
- MCPs need Node 18+
- If using nvm: use full path to npx from Node 18+ installation

### Context7 authentication errors
- Get free API key from https://console.upstash.com/context7
- Set as environment variable: `export CONTEXT7_API_KEY=your-key`
- Reference in config as `${CONTEXT7_API_KEY}`

### Database connection fails
- Use environment variables for connection strings
- Ensure credentials have appropriate permissions (read-only recommended)
- Check firewall/network access to database

## See Also

- [Bootstrap System](bootstrap-system.md) - How automatic detection works
- [Main README](../../README.md) - Quick start guide
- [Official MCP Documentation](https://modelcontextprotocol.io)
