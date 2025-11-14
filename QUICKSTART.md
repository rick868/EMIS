# 🚀 EMIS Quick Start Guide

Get your Employee Management System up and running in minutes!

---

## ⚡ Express Setup (5 Minutes)

### Step 1: Install Dependencies (2 min)
```bash
cd /home/felix/EMS
npm install
```

### Step 2: Set Up PostgreSQL (1 min)
```bash
# Create database
createdb emis_db

# Or using psql:
psql -U postgres
CREATE DATABASE emis_db;
\q
```

### Step 3: Configure Environment (30 sec)
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# Replace 'username' and 'password' with your actual credentials
nano .env  # or use any text editor
```

Example `.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/emis_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
API_PORT=3001
```

### Step 4: Initialize Database (1 min)
```bash
# Run migrations
npx prisma migrate dev --name init

# Seed with sample data
node prisma/seed.js
```

### Step 5: Start Application (30 sec)
```bash
npm run dev
```

**Done!** The Electron app should launch automatically. 🎉

---

## 🔐 Login Credentials

Use these credentials to explore different role capabilities:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@emis.com | admin123 | Full system access |
| **HR** | hr@emis.com | hr123 | Employee & feedback management |
| **Employee** | employee@emis.com | emp123 | Basic access |

---

## 🎯 What to Try First

### As Admin (admin@emis.com):
1. **Dashboard** - View system statistics
2. **Employees** - Add, edit, or delete employees
3. **Analytics** - Explore charts and data visualizations
4. **Settings** - Create new users, view system logs
5. **Feedback** - Review employee feedback

### As HR (hr@emis.com):
1. **Employees** - View and search employees
2. **Feedback** - Review and filter feedback by category
3. **Analytics** - Check department metrics
4. **Submit Feedback** - Test the feedback system

### As Employee (employee@emis.com):
1. **Dashboard** - View your profile information
2. **Employees** - Browse employee directory
3. **Feedback** - Submit your feedback

---

## 📱 Key Features to Explore

### 1. Employee Management (Admin Only)
- Click **"Employees"** in sidebar
- Try **"Add Employee"** button
- Use **search** to find employees
- Filter by **department**
- Edit or delete existing employees

### 2. Feedback System
- Click **"Feedback"** in sidebar
- Submit new feedback via **"Submit Feedback"** button
- Admin/HR: View all feedback, filter by category
- Switch between **"All Feedback"** and **"By Category"** tabs

### 3. Analytics Dashboard (Admin/HR)
- Click **"Analytics"** in sidebar
- Explore 4 interactive charts:
  - Employees by Department
  - Feedback by Category
  - Monthly Feedback Trends
  - Average Salary by Department
- Hover over charts for details

### 4. User Management (Admin Only)
- Go to **Settings** → **User Management** tab
- Create new users with different roles
- View all system users and their roles

### 5. System Logs (Admin Only)
- Go to **Settings** → **System Logs** tab
- Monitor all system activities
- Track user logins and data changes

### 6. Dark Mode Toggle
- Click the **moon/sun icon** in the header
- Interface switches between light and dark themes

---

## 🔧 Common Commands

```bash
# Development
npm run dev                    # Start development server

# Database
npx prisma studio             # Open database GUI
npx prisma migrate reset      # Reset database
node prisma/seed.js           # Re-seed data

# Production Build
npm run build                 # Build for all platforms
npm run build:linux           # Build for Linux only
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in .env
API_PORT=3002
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
sudo service postgresql status
sudo service postgresql start

# Test connection
psql -U postgres -d emis_db
```

### Prisma Client Not Generated
```bash
npx prisma generate
npm run dev
```

### Module Not Found
```bash
rm -rf node_modules
npm install
```

---

## 📚 Additional Resources

- **Full Installation Guide**: See `INSTALLATION.md`
- **Project Summary**: See `PROJECT_SUMMARY.md`
- **API Documentation**: Check `/electron/api/server.js`
- **Database Schema**: Review `prisma/schema.prisma`

---

## 💡 Pro Tips

1. **Prisma Studio** - Use `npx prisma studio` to view/edit database in browser
2. **DevTools** - Press `Ctrl+Shift+I` to open Chrome DevTools in Electron
3. **Hot Reload** - Frontend changes reload automatically
4. **API Testing** - API runs on `http://localhost:3001`
5. **Logs** - Check terminal for API logs and errors

---

## 🎨 Customize Your Setup

### Change Database Name
Edit `.env`:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/your_db_name?schema=public"
```

### Change API Port
Edit `.env`:
```env
API_PORT=3002
```

### Modify Seed Data
Edit `prisma/seed.js` to add your own sample data.

---

## ✅ Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `emis_db` created
- [ ] `.env` file configured with correct credentials
- [ ] Dependencies installed (`npm install`)
- [ ] Migrations run successfully
- [ ] Database seeded with sample data
- [ ] Development server starts without errors
- [ ] Electron window opens
- [ ] Can login with demo credentials
- [ ] Can navigate between pages
- [ ] Can perform CRUD operations (as Admin)

---

## 🆘 Need Help?

1. Check error messages in terminal
2. Verify PostgreSQL is running
3. Confirm `.env` configuration
4. Review `INSTALLATION.md` for detailed steps
5. Check `PROJECT_SUMMARY.md` for feature details

---

**You're all set! Enjoy managing your employees with EMIS! 🎉**

---

**Quick Commands Cheatsheet:**
```bash
npm run dev          # Start app
npx prisma studio    # View database
npm run build        # Build for production
```
