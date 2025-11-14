#!/bin/bash

echo "🚀 EMIS Setup Script"
echo "===================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed or not in PATH."
    echo "   Please install PostgreSQL v14 or higher and ensure it's running."
else
    echo "✅ PostgreSQL is installed"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and update the DATABASE_URL with your PostgreSQL credentials"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📊 Database Setup Instructions:"
echo "1. Create a PostgreSQL database:"
echo "   createdb emis_db"
echo ""
echo "2. Update the DATABASE_URL in your .env file with your credentials"
echo ""
echo "3. Run Prisma migrations:"
echo "   npx prisma migrate dev --name init"
echo ""
echo "4. Seed the database with sample data:"
echo "   node prisma/seed.js"
echo ""
echo "5. Start the development server:"
echo "   npm run dev"
echo ""
echo "✨ Setup script completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Configure your .env file"
echo "   2. Set up the database (steps above)"
echo "   3. Run: npm run dev"
echo ""
