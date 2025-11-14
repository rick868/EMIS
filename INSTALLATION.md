# EMIS Installation Guide

Complete step-by-step guide to set up the Employee Management Information System.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** v14 or higher ([Download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js)

## Installation Steps

### 1. Install Dependencies

Run the automated setup script:

```bash
chmod +x setup.sh
./setup.sh
```

Or manually install:

```bash
npm install
```

### 2. Configure PostgreSQL Database

#### Create Database

```bash
# Using psql command line
createdb emis_db

# Or using SQL
psql -U postgres
CREATE DATABASE emis_db;
\q
```

#### Configure Connection

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and update the `DATABASE_URL`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/emis_db?schema=public"
```

Replace:
- `username` - Your PostgreSQL username (usually `postgres`)
- `password` - Your PostgreSQL password
- `localhost` - Your database host (use `localhost` for local development)
- `5432` - PostgreSQL port (default is 5432)

3. Set JWT secret (keep this secret in production):
```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

### 3. Initialize Database

Run Prisma migrations to create tables:

```bash
npx prisma migrate dev --name init
```

This will:
- Create all necessary tables (users, employees, feedback, logs)
- Set up relationships and constraints
- Generate Prisma Client

### 4. Seed Database

Populate the database with sample data:

```bash
node prisma/seed.js
```

This creates:
- 3 user accounts (Admin, HR, Employee)
- 11 employee records
- Sample feedback entries
- Activity logs

**Default Login Credentials:**
- **Admin**: admin@emis.com / admin123
- **HR**: hr@emis.com / hr123
- **Employee**: employee@emis.com / emp123

### 5. Start Development Server

```bash
npm run dev
```

This command:
- Starts the Vite development server (React frontend) on port 5173
- Starts the Express API server on port 3001
- Launches Electron with hot reload

The application should open automatically. If not, it will be available at `http://localhost:5173`

## Building for Production

### Build for All Platforms

```bash
npm run build
```

### Build for Specific Platforms

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

The built applications will be in the `dist-electron` folder.

## Troubleshooting

### Database Connection Errors

**Error**: `Can't reach database server`

**Solution**:
1. Ensure PostgreSQL is running:
   ```bash
   # Linux/macOS
   sudo service postgresql status
   sudo service postgresql start
   
   # macOS (Homebrew)
   brew services start postgresql
   
   # Windows
   Check Services app for PostgreSQL service
   ```

2. Verify your DATABASE_URL in `.env`
3. Test connection:
   ```bash
   psql -U postgres -d emis_db
   ```

### Prisma Migration Errors

**Error**: `Migration failed`

**Solution**:
1. Reset the database:
   ```bash
   npx prisma migrate reset
   ```
2. Run migrations again:
   ```bash
   npx prisma migrate dev --name init
   ```

### Port Already in Use

**Error**: `Port 3001 already in use`

**Solution**:
1. Find and kill the process:
   ```bash
   # Linux/macOS
   lsof -ti:3001 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```
2. Or change the port in `.env`:
   ```env
   API_PORT=3002
   ```

### Module Not Found Errors

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npm install
npx prisma generate
```

### Electron Won't Start

**Solution**:
1. Clear cache:
   ```bash
   rm -rf node_modules dist dist-electron .vite
   npm install
   ```
2. Rebuild:
   ```bash
   npm run dev
   ```

## Database Management

### View Database Contents

```bash
npx prisma studio
```

Opens Prisma Studio in your browser at `http://localhost:5555`

### Reset Database

```bash
npx prisma migrate reset
node prisma/seed.js
```

### Create New Migration

```bash
npx prisma migrate dev --name migration_name
```

### Update Prisma Client

After changing `schema.prisma`:
```bash
npx prisma generate
```

## Development Tips

### Hot Reload

The development setup includes hot reload:
- Frontend changes reload automatically
- Backend changes require manual restart
- Press `Ctrl+R` in Electron to reload

### Debug Mode

Enable Chrome DevTools in Electron:
- Development mode: Opens automatically
- Production mode: Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)

### API Testing

Test API endpoints directly:
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@emis.com","password":"admin123"}'

# Get employees (requires token)
curl http://localhost:3001/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Project Structure

```
emis-electron/
├── electron/           # Electron main process
│   ├── main.js        # Electron entry point
│   ├── preload.js     # Preload script
│   └── api/           # Express API server
│       └── server.js  # API routes and logic
├── prisma/            # Database
│   ├── schema.prisma  # Database schema
│   └── seed.js        # Seed data script
├── src/               # React application
│   ├── components/    # UI components
│   │   └── ui/       # shadcn/ui components
│   ├── pages/        # Application pages
│   ├── lib/          # Utilities
│   ├── App.jsx       # Main React component
│   └── main.jsx      # React entry point
├── public/           # Static assets
├── package.json      # Dependencies
└── vite.config.js    # Vite configuration
```

## Security Notes

### Production Deployment

Before deploying to production:

1. **Change JWT Secret**:
   ```env
   JWT_SECRET="generate-a-strong-random-secret-here"
   ```

2. **Use Strong Passwords**: Change default user passwords

3. **Environment Variables**: Never commit `.env` file

4. **Database Security**: 
   - Use strong PostgreSQL passwords
   - Restrict database access
   - Enable SSL connections

5. **HTTPS**: Use HTTPS in production

## Support

For issues and questions:
- Check the README.md
- Review error logs in the terminal
- Check Prisma logs: `npx prisma studio`
- Verify database connection and credentials

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure PostgreSQL
3. ✅ Set up environment variables
4. ✅ Run migrations
5. ✅ Seed database
6. ✅ Start development server
7. 🎯 Login and explore!

Your EMIS application should now be running!
