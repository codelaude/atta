/**
 * Generate GETTING-STARTED.md content for newly initialized projects.
 */
export function generateGettingStarted(adapter, answers) {
  const toolName = {
    'claude-code': 'Claude Code',
    copilot: 'Copilot CLI',
    codex: 'Codex CLI',
    gemini: 'Gemini CLI',
  }[adapter] || 'your AI tool';

  const lines = [];

  lines.push('# Getting Started with Atta');
  lines.push('');
  lines.push(
    '> Atta gives you an AI development team — specialized agents that guide code quality, architecture, and security.'
  );
  lines.push('');

  // Step 1: Configure for your project
  lines.push('## 1. Configure Agents for Your Project');
  lines.push('');

  if (adapter === 'claude-code') {
    lines.push('Open your project in Claude Code and run:');
    lines.push('');
    lines.push('```');
    lines.push('/atta');
    lines.push('```');
    lines.push('');
    lines.push(
      'This auto-detects your tech stack (100+ technologies) and generates specialist agents tailored to your frameworks, languages, and tools.'
    );
  } else if (adapter === 'copilot') {
    lines.push('Open your project in Copilot CLI. Your skills are in `.github/skills/`.');
    lines.push('The `AGENTS.md` file at the project root describes your agent team.');
    lines.push('');
    lines.push(
      'To generate agents tailored to your stack, run `/atta` if supported, or manually edit `.claude/agents/INDEX.md`.'
    );
  } else if (adapter === 'codex') {
    lines.push('Open your project in Codex CLI. Your skills are in `.agents/skills/`.');
    lines.push('The `AGENTS.md` file at the project root describes your agent team.');
    lines.push('');
    lines.push(
      'Skills can be activated by mentioning `$review`, `$preflight`, etc. in your prompts.'
    );
  } else if (adapter === 'gemini') {
    lines.push('Install the Atta extension in Gemini CLI:');
    lines.push('');
    lines.push('```');
    lines.push('gemini extensions install .');
    lines.push('```');
    lines.push('');
    lines.push(
      'This loads `GEMINI.md` as context and registers TOML commands in `commands/` as slash commands (e.g., `/review`, `/preflight`).'
    );
  }

  lines.push('');

  // Step 2: Tutorial
  if (!answers || answers.includeTutorial !== false) {
    lines.push('## 2. Take the Tutorial (5 min)');
    lines.push('');
    lines.push('```');
    lines.push('/tutorial');
    lines.push('```');
    lines.push('');
    lines.push(
      'The interactive walkthrough introduces your agent team, demonstrates task routing, and shows quality checks. Alternatively:'
    );
    lines.push('');
    lines.push('```');
    lines.push('/tutorial --quick    # Just the reference card');
    lines.push('```');
    lines.push('');
  }

  // Quick Reference
  lines.push(answers?.includeTutorial === false ? '## 2. Quick Reference' : '## 3. Quick Reference');
  lines.push('');
  lines.push('### Daily Workflow');
  lines.push('');
  lines.push('| Command | What it does |');
  lines.push('|---------|-------------|');
  lines.push('| `/agent project-owner` | Route any task to the right specialist |');
  lines.push('| `/team-lead [task]` | Decompose a feature into specialist tracks |');
  lines.push('| `/agent rubber-duck` | Think through a problem with guided questions |');
  lines.push('');

  lines.push('### Code Quality');
  lines.push('');
  lines.push('| Command | What it does |');
  lines.push('|---------|-------------|');
  lines.push('| `/lint [file]` | Fast pattern check |');
  lines.push('| `/review` | Deep code review against conventions |');
  lines.push('| `/security-audit` | OWASP Top 10 vulnerability scan |');
  lines.push('| `/preflight` | Full pre-PR validation (lint + review + security + tests) |');
  lines.push('');

  lines.push('### Knowledge & Memory');
  lines.push('');
  lines.push('| Command | What it does |');
  lines.push('|---------|-------------|');
  lines.push('| `/librarian` | Capture rules and preferences across sessions |');
  lines.push('| `/collaborate` | Multi-agent review (2-4 specialists in parallel) |');
  lines.push('');

  // Your Preferences
  lines.push('## Your Preferences');
  lines.push('');
  if (answers) {
    lines.push(
      'Your working preferences were saved during setup. Agents will read these to adapt their behavior.'
    );
  } else {
    lines.push(
      'Agents can adapt to your working style. Fill in your preferences to customize their behavior.'
    );
  }
  lines.push('');
  lines.push('Edit anytime: `.claude/knowledge/project/developer-profile.md`');
  lines.push('');

  lines.push('Key settings:');
  lines.push('- **Collaboration style** — how verbose/proactive should agents be?');
  lines.push('- **Code review priorities** — what matters most (security? performance? readability?)');
  lines.push('- **Response format** — concise vs detailed explanations');
  lines.push('');

  // How Agents Work
  lines.push('## How Agents Work');
  lines.push('');
  lines.push('```');
  lines.push('You describe a task');
  lines.push('  → Project Owner routes it');
  lines.push('    → Right specialist helps');
  lines.push('      → You get expert guidance');
  lines.push('```');
  lines.push('');
  lines.push('Agents **guide** — they don\'t auto-generate code unless you ask.');
  lines.push('Each agent has explicit constraints and boundaries.');
  lines.push('Conflicts between agents escalate to you for the final decision.');
  lines.push('');

  // Keeping Updated
  lines.push('## Keeping Updated');
  lines.push('');
  lines.push('```');
  lines.push('/update              # Check for framework updates');
  lines.push('/atta --rescan       # Re-detect tech stack changes');
  lines.push('```');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(
    '*Generated by [Atta](https://github.com/codelaude/atta) — AI Dev Team Agent*'
  );
  lines.push('');

  return lines.join('\n');
}
