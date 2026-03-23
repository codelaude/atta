# Atta — Quick Reference

### Getting Started
| Command | What it does |
|---------|-------------|
| `/atta` | Set up agents for your project (run once) |
| `/atta-profile` | Set your working preferences (collaboration, review priorities) |
| `/atta-tutorial` | This tutorial |
| `/atta-tutorial --quick` | Show this card |

### Daily Workflow
| Command | What it does |
|---------|-------------|
| `/atta-agent project-owner` | Route any task to the right specialist |
| `/atta-team-lead [task]` | Decompose a feature into specialist tracks |
| `/atta-agent architect` | System design and architecture decisions |

### Code Quality
| Command | What it does |
|---------|-------------|
| `/atta-lint [file]` | Fast pattern check on a file or folder |
| `/atta-review` | Full code review against project conventions (includes simplicity checks) |
| `/atta-preflight` | Complete pre-PR validation |
| `/atta-ship` | Completion workflow — tests, KISS gate, validation, PR description |

### Knowledge & Memory
| Command | What it does |
|---------|-------------|
| `/atta-librarian` | Capture rules ("always...", "never...") |
| `/atta-agent librarian` | Review or update project directives |

### Agent Shortcuts
| Command | What it does |
|---------|-------------|
| `/atta-agent [id]` | Invoke any agent directly |
| `/atta-agent code-reviewer` | Direct code critique |
| `/atta-agent architect` | Architecture decisions and blueprints |

### Keeping Agents Up to Date
| Command | What it does |
|---------|-------------|
| `/atta-update` | Check for framework updates |
| `/atta --rescan` | Re-detect tech stack changes |

---

**Tip:** Start every task with `/atta-agent project-owner` — it will route you to the right specialist automatically.

**Tip:** Capture team decisions with `/atta-librarian` so agents remember your project's rules across sessions.

---

*Atta — run `/atta-update` to keep agents current*
