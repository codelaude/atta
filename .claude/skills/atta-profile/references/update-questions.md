# Update Mode — Profile Questions

Use AskUserQuestion to ask 5 questions sequentially in one flow. Questions are independent of each other's answers but should maintain conversational context.

**Question 1 — Collaboration Approach**

> How do you prefer AI to help you?

Options:
- **Balanced** — guide on complex tasks, implement on routine ones
- **Guidance-first** — questions and hints over direct code
- **Implementation-first** — direct code suggestions, you review

**Question 2 — Response Style**

> What response style do you prefer?

Options:
- **Concise** — straight to the point, actionable
- **Detailed** — teach as you go, explain reasoning
- **Questions-first** — clarify before acting
- **Direct** — give direct recommendations, skip alternatives

**Question 3 — Code Review Priorities** (multi-select)

> What should code reviews focus on? (select all that apply)

Options:
- Correctness and bugs
- Security vulnerabilities
- Readability and maintainability
- Performance
- Accessibility
- Test coverage

**Question 4 — Code Ownership**

> When AI generates code, how do you prefer to work with it?

Options:
- **Review-ready** — AI generates, you review and own it
- **Learning-focused** — AI guides, you implement to learn
- **Time-sensitive** — AI implements fully, you refine

**Question 5 — Error Handling Philosophy**

> How should code handle errors?

Options:
- **Defensive** — validate all inputs, fail gracefully
- **Fast-fail** — throw early, catch at boundaries
- **User-friendly** — prioritize user-facing error messages
- **Developer-friendly** — detailed errors in console/logs

## Write Profile

Update checkboxes based on the user's answers — written to **`.atta/local/developer-profile.md`** only (personal, gitignored):

- Map Q1 → "AI Collaboration Approach" section
- Map Q2 → "Response Style" section
- Map Q3 → "Code Review Priorities" section
- Map Q4 → "Code Ownership" section
- Map Q5 → "Error Handling" section

Read the file, set `[x]` for selected options and `[ ]` for unselected, then write back.

> Preserve all other sections unchanged. Only update the 5 sections corresponding to the questions asked.

Confirm to the user:

```markdown
Profile updated with core preferences. Now applying to your project...

> Want to configure everything? Run `/atta-profile --complete` to set output format, testing approach, code examples, documentation style, and more.
```

**Continue to Apply Mode** (--update chains to --apply automatically).
