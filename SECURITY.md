# Security Policy

## Supported Versions

The following versions of AutoDevStack are currently receiving security updates:

| Version | Supported          |
|---------|--------------------|
| 1.x     | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in AutoDevStack, please **do not** open a public GitHub issue.

### How to Report

1. **GitHub Private Advisory** (preferred): Use [GitHub's private vulnerability reporting](https://github.com/thomasbontrager/AutoDevStack/security/advisories/new) to submit a report confidentially.
2. **Direct contact**: Reach out to the maintainer via GitHub ([@thomasbontrager](https://github.com/thomasbontrager)) with details of the vulnerability.

### What to Include

Please include as much of the following information as possible:

- Type of vulnerability (e.g., path traversal, command injection, arbitrary file write)
- Location of the vulnerable code (file path and line number if known)
- Steps to reproduce the issue
- Potential impact and attack scenario
- Any suggested fix or mitigation

### Response Timeline

- **Acknowledgement**: Within 48 hours of receiving your report
- **Initial assessment**: Within 5 business days
- **Resolution**: We aim to release a fix within 30 days for critical issues

### Disclosure Policy

We follow coordinated disclosure. Once a fix is available, we will:

1. Release a patched version
2. Publish a GitHub Security Advisory
3. Credit the reporter (unless they prefer to remain anonymous)

## Security Best Practices for Users

AutoDevStack scaffolds project files from templates. To keep your projects secure:

- Always review generated files before deploying to production
- Keep dependencies in your scaffolded project up to date
- Never commit secrets or API keys — use `.env` files (which are gitignored by the templates)
- Run `npm audit` in your generated project periodically

## Scope

The following are **in scope** for security reports:

- Path traversal or arbitrary file write in the CLI
- Malicious code execution via template content
- Dependency vulnerabilities in AutoDevStack's own `package.json`

The following are **out of scope**:

- Vulnerabilities in dependencies of scaffolded project templates (report those upstream)
- Issues requiring physical access to the machine

Thank you for helping keep AutoDevStack and its users safe! 🔒
