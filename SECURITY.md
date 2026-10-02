# Security Policy

## Supported Versions
Only the latest version of the API running on the primary development branch is actively maintained for security patches.

## Reporting a Vulnerability
If you discover a security vulnerability in NammaBus AI:
1. Do **NOT** disclose the vulnerability publicly in issues or pull requests.
2. Report the vulnerability privately to the project security leads or transport administration.
3. Include detailed steps to reproduce, affected endpoints, and potential impact.

## Development Security Rules
- Never commit `.env` or raw credentials to git.
- Always use parameterized queries / Prisma ORM to prevent SQL injection.
- Passwords must be hashed using bcrypt or argon2 with adequate work factors.
- Sanitize and validate all incoming inputs using `ValidationPipe`.
- Helmet HTTP security headers are enabled by default.
