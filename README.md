<p align="center">
  <img src="public/logo.svg" width="60" alt="Tideform" />
</p>

<h1 align="center">Tideform</h1>

<p align="center">
  <b>Open-source, AI-native form builder.</b><br/>
  The privacy-first alternative to Typeform.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#self-hosting">Self-Host</a> ·
  <a href="#api">API</a> ·
  <a href="#contributing">Contributing</a> ·
  <a href="https://tideform.dev">Website</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/self--hosted-✓-success.svg" alt="Self-Hosted" />
</p>

---

## Why Tideform?

| | Typeform | Google Forms | Tideform |
|---|---|---|---|
| **Price** | $30-100/mo | Free | **Free forever** |
| **AI Generation** | ❌ | ❌ | **✅ Describe → Build** |
| **Data Privacy** | Their servers | Google's servers | **Your servers** |
| **Self-Hosted** | ❌ | ❌ | **✅ Docker one-liner** |
| **Open Source** | ❌ | ❌ | **✅ MIT License** |
| **Beautiful UX** | ✅ | ❌ | **✅ Conversational** |
| **RTL Support** | Partial | Partial | **✅ Full** |
| **API** | Paid tier | Limited | **✅ Full REST API** |

## Quick Start

### Docker (recommended)

```bash
docker run -p 3000:3000 tideform/tideform
```

Open [http://localhost:3000](http://localhost:3000) and create your first form.

### Docker Compose

```bash
curl -O https://raw.githubusercontent.com/tideform/tideform/main/docker-compose.yml
docker compose up -d
```

### From Source

```bash
git clone https://github.com/tideform/tideform.git
cd tideform
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

## Features

### ✦ AI Form Generation
Describe your form in plain English. Tideform generates the fields, labels, validation, and conditional logic. Powered by Claude (or works offline with smart templates).

```
"Create a customer feedback survey for a SaaS product with NPS score"
→ 6 fields generated in 2 seconds
```

### 🔒 Privacy-First
Your data never leaves your infrastructure. Self-host on any server, VPS, or Raspberry Pi. No telemetry. No tracking. No data harvesting. GDPR-compliant by architecture.

### 🎨 Beautiful Conversational UI
One-question-at-a-time experience with smooth transitions, keyboard navigation, and progress tracking. 6 built-in themes including dark mode and a light "Paper" theme.

### 📊 Built-In Analytics
Response dashboard with completion rates, field-level statistics, NPS tracking, submission timelines, and CSV export. No third-party analytics needed.

### 🔗 Developer API
Full REST API for everything — create forms, submit responses, fetch analytics. Webhook support for real-time integrations with Slack, Zapier, n8n, and more.

### 🌍 RTL & i18n Ready
Full right-to-left layout support for Arabic, Hebrew, Farsi, and Urdu. Interface translations welcome via PR.

## Architecture

```
tideform/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # REST API routes
│   │   │   ├── forms/        # Form CRUD
│   │   │   ├── submissions/  # Response collection
│   │   │   ├── ai/           # AI generation endpoint
│   │   │   └── auth/         # Authentication
│   │   ├── (dashboard)/      # Authenticated pages
│   │   └── (public)/         # Public form renderer
│   ├── components/           # React components
│   │   ├── builder/          # Form builder UI
│   │   ├── preview/          # Form renderer
│   │   ├── dashboard/        # Analytics & management
│   │   └── ui/               # Shared UI primitives
│   └── lib/                  # Core logic
│       ├── db.ts             # Prisma client
│       ├── auth.ts           # NextAuth config
│       ├── ai.ts             # AI generation service
│       ├── types.ts          # TypeScript definitions
│       ├── validations.ts    # Zod schemas
│       └── utils.ts          # Helpers
├── prisma/
│   └── schema.prisma         # Database schema
├── docker/                   # Docker configuration
├── Dockerfile                # Multi-stage production build
└── docker-compose.yml        # One-command deployment
```

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org) (App Router)
- **Database**: SQLite (dev) / PostgreSQL (production) via [Prisma](https://prisma.io)
- **Auth**: [NextAuth.js](https://next-auth.js.org) (credentials + OAuth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **AI**: [Anthropic Claude](https://anthropic.com) (optional, works without it)
- **Validation**: [Zod](https://zod.dev)
- **Charts**: [Recharts](https://recharts.org)
- **Deployment**: Docker, Vercel, any Node.js host

## API

### Create a form

```bash
curl -X POST http://localhost:3000/api/forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Feedback Form",
    "fields": [
      { "type": "rating", "label": "How was your experience?", "required": true },
      { "type": "long_text", "label": "Any comments?" }
    ]
  }'
```

### Submit a response

```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "formSlug": "feedback-form-abc123",
    "data": {
      "f_rating": 5,
      "f_comments": "Love it!"
    }
  }'
```

### AI-generate a form

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "prompt": "job application for a startup" }'
```

Full API documentation: [docs.tideform.dev](https://docs.tideform.dev) (coming soon)

## Self-Hosting

### Minimum Requirements
- 1 CPU core, 512MB RAM
- Docker 20+ or Node.js 18+
- 100MB disk space (+ data)

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `file:./dev.db` | Database connection string |
| `NEXTAUTH_SECRET` | Yes (prod) | Auto-generated | Session encryption key |
| `NEXTAUTH_URL` | Yes (prod) | `http://localhost:3000` | Your app's public URL |
| `ANTHROPIC_API_KEY` | No | — | Enables AI form generation |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth login |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth login |

### PostgreSQL (production)

```yaml
# docker-compose.yml
services:
  tideform:
    image: tideform/tideform:latest
    environment:
      - DATABASE_PROVIDER=postgresql
      - DATABASE_URL=postgresql://tideform:secret@postgres:5432/tideform
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: tideform
      POSTGRES_USER: tideform
      POSTGRES_PASSWORD: secret

volumes:
  pgdata:
```

## Roadmap

- [x] Core form builder with drag-and-drop
- [x] AI-powered form generation
- [x] Conversational form renderer
- [x] Response collection & analytics
- [x] Docker deployment
- [x] Email/password + OAuth authentication
- [ ] Embed widget (`<script>` tag + iframe)
- [ ] Conditional logic / field branching
- [ ] File upload support
- [ ] CSV/Excel export
- [ ] Webhook integrations
- [ ] Email notifications on submission
- [ ] Custom thank-you pages
- [ ] Team collaboration
- [ ] Form templates gallery
- [ ] Stripe payment fields
- [ ] Multi-language form UI
- [ ] Accessibility audit (WCAG 2.1 AA)

## Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/tideform.git
cd tideform

# Install and setup
cp .env.example .env
npm install
npx prisma db push

# Start development
npm run dev

# Open http://localhost:3000
```

### Ways to Contribute
- 🐛 **Bug reports** — Found something broken? [Open an issue](https://github.com/tideform/tideform/issues)
- 💡 **Feature requests** — Have an idea? [Start a discussion](https://github.com/tideform/tideform/discussions)
- 🌍 **Translations** — Help us reach more people
- 📖 **Documentation** — Improve guides, fix typos
- 🎨 **Themes** — Design new form themes
- 🧪 **Tests** — Increase coverage

## License

MIT — free for personal and commercial use. See [LICENSE](LICENSE).

---

<p align="center">
  <b>If Tideform helps you, consider giving it a ⭐ on GitHub.</b><br/>
  It helps others discover the project.
</p>
