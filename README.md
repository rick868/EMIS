# Employee Management Information System (EMIS)

EMIS is a modern Employee Management Information System built by **CoreForge Solutions (CFS)** for HR teams, people managers, and distributed organizations. It bundles a responsive React experience with an embedded Express API and ships inside an Electron shell, so the exact same build works on Windows, macOS, and Debian/Ubuntu desktops.

## What you can do with EMIS

- **Employee directory & lifecycle**  
  Create, edit, archive, and export employee profiles with department assignments, salary visibility (KSh formatting), and advanced search filters.
- **Leave & attendance management**  
  Employees apply for leave, HR/Admin approve or decline requests, and leadership can track attendance rates over rolling windows.
- **Feedback & engagement**  
  Collect categorized feedback, analyze category share, and let HR curate categories dynamically.
- **Analytics dashboards**  
  Track KPIs such as workforce distribution, feedback trends, salary averages, attendance rate, open leave tickets, and more.
- **Security & reliability**  
  Role-based access (Admin, HR, Employee), rate limiting, JWT auth, CSRF strategy, and Prisma-backed audit logging.
- **Productivity niceties**  
  Toast notifications, keyboard shortcuts, CSV/PDF exports, responsive tables/cards, dark mode persistence, and offline-friendly Electron packaging.

## Tech stack at a glance

| Layer        | Tools                                                                 |
|--------------|-----------------------------------------------------------------------|
| Desktop shell| Electron (Chromium + Node runtime)                                    |
| Frontend     | React 18, Vite, Tailwind CSS, shadcn/ui primitives, Recharts          |
| Backend API  | Express.js (served inside Electron), JWT auth, rate limiting, Nodemailer |
| Database     | PostgreSQL + Prisma ORM                                               |
| Tooling      | ESLint, Vite dev server, pnpm/npm scripts                             |

## Getting started

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local or hosted; Neon works out of the box)
- npm or pnpm

### 2. Install dependencies

```bash
git clone <repo-url>
cd EMS
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env
DATABASE_URL="postgresql://user:password@localhost:5432/emis_db?schema=public"
JWT_SECRET="set-a-strong-secret"
EMAIL_SMTP_URL="smtp://..."
```

### 4. Database migration

```bash
npx prisma migrate dev --name init        # or add_leave_support if continuing work
npx prisma generate
# (Optional) prisma/seed.js is intentionally disabled in production builds.
# Create your first admin manually (see below).
```

> **Note:** If your production database already contains data, review the Prisma warnings before running migrations and backfill the new columns (attendance, leave, employee-user links) accordingly.

### 5. Development workflow

Run the desktop app (Electron + Vite dev server):

```bash
npm run dev
```

This launches:
- `electron/main.js` (main process + embedded Express API on port 3001 by default)
- Vite dev server for the React UI (port 5173)

### 6. Production builds

```bash
npm run build          # builds renderer + bundles Electron
npm run build:win      # Windows .exe
npm run build:mac      # macOS .app / dmg
npm run build:linux    # Linux AppImage
```

Distribute the generated artifacts found under `dist/`.

## Provisioning the first admin

The automatic seed script is disabled in production deployments. Create your first admin manually using one of the following approaches:

1. **Prisma Studio**
   ```bash
   npx prisma studio
   ```
   - Add a new `User` with role `ADMIN`, email/username of your choice, and a bcrypt-hashed password.
   - Optionally create a matching `Employee` record and connect it via `userId`.

2. **SQL insert**
   ```sql
   INSERT INTO users (username, email, password_hash, role)
   VALUES ('admin', 'you@example.com', '$2b$10$...', 'ADMIN');
   ```
   Generate the bcrypt hash with `npx bcrypt-cli hash 'StrongPassword'`.

Once the first admin is created, use the EMIS UI (Settings → Users) to onboard HR and employees.

## Project structure

```
EMS/
├── electron/           # Electron entry + Express API
├── prisma/             # Prisma schema, migrations, seed scripts
├── src/                # React app (pages, components, hooks)
│   ├── components/
│   ├── pages/
│   ├── lib/
│   └── App.jsx
├── public/
└── package.json
```

## Using EMIS day-to-day

- HR/Admin log in via the Electron desktop client (or Vite dev server during development).
- Employees manage their own profiles, submit feedback, and apply for leave.
- HR/Administrators review leave requests, analyze dashboards, manage departments/categories, and export data for payroll or compliance.
- Toast notifications and keyboard shortcuts guide workflows (e.g., `Ctrl+N` to add an employee, `Ctrl+E` to export).

## Contributing & extending

- Use feature branches and run `npm run lint` before opening a pull request.
- Prisma schema changes should be accompanied by migration SQL plus any backfill scripts.
- The `IMPROVEMENT_AREAS.md` file lists prioritized enhancements (security, data management, analytics) for future contributors.

## License

MIT — feel free to adapt EMIS for your organization, and please contribute improvements back when possible. If you need enterprise support, extended modules, or white-label builds, reach out to **CoreForge Solutions (CFS)**.

## Installing EMIS on your device

### Windows (10/11)
1. Download the latest `EMIS-Setup-x.y.z.exe` from your release server.
2. Run the installer (requires standard user privileges); follow the Wizard prompts.
3. Launch EMIS from the Start Menu. The embedded API starts automatically.
4. If Windows Defender SmartScreen warns you, choose “More info” → “Run anyway” (until you sign the binary).

### macOS (Ventura+)
1. Download `EMIS-x.y.z.dmg`.
2. Double-click the DMG, drag **EMIS.app** into `/Applications`.
3. On first launch, macOS Gatekeeper may block the unsigned app; open **System Settings → Privacy & Security** and click “Open Anyway”.
4. The menu-bar icon indicates when the internal API is running.

### Linux (Ubuntu/Debian/Fedora)
1. Download `EMIS-x.y.z.AppImage` or the `.deb`/`.rpm` build if provided.
2. For AppImage:
   ```bash
   chmod +x EMIS-x.y.z.AppImage
   ./EMIS-x.y.z.AppImage
   ```
3. For `.deb`:
   ```bash
   sudo dpkg -i EMIS_x.y.z_amd64.deb
   ```
4. Launch EMIS from your applications menu; logs are stored under `~/.config/EMIS/logs`.

> **Tip:** When distributing updates, sign your binaries/notarize the macOS build so OS dialogs show your company name.
