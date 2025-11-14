# Employee Management Information System (EMIS)

A cross-platform desktop application built with Electron, React, Express, and PostgreSQL.

## Features

- 🔐 Secure JWT-based authentication with role-based access control
- 👥 Employee information management
- 💬 Feedback collection and analysis system
- 📊 Analytics dashboard with real-time visualizations
- 🎨 Modern, responsive UI with dark/light theme support
- 🔒 Admin controls for system management

## Tech Stack

- **Frontend**: React + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express (embedded in Electron)
- **Database**: PostgreSQL with Prisma ORM
- **Desktop**: Electron
- **Charts**: Recharts
- **Authentication**: JWT + bcrypt

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```bash
# Create a PostgreSQL database named 'emis_db'
createdb emis_db
```

3. Configure environment variables:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and update with your PostgreSQL credentials:
# DATABASE_URL="postgresql://username:password@localhost:5432/emis_db?schema=public"
```

4. Run Prisma migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. Seed the database with initial data:
```bash
node prisma/seed.js
```

### Development

Run the application in development mode:
```bash
npm run dev
```

### Building

Build the application for your platform:
```bash
# Build for all platforms
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Default Login Credentials

After seeding the database, use these credentials:

- **Admin**: admin@emis.com / admin123
- **HR**: hr@emis.com / hr123
- **Employee**: employee@emis.com / emp123

## Project Structure

```
emis-electron/
├── electron/          # Electron main process and API server
├── prisma/            # Database schema and migrations
├── src/              # React application
│   ├── components/   # Reusable UI components
│   ├── pages/        # Application pages
│   ├── lib/          # Utility functions
│   └── App.jsx       # Main React component
├── public/           # Static assets
└── package.json      # Dependencies and scripts
```

## License

MIT
