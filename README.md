# GEN — AI-Powered Academic Exam Platform

Generate custom exams on any topic using AI, practice with instant grading, and explore exams created by others. Built for learners, educators, and autodidacts.

To run this application first:

- **Custom Exam Generation** — Generate rigorous, multi-format exams (Multiple Choice, True/False) on any subject via Groq AI
- **Document Upload** — Use PDF, PPTX, or DOCX files as source material for exam generation
- **Two Practice Modes**
  - *Instant Feedback* — Validates answers immediately with step-by-step proofs and on-demand AI explanations
  - *Exam Mode* — Timed, silent answering with solutions hidden until submission, followed by a diagnostic report
- **AI Tutor Explanations** — Deep-dive explanations for wrong answers
- **Anonymous Usage** — Start practicing instantly with zero friction; link to an email account later
- **Public Exam Discovery** — Browse and practice exams published by other users
- **Performance Tracking** — Historical attempts, score improvements, and mastery levels per question
- **Dark & Light Themes** — Toggle between Dark Charcoal and Pure White themes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) |
| UI | React 19, [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Auth | [Better Auth](https://www.better-auth.com/) (anonymous + email/password) |
| Database | Cloudflare D1 (SQLite) via [Drizzle ORM](https://orm.drizzle.team/) |
| Storage | Cloudflare R2 (document uploads) |
| AI | Groq API (exam generation & explanations) |
| Validation | [Zod](https://zod.dev/) |
| Linting | [Biome](https://biomejs.dev/) |
| Deployment | [Cloudflare Workers](https://developers.cloudflare.com/workers/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- A [Groq API key](https://console.groq.com/)

### Install & Run

```bash
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:3000`.

### Environment Variables

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
BETTER_AUTH_SECRET=your_auth_secret
```

Generate a Better Auth secret:

```bash
pnpm dlx @better-auth/cli secret
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Build for production |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |
| `pnpm check` | Lint + format check |
| `pnpm test` | Run tests with Vitest |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |

## Database

The project uses Cloudflare D1 in production and local SQLite for development.

```bash
pnpm db:generate   # Generate Drizzle migrations
pnpm db:migrate    # Run migrations
pnpm db:push       # Push schema changes
pnpm db:studio     # Open Drizzle Studio
```

## Deployment

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Set secrets: `wrangler secret put GROQ_API_KEY` and `wrangler secret put BETTER_AUTH_SECRET`
4. Deploy: `pnpm deploy`

The `wrangler.jsonc` configures D1, R2, and Queue bindings.

## Project Structure

```
src/
├── components/       # UI components (AuthModal, Sidebar, TopHeader, etc.)
├── db/               # Database connection and Drizzle schema
├── lib/              # Auth, utilities, document processing, rate limiting
├── routes/           # File-based routes (TanStack Router)
├── stores/           # Zustand stores (exam session, performance, user, nav)
└── integrations/     # TanStack Query setup
```

## License

All rights reserved.
