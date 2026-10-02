# Contributing to NammaBus AI

## Development Workflow
All changes must follow our engineering process:

1. **Understand Requirement**: Review `PRD.md` and relevant ADRs.
2. **Modular Design**: Place code inside domain modules (`modules/<feature>/`).
3. **Validation & Error Handling**: Validate inputs with DTOs, use `AppException` for business exceptions.
4. **Structured Logging**: Use `nestjs-pino` logger, never log passwords, tokens, or personal identifiers.
5. **Quality Checks**:
   - `npm run format`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:e2e`

## Branching & Commits
- Branches: `feature/<name>`, `bugfix/<name>`, `chore/<name>`
- Commits: Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
