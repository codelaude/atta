# Preflight Error Handling & Recovery

## Cannot Resolve Changed Files

```markdown
Could not determine changed files from the remote base branch.

Recovery options:
1. Run preflight on local diff only (`git diff --name-only`)
2. Provide explicit targets through `/atta-lint` and `/atta-review`
3. Fetch remotes, then rerun `/atta-preflight`
```

## Lint Blocked

```markdown
Preflight stopped: critical lint violations found.

Recovery options:
1. Fix critical lint issues first, then rerun `/atta-preflight`
2. Run `/atta-lint <target>` to focus on one area at a time
3. Use `/atta-review --quick <target>` for fast critical-only validation
```

## Security Blocked

```markdown
Preflight stopped: critical security vulnerabilities found.

Recovery options:
1. Fix critical security issues first, then rerun `/atta-preflight`
2. Run `/atta-security-audit <target>` to investigate specific files
3. Use `/atta-security-audit --secrets` or `--dependencies` to focus on one area
```

## Tests Fail

```markdown
Preflight stopped: test execution failed.

Recovery options:
1. Fix failing tests and rerun `/atta-preflight`
2. Isolate failures with your test runner command, then retry
3. If test infra is temporarily unstable, run `/atta-preflight --skip-tests` and note this risk in your PR
```

## Review Blocked

```markdown
Preflight stopped: critical code review findings.

Recovery options:
1. Fix CRITICAL review findings first, then rerun `/atta-preflight`
2. Run `/atta-review <target>` to focus on specific files
3. Use `/atta-review --quick <target>` for fast critical-only validation
```

## Review Step Unavailable

```markdown
Review step could not run with full context.

Recovery options:
1. Rerun `/atta` to regenerate missing context
2. Execute `/atta-review <target>` manually
3. Continue with lint+test result only and flag review as pending
```
