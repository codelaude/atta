---
name: test
description: Run tests with auto-detection, E2E support, coverage analysis, and watch mode.
---

You are running the project's test suite with intelligent framework detection.

## How to Use

```
/test                     # Run unit/integration tests (auto-detect framework)
/test --e2e               # Run E2E tests only
/test --coverage          # Run tests with coverage analysis
/test --watch             # Run tests in watch mode
/test --e2e --coverage    # E2E tests with coverage
/test <path>              # Run tests for a specific file or directory
```

---

## Step 1: Detect Test Framework

Read `.atta/project/project-context.md` for the detected test framework and commands.

If project-context.md is unavailable or doesn't specify test commands, auto-detect by checking:

| Check | Framework | Unit Command | E2E Command |
|-------|-----------|-------------|-------------|
| `jest` in devDeps or `jest.config.*` | Jest | `npx jest` | — |
| `vitest` in devDeps | Vitest | `npx vitest run` | — |
| `pytest` in requirements or `pytest.ini` | pytest | `pytest` | — |
| `go.mod` exists | Go test | `go test ./...` | — |
| `Cargo.toml` exists | Cargo test | `cargo test` | — |
| `pom.xml` exists | Maven | `mvn test` | — |
| `build.gradle` exists | Gradle | `gradle test` | — |
| `cypress.config.*` or `cypress/` dir | Cypress | — | `npx cypress run` |
| `playwright.config.*` or `@playwright/test` / `playwright` in devDeps | Playwright | — | `npx playwright test` |
| `wdio.conf.*` | WebdriverIO | — | `npx wdio run wdio.conf.js` |
| `puppeteer` or `puppeteer-core` in devDeps | Puppeteer | — | *(custom — check package.json scripts)* |
| `selenium-webdriver` in devDeps or `selenium` in requirements/pom.xml/build.gradle | Selenium | — | *(custom — check package.json scripts or language-specific runner)* |

Also check `package.json` scripts for `test`, `test:e2e`, `test:unit`, `test:coverage`, `e2e` keys — prefer project-defined scripts over raw framework commands.

Report what was detected before running.

If no test framework is detected (neither unit nor E2E):

```
No test framework detected. To add testing:
1. Install a framework (e.g., npm install -D jest, pip install pytest)
2. Run /atta --rescan to detect it
3. Rerun /test
```

---

## Step 2: Run Tests

### Default mode (no flags)

Run the detected unit/integration test command. If a `<path>` argument is provided, append it using framework-appropriate syntax (e.g., Jest/Vitest/pytest support path args directly; for Maven/Gradle, run the full suite instead).

### `--e2e` flag

Run the detected E2E test command. If no E2E framework is detected:

```
No E2E test framework detected. To add E2E testing:
1. Install a framework: npm install -D @playwright/test
2. Run /atta --rescan to detect it
3. Rerun /test --e2e
```

### `--coverage` flag

| Framework | Coverage Command |
|-----------|-----------------|
| Jest | `npx jest --coverage` |
| Vitest | `npx vitest run --coverage` |
| pytest | `pytest --cov` |
| Go | `go test -cover ./...` |
| Cargo | `cargo tarpaulin` (if available) or `cargo test` |
| Maven | `mvn test jacoco:report` |
| Gradle | `gradle test jacocoTestReport` |
| Cypress | `npx cypress run --env coverage=true` (requires @cypress/code-coverage) |
| Playwright | `npx playwright test` (requires Istanbul instrumentation — not built-in; see [Playwright coverage docs](https://playwright.dev/docs/api/class-coverage)) |

### `--watch` flag

| Framework | Watch Command |
|-----------|--------------|
| Jest | `npx jest --watch` |
| Vitest | `npx vitest` (watch is default) |
| pytest | `pytest-watch` or `ptw` (if available) |
| Cypress | `npx cypress open` (interactive mode) |
| Playwright | `npx playwright test --ui` (UI mode) |

> **Note**: Watch mode is interactive — inform the user how to exit (Ctrl+C or `q`).

### Combined flags

`--e2e --coverage`: Run E2E tests with coverage enabled.

---

## Step 3: Analyze Results

### On success
Report:
- Test count (passed / failed / skipped)
- Coverage summary (if `--coverage` was used — show % per category: statements, branches, functions, lines)
- Any warnings or deprecation notices

### On failure
1. Read the failing test file to understand what it expects
2. Read the source file being tested to understand the actual behavior
3. Identify root cause (test is wrong vs code is wrong)
4. Report findings with specific file paths and line numbers

### Coverage analysis (when `--coverage` is used)

Present: statements/branches/functions/lines percentages in a table. List uncovered areas with file:line references. Highlight files with < 50% coverage if recently changed (`git diff`).

---

## Step 4: Report

Show: framework, mode, status (PASS/FAIL), test counts, coverage % (if applicable), duration. For failures: test name, file:line, expected vs actual, root cause analysis, suggested fix.

---

## Important

- Do NOT fix failing tests automatically — report findings and let the user decide
- If tests require a running server or database, note the prerequisite
- If test configuration is missing, check for config files and suggest setup steps
- For `--watch` mode, explain it's interactive and how to exit
- If both unit and E2E frameworks are detected, default mode runs unit only (use `--e2e` for E2E)

---

## Related Skills

- `/preflight` — Includes test execution as part of pre-PR validation
- `/review` — Code review (pair with test results)
- `/agent jest` / `/agent e2e` — Testing specialist guidance

---

_Run tests with auto-detection, E2E support, and coverage analysis_
