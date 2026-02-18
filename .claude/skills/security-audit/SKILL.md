---
name: security-audit
description: Security audit scanning for vulnerabilities, secrets, and insecure patterns. Covers OWASP Top 10 (2025), dependency vulnerabilities, and hardcoded credentials.
---

You are now acting as the **Security Specialist** performing a comprehensive security audit.

## How to Use

```
/security-audit                      # Full security audit on changed files
/security-audit src/api/             # Audit specific folder
/security-audit auth.ts              # Audit specific file
/security-audit --dependencies       # Dependency vulnerability scan only
/security-audit --secrets            # Secrets/credentials scan only
/security-audit --quick              # Critical findings only (fast mode)
```

---

## Execution Steps

### Step 1: Determine Audit Scope

First, separate flags (`--dependencies`, `--secrets`, `--quick`) from file/folder arguments. Flags modify behavior; only non-flag arguments are treated as targets.

Flag precedence:
- `--dependencies` and `--secrets` are scope flags and override `--quick`
- `--quick` only affects Step 3 (OWASP pattern checks), not dependency/secrets-only modes

**If `--dependencies` flag:**
Skip to Step 4 (Dependency Audit only).

**If `--secrets` flag:**
Skip to Step 5 (Secrets Scan only).

**If no file/folder argument provided** (including flag-only invocations like `--quick`):
```bash
# Detect base branch dynamically
if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/main...HEAD)
elif git rev-parse --verify --quiet origin/master >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/master...HEAD)
elif git rev-parse --verify --quiet origin/develop >/dev/null 2>&1; then
  FILES=$(git diff --name-only origin/develop...HEAD)
else
  # No remote base found — fall back to uncommitted changes
  FILES=$(git diff --name-only)
fi
```
Audit all files in `$FILES`. If `$FILES` is empty, trigger the "Cannot Determine Audit Scope" recovery.

**If file/folder argument provided:**
Read the specified target.

### Step 2: Auto-Read Files

For each file in scope, use the Read tool to load the content. Don't ask the user — just read them.

### Step 3: OWASP Top 10 (2025) Pattern Checks

Apply these automated security checks to all files in scope:

#### CRITICAL Checks (Block PR)

| File Type | Pattern | What to Check |
|-----------|---------|---------------|
| All | Hardcoded secrets | API keys, tokens, passwords in string literals |
| All | `eval()` / `exec()` with variables | Code execution with potentially user-controlled input |
| `.sql` / DB queries | String concatenation in queries | SQL injection via `+`, `f"..."`, or `format()` |
| `.vue` | `v-html` with dynamic binding | XSS via unsanitized HTML rendering |
| `.jsx/.tsx` | `dangerouslySetInnerHTML` | XSS via unsanitized HTML rendering |
| All | `innerHTML` assignment | XSS via direct DOM manipulation |
| All | `child_process.exec()` / `os.system()` with variables | Command injection |
| All | Private keys in source | `-----BEGIN.*PRIVATE KEY-----` |

#### HIGH Checks (Fix Before Merge)

| File Type | Pattern | What to Check |
|-----------|---------|---------------|
| All | MD5/SHA1 for passwords | Weak hashing algorithms for credentials |
| All | Missing CSRF protection | State-changing endpoints without CSRF tokens |
| Config | Wildcard CORS (`*`) | Overly permissive cross-origin access |
| Config | Debug mode enabled | `DEBUG = True`, `debug: true` in production configs |
| Auth | No rate limiting | Login/register endpoints without throttling |
| All | JWT in localStorage | Auth tokens stored in browser storage |
| All | HTTP URLs (not HTTPS) | Insecure transport for API calls |

#### MEDIUM Checks (Fix in Sprint)

| File Type | Pattern | What to Check |
|-----------|---------|---------------|
| All | Missing input validation | User data used without type/length/format validation |
| All | Verbose error messages | Stack traces or internal details in error responses |
| Config | Missing security headers | No CSP, HSTS, X-Frame-Options |
| All | Sensitive data in URLs | Passwords, tokens in query parameters |
| All | Missing error boundaries | Unhandled exceptions that crash the process |
| All | Unverified dependencies | No lock file or SRI for CDN resources |

**If `--quick` flag:** Only run CRITICAL checks, skip HIGH and MEDIUM.

### Step 4: Dependency Audit

Check for vulnerable dependencies:

**Node.js projects:**
```bash
# npm audit exits non-zero when vulnerabilities are found — capture output regardless
if command -v npm >/dev/null 2>&1; then
  npm audit --json 2>/dev/null || true
else
  echo "npm audit not available"
fi
```

**Python projects:**
```bash
# pip-audit exits non-zero when findings exist — capture output regardless
if command -v pip-audit >/dev/null 2>&1; then
  pip-audit --format=json 2>/dev/null || true
else
  echo "pip-audit not available"
fi
```

**If audit tools are not available**, check for lock files and report:
- Whether lock files exist and are committed
- Whether Dependabot/Renovate/Snyk is configured
- Recommend setting up automated dependency scanning

### Step 5: Secrets Scan

Scan all files in scope for potential secrets using these patterns:

| Pattern Type | Regex | Notes |
|-------------|-------|-------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` | AWS IAM access key ID |
| AWS Secret Key | `(aws_secret_access_key|AWS_SECRET_ACCESS_KEY)[^\\n]{0,20}['\":=][[:space:]]*[A-Za-z0-9/+=]{40}` | AWS secret access key with required AWS context |
| Generic API Key | `(api[_-]?key|token|secret)[^\\n]{0,40}['\"][A-Za-z0-9_-]{24,}['\"]` | API key in string literal with required secret-related context |
| Private Key | `-----BEGIN.*PRIVATE KEY-----` | Embedded private key |
| JWT Token | `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` | Hardcoded JWT |
| Database URL | See below | Connection string with credentials |
| Password Assignment | `password\s*=\s*\"[^\"]+\"|password\s*=\s*'[^']+'` | Hardcoded password (not in test files) |

Database URL regex (contains alternation, cannot go in table):
```
(postgres|mysql|mongodb)://[^:]+:[^@]+@
```

**Exclude from flagging:**
- Environment variable references (`process.env.`, `os.environ`)
- Config references (`settings.SECRET_KEY`)
- Test fixtures with obviously fake values
- Documentation examples with placeholders
- `.env.example` files with placeholder values

### Step 6: Generate Audit Report

```markdown
## Security Audit: [target]

### Summary

| Category | Status | Findings |
|----------|--------|----------|
| OWASP Pattern Checks | X passed / X failed | [details] |
| Dependency Audit | [status] | [details] |
| Secrets Scan | [status] | [details] |

**Overall:** PASS / FINDINGS / CRITICAL ISSUES

### Critical Findings (if any)

#### [CRITICAL-001] [Finding Title]
- **File**: `path/to/file.ts:42`
- **Category**: A05:2025 Injection
- **Description**: [What was found]
- **Risk**: [What could happen]
- **Remediation**: [How to fix]

### High Findings (if any)
[Same format as critical]

### Medium Findings (if any)
[Same format as critical]

### Dependency Report (if applicable)
| Package | Current | Vulnerability | Severity | Fix Version |
|---------|---------|---------------|----------|-------------|
| [pkg] | [ver] | [CVE/description] | [sev] | [fix ver] |

### Secrets Report (if applicable)
| File | Line | Type | Status |
|------|------|------|--------|
| [file] | [line] | [type] | LEAKED / FALSE POSITIVE |

### Recommendations
1. [Prioritized action items]
2. [...]
```

---

## Severity Definitions

| Severity | Criteria | Action |
|----------|----------|--------|
| **CRITICAL** | Exploitable vulnerability, data breach risk | Block PR, fix immediately |
| **HIGH** | Security weakness, likely exploitable | Fix before merge |
| **MEDIUM** | Defense-in-depth issue, potential risk | Fix in current sprint |
| **LOW** | Best practice improvement, hardening | Track for future |

---

## Integration

After `/security-audit`:
- Run `/review` for full code review (includes security findings)
- Run `/preflight` for complete pre-PR validation
- Use `/agent security-specialist` for interactive security guidance
- Use `/agent librarian` to capture security patterns as directives

---

## Error Handling & Recovery

### Cannot Determine Audit Scope

If git base detection fails or no remote base exists, show:

```markdown
⚠️ I couldn't resolve a diff against the base branch for scoping.

Recovery options:
1. Audit local changes only (`git diff --name-only`)
2. Provide a file/folder target explicitly (`/security-audit path/to/file`)
3. Fetch remotes and retry when `origin/main|master|develop` is available
```

### Dependency Audit Tools Unavailable

If `npm audit`, `pip-audit`, etc. are not available, show:

```markdown
⚠️ No dependency audit tool detected.

Recovery options:
1. Install or enable an audit tool (`pip install pip-audit`, `brew install bundler-audit`, or use your OS package manager)
2. Set up Dependabot or Snyk for automated scanning
3. Run `/security-audit --secrets` for secrets scan only (no deps needed)
```

### No Security Patterns Available

If security patterns or specialist agent are not generated, show:

```markdown
⚠️ Security specialist or patterns not available.

Recovery options:
1. Run `/init` to generate security specialist (detected from project tools)
2. Continue with built-in OWASP checks (default patterns in this skill)
3. Create security patterns manually at `.claude/knowledge/patterns/security-patterns.md`
```
