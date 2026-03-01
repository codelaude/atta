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

  // Codex uses $ prefix for skills, all others use /
  const p = adapter === 'codex' ? '$' : '/';

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
    lines.push('Open your project in Copilot CLI and run:');
    lines.push('');
    lines.push('```');
    lines.push('/atta');
    lines.push('```');
    lines.push('');
    lines.push(
      'This auto-detects your tech stack and generates specialist agents tailored to your project. Skills are in `.github/skills/` and agents in `.github/atta/agents/`.'
    );
  } else if (adapter === 'codex') {
    lines.push('Open your project in Codex CLI and run:');
    lines.push('');
    lines.push('```');
    lines.push('$atta');
    lines.push('```');
    lines.push('');
    lines.push(
      'This auto-detects your tech stack and generates specialist agents tailored to your project. Skills are in `.agents/skills/` and agents in `.agents/agents/`. Invoke skills with `$review`, `$preflight`, etc.'
    );
  } else if (adapter === 'gemini') {
    lines.push('Open your project in Gemini CLI and run:');
    lines.push('');
    lines.push('```');
    lines.push('/atta');
    lines.push('```');
    lines.push('');
    lines.push(
      'This auto-detects your tech stack and generates specialist agents tailored to your project. `GEMINI.md` provides context and TOML commands in `.gemini/commands/` register as slash commands (e.g., `/review`, `/preflight`).'
    );
  }

  lines.push('');

  // Step 2: Tutorial
  if (!answers || answers.includeTutorial !== false) {
    lines.push('## 2. Take the Tutorial (5 min)');
    lines.push('');
    lines.push('```');
    lines.push(`${p}tutorial`);
    lines.push('```');
    lines.push('');
    lines.push(
      'The interactive walkthrough introduces your agent team, demonstrates task routing, and shows quality checks. Alternatively:'
    );
    lines.push('');
    lines.push('```');
    lines.push(`${p}tutorial --quick    # Just the reference card`);
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
  lines.push(`| \`${p}agent project-owner\` | Route any task to the right specialist |`);
  lines.push(`| \`${p}team-lead [task]\` | Decompose a feature into specialist tracks |`);
  lines.push(`| \`${p}agent rubber-duck\` | Think through a problem with guided questions |`);
  lines.push('');

  lines.push('### Code Quality');
  lines.push('');
  lines.push('| Command | What it does |');
  lines.push('|---------|-------------|');
  lines.push(`| \`${p}lint [file]\` | Fast pattern check |`);
  lines.push(`| \`${p}review\` | Deep code review against conventions |`);
  lines.push(`| \`${p}security-audit\` | OWASP Top 10 vulnerability scan |`);
  lines.push(`| \`${p}preflight\` | Full pre-PR validation (lint + review + security + tests) |`);
  lines.push('');

  lines.push('### Knowledge & Memory');
  lines.push('');
  lines.push('| Command | What it does |');
  lines.push('|---------|-------------|');
  lines.push(`| \`${p}librarian\` | Capture rules and preferences across sessions |`);
  lines.push(`| \`${p}collaborate\` | Multi-agent review (2-4 specialists in parallel) |`);
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
  lines.push(`${p}update              # Check for framework updates`);
  lines.push(`${p}atta --rescan       # Re-detect tech stack changes`);
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
