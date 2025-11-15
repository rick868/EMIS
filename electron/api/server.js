const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const prisma = new PrismaClient();
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit login attempts to 5 per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Middleware
app.use(express.json());
app.use('/api/', limiter); // Apply rate limiting to all API routes

// CORS for Electron renderer
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// POST /api/auth/login - Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log the login
    await prisma.log.create({
      data: {
        action: 'USER_LOGIN',
        userId: user.id,
        details: `User ${user.username} logged in`,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employee: user.employee,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { employee: true },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        employee: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== EMPLOYEE ROUTES ====================

// GET /api/employees - Get all employees
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (department && department !== 'all') {
      where.department = department;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { id: 'asc' },
        include: { user: { select: { email: true, role: true } } },
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      employees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/employees/:id - Get employee by ID
app.get('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true, feedback: true },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/employees - Create employee (Admin only)
app.post('/api/employees', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, department, position, salary } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Employee name is required' });
    }
    if (!department || typeof department !== 'string' || department.trim().length === 0) {
      return res.status(400).json({ error: 'Department is required' });
    }
    if (!position || typeof position !== 'string' || position.trim().length === 0) {
      return res.status(400).json({ error: 'Position is required' });
    }
    if (salary === undefined || salary === null) {
      return res.status(400).json({ error: 'Salary is required' });
    }

    const numSalary = parseFloat(salary);
    if (isNaN(numSalary) || numSalary < 0) {
      return res.status(400).json({ error: 'Salary must be a valid positive number' });
    }

    // Sanitize inputs
    const sanitizedName = name.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '');
    const sanitizedDept = department.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '');
    const sanitizedPosition = position.trim().replace(/[<>]/g, '').replace(/javascript:/gi, '');

    const employee = await prisma.employee.create({
      data: {
        name: sanitizedName,
        department: sanitizedDept,
        position: sanitizedPosition,
        salary: numSalary,
      },
    });

    await prisma.log.create({
      data: {
        action: 'EMPLOYEE_ADDED',
        userId: req.user.id,
        details: `Added employee: ${name}`,
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/employees/:id - Update employee (Admin only)
app.put('/api/employees/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, department, position, salary } = req.body;
    const id = parseInt(req.params.id);

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(department && { department }),
        ...(position && { position }),
        ...(salary !== undefined && { salary: parseFloat(salary) }),
      },
    });

    await prisma.log.create({
      data: {
        action: 'EMPLOYEE_UPDATED',
        userId: req.user.id,
        details: `Updated employee: ${employee.name}`,
      },
    });

    res.json(employee);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/employees/:id - Delete employee (Admin only)
app.delete('/api/employees/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await prisma.employee.delete({ where: { id } });

    await prisma.log.create({
      data: {
        action: 'EMPLOYEE_DELETED',
        userId: req.user.id,
        details: `Deleted employee: ${employee.name}`,
      },
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FEEDBACK ROUTES ====================

// GET /api/feedback - Get all feedback (Admin/HR)
app.get('/api/feedback', authenticateToken, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = category && category !== 'all' ? { category } : {};

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { dateSubmitted: 'desc' },
        include: {
          employee: { select: { id: true, name: true, department: true } },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      feedback,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/feedback - Submit feedback
app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const { employeeId, category, message } = req.body;

    if (!employeeId || !category || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        employeeId: parseInt(employeeId),
        category,
        message,
      },
      include: { employee: true },
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ANALYTICS ROUTES ====================

// GET /api/analytics - Get analytics data
app.get('/api/analytics', authenticateToken, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    // Employee count by department
    const employeesByDept = await prisma.employee.groupBy({
      by: ['department'],
      _count: { id: true },
    });

    // Feedback by category
    const feedbackByCategory = await prisma.feedback.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    // Monthly feedback trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const feedbackTrends = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(date_submitted, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM feedback
      WHERE date_submitted >= ${sixMonthsAgo}
      GROUP BY TO_CHAR(date_submitted, 'YYYY-MM')
      ORDER BY month
    `;

    // Total counts
    const [totalEmployees, totalFeedback, totalUsers] = await Promise.all([
      prisma.employee.count(),
      prisma.feedback.count(),
      prisma.user.count(),
    ]);

    // Average salary by department
    const avgSalaryByDept = await prisma.employee.groupBy({
      by: ['department'],
      _avg: { salary: true },
    });

    res.json({
      employeesByDepartment: employeesByDept.map(d => ({
        department: d.department,
        count: d._count.id,
      })),
      feedbackByCategory: feedbackByCategory.map(f => ({
        category: f.category,
        count: f._count.id,
      })),
      feedbackTrends: feedbackTrends.map(t => ({
        month: t.month,
        count: Number(t.count),
      })),
      totals: {
        employees: totalEmployees,
        feedback: totalFeedback,
        users: totalUsers,
      },
      avgSalaryByDepartment: avgSalaryByDept.map(d => ({
        department: d.department,
        avgSalary: d._avg.salary,
      })),
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== LOGS ROUTES ====================

// GET /api/logs - Get system logs (Admin only)
app.get('/api/logs', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { timestamp: 'desc' },
      }),
      prisma.log.count(),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DEPARTMENT ROUTES ====================

// Simple in-memory cache for departments and categories
const cache = {
  departments: { data: null, timestamp: null },
  categories: { data: null, timestamp: null },
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET /api/departments - Get all departments
app.get('/api/departments', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    // Check cache
    if (cache.departments.data && cache.departments.timestamp && (now - cache.departments.timestamp) < CACHE_TTL) {
      return res.json(cache.departments.data);
    }

    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    
    // Update cache
    cache.departments = { data: departments, timestamp: now };
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/departments - Create department (Admin/HR only)
app.post('/api/departments', authenticateToken, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ error: 'Department name must be at least 2 characters' });
    }
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Department name must be less than 100 characters' });
    }

    const department = await prisma.department.create({
      data: {
        name: trimmedName,
        description: description ? description.trim() : null,
      },
    });

    await prisma.log.create({
      data: {
        action: 'DEPARTMENT_CREATED',
        userId: req.user.id,
        details: `Created department: ${name}`,
      },
    });

    // Invalidate cache
    cache.departments = { data: null, timestamp: null };

    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/departments/:id - Update department (Admin/HR only)
app.put('/api/departments/:id', authenticateToken, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = parseInt(req.params.id);

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    await prisma.log.create({
      data: {
        action: 'DEPARTMENT_UPDATED',
        userId: req.user.id,
        details: `Updated department: ${department.name}`,
      },
    });

    // Invalidate cache
    cache.departments = { data: null, timestamp: null };

    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/departments/:id - Delete department (Admin only)
app.delete('/api/departments/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department has employees
    const employeeCount = await prisma.employee.count({
      where: { departmentId: id },
    });

    if (employeeCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department. It has ${employeeCount} employee(s) assigned.` 
      });
    }

    await prisma.department.delete({ where: { id } });

    await prisma.log.create({
      data: {
        action: 'DEPARTMENT_DELETED',
        userId: req.user.id,
        details: `Deleted department: ${department.name}`,
      },
    });

    // Invalidate cache
    cache.departments = { data: null, timestamp: null };

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FEEDBACK CATEGORY ROUTES ====================

// GET /api/feedback-categories - Get all feedback categories
app.get('/api/feedback-categories', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    // Check cache
    if (cache.categories.data && cache.categories.timestamp && (now - cache.categories.timestamp) < CACHE_TTL) {
      return res.json(cache.categories.data);
    }

    const categories = await prisma.feedbackCategory.findMany({
      orderBy: { name: 'asc' },
    });
    
    // Update cache
    cache.categories = { data: categories, timestamp: now };
    res.json(categories);
  } catch (error) {
    console.error('Get feedback categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/feedback-categories - Create feedback category (Admin/HR only)
app.post('/api/feedback-categories', authenticateToken, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ error: 'Category name must be at least 2 characters' });
    }
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Category name must be less than 100 characters' });
    }

    const category = await prisma.feedbackCategory.create({
      data: {
        name: trimmedName,
        description: description ? description.trim() : null,
      },
    });

    await prisma.log.create({
      data: {
        action: 'FEEDBACK_CATEGORY_CREATED',
        userId: req.user.id,
        details: `Created feedback category: ${name}`,
      },
    });

    // Invalidate cache
    cache.categories = { data: null, timestamp: null };

    res.status(201).json(category);
  } catch (error) {
    console.error('Create feedback category error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/feedback-categories/:id - Update feedback category (Admin/HR only)
app.put('/api/feedback-categories/:id', authenticateToken, authorize('ADMIN', 'HR'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = parseInt(req.params.id);

    const category = await prisma.feedbackCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    await prisma.log.create({
      data: {
        action: 'FEEDBACK_CATEGORY_UPDATED',
        userId: req.user.id,
        details: `Updated feedback category: ${category.name}`,
      },
    });

    // Invalidate cache
    cache.categories = { data: null, timestamp: null };

    res.json(category);
  } catch (error) {
    console.error('Update feedback category error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/feedback-categories/:id - Delete feedback category (Admin only)
app.delete('/api/feedback-categories/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const category = await prisma.feedbackCategory.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: 'Feedback category not found' });
    }

    // Check if category has feedback
    const feedbackCount = await prisma.feedback.count({
      where: { categoryId: id },
    });

    if (feedbackCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${feedbackCount} feedback submission(s).` 
      });
    }

    await prisma.feedbackCategory.delete({ where: { id } });

    await prisma.log.create({
      data: {
        action: 'FEEDBACK_CATEGORY_DELETED',
        userId: req.user.id,
        details: `Deleted feedback category: ${category.name}`,
      },
    });

    // Invalidate cache
    cache.categories = { data: null, timestamp: null };

    res.json({ message: 'Feedback category deleted successfully' });
  } catch (error) {
    console.error('Delete feedback category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// GET /api/users - Get all users (Admin only)
app.get('/api/users', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        employee: true,
      },
      orderBy: { id: 'asc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create user (Admin only)
app.post('/api/users', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, passwordHash, role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await prisma.log.create({
      data: {
        action: 'USER_CREATED',
        userId: req.user.id,
        details: `Created user: ${username}`,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = { app, prisma };
