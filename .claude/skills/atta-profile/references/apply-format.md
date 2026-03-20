# Apply Mode — Parse and Propagate Profile

## Parse Profile

Read both profile files:
- `.atta/local/developer-profile.md` — personal prefs (may not exist if gitignored and not yet created)
- `.atta/project/project-profile.md` — team conventions

If neither file has any checked items:

```markdown
No profile to apply. Run `/atta-profile --update` first to set your preferences.
```

Stop here.

Extract the checked preferences into structured data:

**From `developer-profile.md`** (personal):
- `collaboration`: guidance-first | implementation-first | balanced
- `responseStyle`: concise | detailed | questions-first | direct
- `codeOwnership`: review-ready | learning-focused | time-sensitive
- `exceptionCases`: list of checked cases (tests, configs, docs)
- `outputFormat`: list of checked formats
- `codeExamples`: minimal | complete | reference-existing | pseudocode

**From `project-profile.md`** (team):
- `reviewPriorities`: list of checked priorities
- `errorHandling`: defensive | fast-fail | user-friendly | developer-friendly
- `testingApproach`: TDD | test-after | critical-paths | high-coverage
- `documentation`: inline-comments | jsdoc | readme-per-module | minimal

## Update project-context.md Preferences Section

Read `.atta/project/project-context.md`.

Write or replace a `## Preferences` section at the end of the file. The section must be 3-5 lines — distilled, not verbose.

Format (3-5 lines — only include lines where data exists):

```markdown
## Preferences

- **Style**: [collaboration] collaboration, [responseStyle] responses
- **Reviews**: Focus on [comma-separated review priorities]
- **Approach**: [codeOwnership] code ownership, [errorHandling] error handling
- **Workflow**: [testingApproach] testing, [documentation] docs, [outputFormat] output
- **AI direct-write OK**: [exceptionCases list, or omit line if none]
```

Example:

```markdown
## Preferences

- **Style**: Balanced collaboration, concise responses
- **Reviews**: Focus on correctness, security, readability
- **Approach**: Review-ready code ownership, fast-fail error handling
- **Workflow**: TDD testing, minimal docs, markdown + diffs output  <- only after --complete
- **AI direct-write OK**: tests, configs                           <- only after --complete
```

> Only include lines where data exists. Replace existing `## Preferences` section entirely. If `project-context.md` doesn't exist, create it with just this section.

## Agent Propagation

Preferences propagate via two layers:
1. **Runtime** (immediate): `project-context.md` `## Preferences` section — all agents pick it up automatically.
2. **Generation-time** (next `/atta --rescan`): `/atta` reads both profiles and injects a `## Developer Preferences` section into each generated agent file (centralized in `generator.md` Phase 4).

Report: show the preferences written to `project-context.md` and suggest `/atta --rescan` to bake preferences into generated agents.
