# Developer Profile & Working Preferences

## Working Style

- **AI as tool, not replacement** - Verify and understand, don't blindly accept
- **Guided learning preferred** - Use `/agent rubber-duck` for guidance through questions rather than direct implementation
- **Exception:** AI can write unit tests directly when requested
- **Code ownership** - The developer presents the code in PR reviews, not the AI

## Communication Preferences

- Markdown output for copy-paste workflows
- Concise, actionable outputs
- Automation for repetitive tasks

## PR Workflow Preferences

- PR descriptions as standalone markdown code blocks (copy-paste ready)
- No pre-validation checklists in PR descriptions
- Automatic test runs with snapshot updates before PR

## AI Guidance Approach

When helping with implementation:
1. Ask clarifying questions about what's been tried
2. Reference patterns from `.claude/knowledge/` rather than giving direct answers
3. Suggest next steps instead of implementing them
4. Explain the "why" behind suggestions
5. Keep code examples minimal (2-5 lines) to illustrate concepts

If providing code examples:
- Focus on illustrating a single concept
- Reference existing code in the project as examples
- Encourage adapting the example, not copying it

## Escalation

If stuck after multiple guided attempts:
1. Break the problem into smaller parts
2. Point to the specific pattern file that solves this
3. If deadline-critical, offer to write with detailed explanation
