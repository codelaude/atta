# Design Philosophy

## The Problem This Solves

Most AI coding tools operate as a single general-purpose assistant. You get fast output but lose understanding. The AI generates code you can't explain in review, tests that validate their own hallucinations, and patterns that drift from your project's conventions every new conversation.

This system takes a different approach: **a team of specialized agents with clear roles, strict boundaries, and shared project knowledge.**

## The Core Principle

**The conversation is disposable. The context is permanent.**

The agents, skills, knowledge base, and directives are all pre-prepared context. Instead of explaining conventions every session, they're in files. Instead of correcting the same mistakes, they're in anti-pattern lists. When you do correct something new, the librarian captures it so it doesn't happen again.

**The quality of what AI gives you is directly proportional to the context you give it.**

## Key Concepts

### Agents Guide, They Don't Generate

Every agent provides expertise, reviews, and recommendations. **You remain in control.**

The system is designed to make you a better developer, not to replace you. Agents suggest, review, and teach — they don't auto-generate code without your direction.

### The Rubber Duck

The agent whose job is to **not give you answers**.

It asks questions, points you to patterns, and helps you discover solutions yourself. This is guided learning mode — you learn by thinking, not by copying.

**Exception:** It will write unit tests when asked, because nobody needs to be guided through their 47th mount wrapper factory.

### The Librarian

Captures directives ("remember to...", "always...", "never...") as structured rules that persist across sessions.

Over time, frequently-used directives get graduated into pattern files. **The knowledge base grows with your project.**

Example flow:
1. You correct an anti-pattern: "Never use `any` type, use proper TypeScript types"
2. Librarian captures it in `directives.md`
3. After seeing it multiple times, it gets promoted to `typescript-patterns.md`
4. Now all future sessions automatically check for this pattern

### Adaptive Coordinators (v2.0)

Coordinators (team leads) are generated based on what's detected:

- **Frontend only?** → Generates FE Team Lead (coordinates framework, styling, testing specialists)
- **Backend only?** → Generates BE Team Lead (coordinates language, framework, database specialists)
- **Full-stack?** → Generates BOTH coordinators, each managing their domain
- **Monorepo?** → Detects multiple stacks, generates all necessary coordinators and specialists

**The structure adapts automatically to your project architecture.**

No manual configuration needed — the system shapes itself to match your project.

## How It Grows

Atta starts minimal and compounds through use. The developer is the gatekeeper at every step.

### Day 1: Detection

`/atta` scans your tech stack, generates agents and pattern files. You get just enough context to steer — not a wall of instructions competing with your code for tokens.

### Week 1: Corrections

You correct things as you work. "No, we use Composition API here." "Always use `defineEmits` with typed events." The librarian captures these as directives — structured rules that persist across sessions. Next conversation, the same mistake doesn't happen.

### Month 1: Patterns

Corrections accumulate. When the same issue appears three times, it reaches threshold and becomes a promotable pattern. `/patterns suggest` shows what the system has learned. You decide whether to promote it to a pattern file or a directive — nothing changes without your explicit approval.

Agent acceptance rates start showing which specialists are aligned with your style. The developer profile is dialed in — review priorities, collaboration approach, guidance level all reflect how *you* work.

### Ongoing: Compounding Context

The knowledge base grows, but only through your decisions:
- Every promoted pattern was approved by you
- Every directive was captured from your corrections
- Every developer preference was set by you
- Every agent constraint was defined at generation time

The system gets better because the context gets better — and the context is yours.

## Design Decisions

### Why Static Files Over Dynamic Generation?

**Context persistence.** Files in `.claude/` and `.atta/` are:
- ✅ Version controlled
- ✅ Reviewable in PRs
- ✅ Shared across team members
- ✅ Portable to other AI tools
- ✅ Survive conversation resets

Dynamic context is lost when the conversation ends. Static files are permanent.

### Why Agent Hierarchy?

**Specialization + Coordination.** A single mega-agent can't:
- Know every framework's latest patterns
- Balance cross-cutting concerns (a11y, testing, security)
- Provide focused, domain-specific guidance
- Scale to polyglot/full-stack projects

The hierarchy ensures:
- **Specialists** have deep knowledge in their domain
- **Coordinators** orchestrate multi-specialist features
- **Core agents** handle cross-cutting concerns (QA, librarian, etc.)

### Why Bootstrap System (v2.0)?

**Universality.** Hardcoding agents for Vue/TypeScript/SCSS works great... for Vue/TypeScript/SCSS projects.

The bootstrap system makes the architecture **tech-agnostic**:
- Supports any framework, language, or database
- Generates project-specific agents from universal templates
- Extends via configuration (YAML files), not code
- Scales from simple SPAs to complex full-stack systems

## Workflow Philosophy

### Learning Over Automation

The rubber-duck agent embodies this: **asking questions is more valuable than giving answers.**

When you discover a solution yourself (with guidance), you learn. When code is auto-generated, you copy.

### Pattern Recognition Over Repetition

The librarian + pattern files system ensures:
- Common mistakes are caught automatically
- Best practices are enforced consistently
- The knowledge base grows organically
- Team standards become codified

Instead of correcting `any` types 50 times, correct it once and let the system remember.

### Guidance Over Control

Agents suggest, don't dictate:
- **Code Reviewer** flags issues with severity ratings (you decide what to fix)
- **QA Validator** checks acceptance criteria (you decide when it's done)
- **Team Leads** propose task decomposition (you refine the plan)

**You're the engineer. The agents are your team.**

## Portability Philosophy

The `.claude/` and `.atta/` directories together are the source of truth. Design goal: **the knowledge base should be portable across tools.**

### Cross-Tool Compatibility

| Layer | Claude Code | GitHub Copilot | OpenAI Codex |
|-------|-------------|----------------|--------------|
| Agents | Sub-agents with routing | Skills + delegation | Sub-agents + routing |
| Skills | Native slash commands | Skills (CLI/IDE) | Skills + orchestration |
| Knowledge | Pattern files | Pattern files | Pattern files |
| Memory | Librarian agent | Instruction file | Skill + file |

**The knowledge base is the most portable layer.** Start with patterns, then layer routing and specialists.

### Why Not Just Use Prompts?

Static files beat inline prompts for:
- **Persistence:** Files survive conversation resets
- **Version control:** Track changes, review in PRs
- **Team sharing:** Everyone gets the same context
- **Portability:** Works across AI tools
- **Maintainability:** Update once, applies everywhere

Prompts are ephemeral. Context files are permanent.

## See Also

- [Main README](../../README.md) - Quick start guide
- [Bootstrap System](bootstrap-system.md) - How dynamic generation works
- [Extending the System](extending.md) - Add your own technologies
- [Changelog](changelog.md) - Full version history
