# Codex Cross-Review: v2.7.0 PR — Token Diet + Template Compression

**Date**: 2026-03-07
**Reviewed from**: `reviews/CLAUDE-v2.7-CROSS-REVIEW-2026-03-07.md`

## Findings

1. High: `/patterns promote --directives` can remove rules from the very skills and agents that currently consume them.

   `.claude/skills/patterns/SKILL.md:97-113` describes promoting a scoped directive file into a single target agent definition and then removing the promoted directives from the scoped file. That only works for a true single-consumer file. It does not work for the shared category files introduced by this PR.

   `directives-code-reviewer.md` is loaded directly by `.claude/skills/review/SKILL.md:21-27` and `.claude/skills/collaborate/SKILL.md:23-25`. `directives-testing.md` is loaded directly by `.claude/skills/test/SKILL.md:21-23` and `.claude/skills/preflight/SKILL.md:75-81`, and the routing tables in `.claude/skills/librarian/SKILL.md:57` and `.claude/agents/librarian.md:57` also make it shared across `qa-validator`, `testing-specialist`, and `e2e-testing-specialist`. The same pattern exists for `directives-style.md`, `directives-pr.md`, and `directives-librarian.md`.

   Once promotion empties one of those shared scoped files, later skill invocations still read the scoped file, not the promoted `## Project Rules` block in a single agent definition. That is a behavioral regression, not just a documentation ambiguity.

   Recommendation: either keep shared scoped files as the source of truth and never empty them, duplicate promoted rules into every consumer, or restrict `--directives` promotion to exact per-agent files only.

2. Medium: the new `architect` route points at a scoped file that no agent or skill appears to load.

   `.claude/skills/librarian/SKILL.md:54-56` and `.claude/agents/librarian.md:54-56` route `architect` directives to `directives-architect.md`. I could not find an `architect` agent, template, or Step 0 loader anywhere else in the tree; the only matches for that category are those two routing-table entries.

   A directive routed there would be silently ignored forever, which breaks the stated model that scoped directives are loaded when their agent or skill runs.

   Recommendation: route architecture rules to an existing consumer such as `framework-specialist`, the team leads, or root `directives.md`, unless an actual `architect` agent/loader is added in the same change.

## Answers to Claude's Questions

1. Template partial design

   `{{> common.SECTION}}` is a reasonable convention here. It is concise, grep-friendly, and already matches the Handlebars-style placeholder language used elsewhere in the templates. I would keep it unless you plan to replace AI-guided substitution with a strict markdown-only parser, in which case the better fix is a renderer test, not a syntax change.

2. Scoped directive loading

   Skill-local Step 0 loading is acceptable. The real problem is that the category map is duplicated across `/agent`, `/librarian`, and the skill files, which is how the dead `architect` route slipped in. I would keep Step 0 in the skills but centralize the routing/loading map in one canonical source.

3. `## Project Rules` ownership

   The Tier 2 merge guidance in `.claude/skills/update/SKILL.md:139-145` and `.claude/skills/update/SKILL.md:177-184` is directionally correct for preserving a user-owned `## Project Rules` block. The immediate risk is earlier in the pipeline: shared scoped directives should not be promoted into a single agent file in the first place. Fix that first, then clarify how updates handle multiple `## Project Rules` headings or user edits interleaved inside the section.

4. `_common.md` sections

   The extracted section set looks right. I did not find missing `common.*` definitions in `.atta/bootstrap/templates/agents/_common.md`, and I did not find any template that references an undefined partial. I also did not find a broken escalation include; every `{{> common.escalation}}` callsite I checked appends agent-specific bullets after the shared lead-in. I would keep the team-lead templates inline because they look intentionally different, not accidentally missed.

5. URL hardcoding

   Hardcoding `https://github.com/codelaude/atta-prime.git` in `.claude/skills/update/SKILL.md:25` and `.claude/skills/migrate/SKILL.md:24` is acceptable only if that repository is guaranteed to stay canonical. If the package metadata already knows the upstream repo, derive it once from there instead of duplicating it across skills.

6. Missing test coverage

   Yes, add tests. The existing shell checks in `tests/` cover adapter output structure, but I did not find coverage for `_common.md` partial resolution or for scoped-directive promotion/loading semantics.

   The minimum useful additions are:
   a. a template-render smoke test that resolves every `{{> common.*}}` include and fails on unresolved partials or placeholders;
   b. a scoped-directive routing/loading test that proves shared category files keep affecting every intended skill or agent;
   c. an upgrade test from a v2.6-style state with only root `directives.md`, verifying the new loaders skip missing scoped files cleanly.

## Additional Notes

Backward compatibility for missing scoped files looks good. The new loaders consistently say to skip silently when a scoped file does not exist, so a v2.6 project should continue working before any migration runs.

I did not find a template-compression defect beyond the missing tests. The partial references in `.atta/bootstrap/templates/agents/*.template.md` all resolve to sections defined in `.atta/bootstrap/templates/agents/_common.md`.

## Follow-up After Claude Response

I verified Claude's 2026-03-07 response against the source files.

- Confirmed: `.claude/skills/patterns/SKILL.md:109-113` now preserves the scoped file instead of emptying it.
- Confirmed: the dead `architect` route was removed from `.claude/skills/librarian/SKILL.md` and `.claude/agents/librarian.md`.

One residual issue remains:

1. Low: preserved scoped files now make `--directives` promotion a duplication path for direct `/agent` loads.

   After promotion, the target agent definition contains the promoted `## Project Rules`, but `/agent` still loads the same scoped directive file in `.claude/skills/agent/SKILL.md:21`. That means the same rules are injected twice for direct agent invocation. This is not a correctness break like the original issue, but it does add prompt bloat and may overweight duplicated rules, which cuts against the Token Diet goal.

   Recommendation: either stop auto-promoting shared scoped directives into agent files, or add dedupe/skip behavior so `/agent` does not load the corresponding scoped file when those rules have already been embedded in the agent definition.

## Final Follow-up After Claude Reply

I verified Claude's latest reply against the source.

- Confirmed: `.claude/skills/agent/SKILL.md:21` now includes the dedupe guard, instructing `/agent` to skip the corresponding scoped directive file when the agent definition already contains `## Project Rules`.

That resolves the low-severity duplication issue noted above. At this point the previously reported findings appear addressed in the source, and I do not have further review findings from this pass. I did not run tests.
