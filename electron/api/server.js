const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();

// Validate JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in production');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const JWT_ACCESS_EXPIRY = '15m';  // Short-lived access token
const JWT_REFRESH_EXPIRY = '7d';   // Longer-lived refresh token

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'same-origin' },
  xssFilter: true,
  noSniff: true,
  hidePoweredBy: true,
  frameguard: { action: 'deny' }
}));

// Configure CORS for production and development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['app://.'] 
    : ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
};
app.use(cors(corsOptions));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: req => {
    // Skip rate limiting for static assets in production
    return process.env.NODE_ENV === 'production' && 
           (req.path.startsWith('/static/') || req.path.endsWith('.js'));
  }
});

// Slower responses after max requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per 15 minutes, then...
  delayMs: 500 // Begin adding 500ms of delay per request above 100
});

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit login attempts to 5 per windowMs
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true,
  skip: req => req.method !== 'POST' // Only apply to POST requests
});

// Apply rate limiting and speed limiting
app.use('/api/', apiLimiter);
app.use('/api/', speedLimiter);

// JSON parsing with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// CSRF protection (exclude API routes that don't need it)
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600 // 1 hour
  },
  value: (req) => {
    // Get CSRF token from header, body, or query string
    return req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
  }
});

// Apply CSRF protection to non-API routes and specific API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && ![
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout'
  ].includes(req.path)) {
    return next();
  }
  csrfProtection(req, res, next);
});

// Add CSRF token to response headers
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken?.() || '', {
    httpOnly: false, // Needs to be readable by client-side JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });
  next();
});

// JWT token generation
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { 
      id: user.id,
      email: user.email,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  return { accessToken, refreshToken };
};

// Store refresh tokens (in production, use Redis or database)
const refreshTokens = new Set();

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  // Get token from Authorization header or cookies
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is an access token
    if (decoded.type !== 'access') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        username: true,
        employee: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({ error: 'Invalid token' });
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
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true }
    });

    if (!user) {
      // Simulate password verification to prevent timing attacks
      await bcrypt.compare('dummy-password', '$2b$10$dummyhash');
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Store refresh token (in production, use Redis or database)
    refreshTokens.add(refreshToken);

    // Set secure, httpOnly cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/api/'
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh'
    });

    // Log the login
    await prisma.log.create({
      data: {
        action: 'USER_LOGIN',
        userId: user.id,
        details: `User ${user.username} logged in`,
        ipAddress: req.ip
      },
    });

    // Return user data (excluding password)
    const { passwordHash, ...userData } = user;
    
    res.json({
      user: userData,
      // For clients that can't use httpOnly cookies
      token: accessToken,
      refreshToken: process.env.NODE_ENV === 'development' ? refreshToken : undefined
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// POST /api/auth/refresh - Refresh access token
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.cookies || req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      error: 'Refresh token required',
      code: 'REFRESH_TOKEN_REQUIRED'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ 
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // In production, validate against stored refresh tokens
    if (!refreshTokens.has(refreshToken)) {
      return res.status(403).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        username: true,
        employee: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Update refresh token in store
    refreshTokens.delete(refreshToken);
    refreshTokens.add(newRefreshToken);

    // Set new cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/api/'
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh'
    });

    res.json({
      accessToken,
      refreshToken: process.env.NODE_ENV === 'development' ? newRefreshToken : undefined
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    res.status(403).json({ 
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

// POST /api/auth/logout - Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.cookies || req.body;
    
    // Remove refresh token from store
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken', { path: '/api/' });
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    
    // Log the logout
    await prisma.log.create({
      data: {
        action: 'USER_LOGOUT',
        userId: req.user.id,
        details: `User ${req.user.username} logged out`,
        ipAddress: req.ip
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
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
    const { name, department, departmentId, position, salary } = req.body;

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

    // Find department by ID if provided, otherwise by name
    let deptId = null;
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
      if (dept) {
        deptId = dept.id;
      }
    } else {
      const dept = await prisma.department.findFirst({ where: { name: sanitizedDept } });
      if (dept) {
        deptId = dept.id;
      }
    }

    const employee = await prisma.employee.create({
      data: {
        name: sanitizedName,
        department: sanitizedDept,
        departmentId: deptId,
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
    const { name, department, departmentId, position, salary } = req.body;
    const id = parseInt(req.params.id);

    // Find department by ID if provided, otherwise by name
    let deptId = null;
    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: parseInt(departmentId) } });
      if (dept) {
        deptId = dept.id;
      }
    } else if (department) {
      const dept = await prisma.department.findFirst({ where: { name: department.trim() } });
      if (dept) {
        deptId = dept.id;
      }
    }

    const updateData = {
      ...(name && { name }),
      ...(department && { department }),
      ...(deptId !== null && { departmentId: deptId }),
      ...(position && { position }),
      ...(salary !== undefined && { salary: parseFloat(salary) }),
    };

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
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
    const { employeeId, category, categoryId, message } = req.body;

    if (!employeeId || !category || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Find category by ID if provided, otherwise by name
    let catId = null;
    if (categoryId) {
      const cat = await prisma.feedbackCategory.findUnique({ where: { id: parseInt(categoryId) } });
      if (cat) {
        catId = cat.id;
      }
    } else {
      const cat = await prisma.feedbackCategory.findFirst({ where: { name: category.trim() } });
      if (cat) {
        catId = cat.id;
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        employeeId: parseInt(employeeId),
        category: category.trim(),
        categoryId: catId,
        message: message.trim(),
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
