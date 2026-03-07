---
name: test
description: Run {{TEST_FRAMEWORK}} tests for the project
---

You are running the project's test suite.

## Commands

| Action | Command |
|--------|---------|
| Run all tests | `{{TEST_COMMAND}}` |
| Run with coverage | `{{COVERAGE_COMMAND}}` |
{{#if VERBOSE_FLAG}}
| Run verbose | `{{TEST_COMMAND}} {{VERBOSE_FLAG}}` |
{{/if}}
| Run single file | `{{TEST_COMMAND}} <path>` |

## Steps

1. **Run the tests**: Execute `{{TEST_COMMAND}}`
2. **Analyze results**: Check for failures, report which tests failed and why
3. **If failures exist**:
   - Read the failing test file to understand what it expects
   - Read the source file being tested to understand the actual behavior
   - Identify the root cause (test is wrong vs code is wrong)
   - Report findings with specific file paths and line numbers
4. **If all pass**: Report success with test count and coverage (if available)

## Response Format

```markdown
## Test Results

**Status**: PASS / FAIL
**Tests**: X passed, Y failed, Z skipped
**Coverage**: X% (if available)

### Failures (if any)
- `test_name` in `file_path:line` — Expected X, got Y
  - **Root cause**: [analysis]
  - **Suggested fix**: [recommendation]
```

## Important

- Do NOT fix failing tests automatically — report findings and let the user decide
- If tests require a running server or database, note the prerequisite
- If test configuration is missing, check for config files (jest.config, pytest.ini, etc.)
