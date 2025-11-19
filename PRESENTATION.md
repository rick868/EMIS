# Employee Management System (EMS)

## Slide 1 — What It Is
- Desktop app (Electron + React) for Admin, HR, and Employees
- Centralizes employees, feedback, analytics, and settings

## Slide 2 — How It’s Built
- Frontend: React + Tailwind/shadcn + Recharts
- Backend: Express + Prisma + PostgreSQL (SQLite for local dev)
- Security: JWT auth, role checks, rate limiting, sanitized inputs

## Slide 3 — Highlights
- Employee directory with search, filters, CSV/PDF export
- Feedback submission/review with category management
- Settings tab for users, departments, categories, logs
- Analytics dashboard covering department mix, salaries, feedback trends

## Slide 4 — Status & Next Steps
- Done: removed hardcoded data, added toasts/validation, dark mode, keyboard shortcuts
- Pending: bulk employee actions, more analytics, soft deletes, tests/docs
- Run locally: `npm install && npm run dev`; configure `.env`, run Prisma migrate/seed

