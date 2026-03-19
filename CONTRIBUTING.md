# Contributing to Tideform

Thank you for considering contributing to Tideform! Every contribution matters — whether it's a bug fix, a new feature, a translation, or an improvement to documentation.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tideform.git
   cd tideform
   ```
3. **Install** dependencies:
   ```bash
   cp .env.example .env
   npm install
   npx prisma db push
   ```
4. **Start** the dev server:
   ```bash
   npm run dev
   ```
5. **Create a branch** for your change:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Guidelines

### Code Style
- We use TypeScript throughout. Enable strict mode.
- Follow the existing patterns in the codebase.
- Use `npm run lint` to check for issues.

### Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Formatting (no code change)
- `refactor:` — Code restructure
- `test:` — Adding tests
- `chore:` — Maintenance

### Pull Requests
1. Keep PRs focused on a single change
2. Update documentation if your change affects it
3. Add tests for new features when possible
4. Ensure `npm run lint` passes
5. Write a clear PR description explaining what and why

### Database Changes
If you modify `prisma/schema.prisma`:
```bash
npx prisma migrate dev --name describe-your-change
```

## Project Structure

- `src/app/api/` — API routes (backend)
- `src/app/(dashboard)/` — Authenticated pages
- `src/app/(public)/` — Public form pages
- `src/components/` — React components
- `src/lib/` — Core utilities, types, validation
- `prisma/` — Database schema and migrations

## Need Help?

- Open a [Discussion](https://github.com/tideform/tideform/discussions) for questions
- Check existing [Issues](https://github.com/tideform/tideform/issues) before creating new ones
- Tag your issue with appropriate labels

## Code of Conduct

Be kind, be respectful, be constructive. We're building something together.
