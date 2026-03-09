# Security Patterns

> Auto-generated security pattern file for {{PROJECT_NAME}}
> Standard: OWASP Top 10 (2025)
> Generated: {{GENERATED_DATE}}

## Key Rules

### Input Validation
- Validate ALL user input at system boundaries
- Use allowlists over denylists (accept known-good, not block known-bad)
- Validate data type, length, range, and format
- Reject invalid input early — don't try to sanitize and use
- Server-side validation is mandatory; client-side is optional UX

### Output Encoding
- Encode output based on context (HTML, JavaScript, URL, CSS)
- Use framework auto-escaping (Vue `{{ "{{" }}{{ "}}" }}`, Django `|escape`, React JSX)
- Never insert user data into raw HTML without sanitization
- Sanitize with DOMPurify or equivalent before rendering raw HTML

### Authentication
- Use established libraries — never roll your own auth
- Hash passwords with bcrypt, scrypt, or argon2 (cost factor >= 10)
- Enforce strong password policies (min 8 chars, no common passwords)
- Implement account lockout after repeated failures
- Use secure session management (HttpOnly, Secure, SameSite cookies)

### Authorization
- Check authorization on every request (server-side)
- Use role-based or attribute-based access control
- Principle of least privilege — deny by default
- Validate object ownership (prevent IDOR)
- Never rely on client-side authorization checks alone

### Secrets Management
- Store secrets in environment variables or a secret manager
- Never commit secrets to version control
- Rotate secrets regularly
- Use `.env.example` with placeholder values (not real secrets)
- Add secret file patterns to `.gitignore`

### API Security
- Use HTTPS everywhere (no HTTP fallback)
- Implement rate limiting on all public endpoints
- Validate Content-Type headers
- Use CORS with specific allowed origins
- Add security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)

## OWASP Top 10 (2025) Quick Reference

| Code | Category | Key Prevention |
|------|----------|----------------|
| A01 | Broken Access Control | Server-side authz on every request, CORS config, SSRF prevention |
| A02 | Security Misconfiguration | No defaults, disable debug, security headers, least privilege |
| A03 | Software Supply Chain Failures | Lock files, audit deps, SRI, verify integrity |
| A04 | Cryptographic Failures | Strong algorithms, no hardcoded secrets, TLS everywhere |
| A05 | Injection | Parameterized queries, output encoding, no eval with user input |
| A06 | Insecure Design | Rate limiting, threat modeling, business logic validation |
| A07 | Authentication Failures | MFA, session management, credential stuffing protection |
| A08 | Software or Data Integrity Failures | Signed updates, safe deserialization, CI/CD security |
| A09 | Security Logging & Alerting Failures | Log auth events, no PII in logs, alerting on anomalies |
| A10 | Mishandling of Exceptional Conditions | Proper error handling, resource cleanup, graceful degradation |

## Anti-Patterns

| I See | I Do | Severity |
|-------|------|----------|
| SQL string concatenation / f-string queries | Use parameterized queries or ORM | CRITICAL |
| `eval()` / `exec()` with user input | Use safe alternatives (JSON.parse, AST parsing) | CRITICAL |
| Hardcoded credentials in source code | Move to environment variables | CRITICAL |
| `v-html` / `dangerouslySetInnerHTML` with user data | Sanitize with DOMPurify first | CRITICAL |
| `innerHTML` assignment with user data | Use `textContent` or sanitize | CRITICAL |
| Shell command execution with user input | Use parameterized APIs, escape/validate input | CRITICAL |
| MD5/SHA1 for password hashing | Use bcrypt/argon2 with appropriate cost | HIGH |
| Missing CSRF tokens on forms/state-changing endpoints | Add framework CSRF protection | HIGH |
| Wildcard CORS (`Access-Control-Allow-Origin: *`) | Restrict to specific origins | HIGH |
| Missing rate limiting on auth endpoints | Add rate limiting middleware | HIGH |
| JWT stored in localStorage | Use HttpOnly cookies instead | HIGH |
| Sensitive data in URL parameters | Move to request body or headers | MEDIUM |
| Verbose error messages exposing internals | Return generic errors, log details server-side | MEDIUM |
| Missing Content-Security-Policy header | Configure CSP to prevent XSS | MEDIUM |
| Debug mode enabled in production config | Disable debug mode in production | MEDIUM |
| Unhandled exceptions crashing the process | Add error boundaries, graceful shutdown | MEDIUM |
| Unverified third-party dependency | Audit before adoption, check lock file integrity | MEDIUM |

<!--
Generator note:
- IS_FRONTEND is true when one or more frontend frameworks/tools are detected.
- IS_BACKEND is true when one or more backend frameworks/languages are detected.
- In full-stack or monorepo projects, both flags can be true and both sections should render.
-->
{{#if IS_FRONTEND}}
## Frontend Security

### XSS Prevention
- Use framework auto-escaping for all rendered content
- Never use `v-html`, `dangerouslySetInnerHTML`, or `innerHTML` with user data
- Sanitize user content with DOMPurify before any raw HTML rendering
- Validate URL bindings (`:href`, `:src`) — block `javascript:` protocol
- Configure Content-Security-Policy to prevent inline scripts

### Client-Side Storage
- Never store sensitive data in localStorage or sessionStorage
- Use HttpOnly cookies for auth tokens
- Clear sensitive data on logout
- Be cautious with IndexedDB for sensitive data

### Third-Party Scripts (A03: Supply Chain)
- Use Subresource Integrity (SRI) for CDN-loaded scripts
- Audit third-party dependencies regularly
- Minimize third-party script inclusion
- Use CSP to control allowed script sources
- Pin CDN versions — never use `latest` tags
{{/if}}

{{#if IS_BACKEND}}
## Backend Security

### Database Security
- Always use parameterized queries / prepared statements
- Use ORM-provided query builders (never raw SQL with string interpolation)
- Apply principle of least privilege to database users
- Enable query logging in development for inspection
- Escape special characters in LIKE clauses

### File Upload Security
- Validate file type by content (magic bytes), not just extension
- Limit file size
- Store uploads outside web root
- Generate random filenames — never use user-provided names
- Scan for malware if accepting public uploads

### Session Security
- Generate cryptographically random session IDs
- Regenerate session ID after authentication
- Set session expiration (idle + absolute timeout)
- Invalidate sessions on logout (server-side)
- Use Secure, HttpOnly, SameSite cookie attributes

### Error Handling (A10: Exceptional Conditions)
- Never expose stack traces to end users
- Log errors with context (user ID, request ID, timestamp)
- Return generic error messages to clients
- Don't leak information through error differences (e.g., "user not found" vs "wrong password")
- Ensure resource cleanup in all error paths (DB connections, file handles)
- Implement circuit breakers for external service failures
{{/if}}

## Dependency Security (A03: Supply Chain)

### Package Management
- Keep dependencies updated (automated with Dependabot, Renovate, or Snyk)
- Review changelog before major version upgrades
- Use lock files (`package-lock.json`, `poetry.lock`, etc.)
- Run `npm audit` / `pip-audit` / `cargo audit` regularly
- Pin dependency versions in production

### Supply Chain Integrity
- Verify package authenticity (checksums, signatures)
- Prefer well-maintained packages with active communities
- Audit new dependencies before adding
- Monitor for security advisories
- Watch for typosquatting (e.g., `lodash` vs `1odash`)
- Use SRI for CDN-loaded resources

## Security Testing Checklist

- [ ] Input validation on all user-facing endpoints
- [ ] Output encoding on all rendered user content
- [ ] No hardcoded secrets in source code
- [ ] Authentication endpoints rate-limited
- [ ] Authorization checked server-side on every request
- [ ] HTTPS enforced (no mixed content)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] CSRF protection on state-changing operations
- [ ] No SQL injection vectors (parameterized queries only)
- [ ] No XSS vectors (auto-escaping, sanitization)
- [ ] Dependency audit clean (no known vulnerabilities)
- [ ] Error messages don't leak internals
- [ ] Lock files committed and up to date
- [ ] Error handling covers all exceptional conditions

## See Also

- [OWASP Top 10 (2025)](https://owasp.org/Top10/2025/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
