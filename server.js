const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const { Sequelize } = require('sequelize');
const colors = require('colors');
require('dotenv').config();
const cors = require('cors');
const { apiLimiter } = require('./core/middleware/rateLimiter');

// NEW MODULAR API
const apiV1 = require('./api/v1');

const config = require('./core/config/config.json');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

// Add this before initializing Express app
const ensureUploadsDirectory = () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const receiptsDir = path.join(uploadsDir, 'receipts');
  const memberDocsDir = path.join(uploadsDir, 'member-documents');
  const publicDocsDir = path.join(uploadsDir, 'public-documents');
  const announcementsDir = path.join(uploadsDir, 'announcements');
  const blogsDir = path.join(uploadsDir, 'blogs');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir);
  }
  if (!fs.existsSync(memberDocsDir)) {
    fs.mkdirSync(memberDocsDir);
  }
  if (!fs.existsSync(publicDocsDir)) {
    fs.mkdirSync(publicDocsDir);
  }
  if (!fs.existsSync(announcementsDir)) {
    fs.mkdirSync(announcementsDir);
  }
  if (!fs.existsSync(blogsDir)) {
    fs.mkdirSync(blogsDir);
  }
};

// Initialize uploads directory
ensureUploadsDirectory();

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Supabase for file storage
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized for storage'.green);
  } catch (error) {
    console.log('⚠️ Failed to initialize Supabase client:', error.message);
  }
} else {
  console.log('⚠️ Supabase credentials not found - file storage disabled'.yellow);
}

// Make supabase available globally
global.supabase = supabase;

// Database initialization
const db = require('./models');
const sequelize = db.sequelize;

// Function to initialize database
const initDatabase = async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully'.green);
    
    // Sync database with alter option for development
    console.log('🔄 Synchronizing database schema...'.yellow);
    
    try {
      // Get all models for debugging
      const models = Object.keys(sequelize.models);
      console.log(`📋 Found ${models.length} models:`, models);
      
      // Check if we should force sync (create all tables)
      // Force sync can be enabled by setting FORCE_DB_SYNC=true in .env
      // or by setting NODE_ENV=initial-deployment
      const shouldForceSync = process.env.FORCE_DB_SYNC === 'true' || process.env.NODE_ENV === 'initial-deployment';
      
      if (shouldForceSync) {
        console.log('⚠️ FORCE SYNC enabled - all tables will be dropped and recreated'.yellow.bold);
        await sequelize.sync({ force: true });
        console.log('✅ Database tables forcefully recreated'.green.bold);
      } else {
        // Use alter to update existing tables without dropping data
        await sequelize.sync({ alter: true });
        console.log('✅ Database schema synchronized with alter mode'.green);
      }
      
    } catch (syncError) {
      console.error('❌ Database sync error:', syncError.message);
      throw syncError;
    }
    
    // Verify SmsMessage table structure
    const smsMessageModel = sequelize.models.SmsMessage;
    if (smsMessageModel) {
      console.log('📱 SmsMessage model found, checking table structure...'.blue);
      try {
        const tableDescription = await sequelize.getQueryInterface().describeTable('SmsMessages');
        console.log('📋 SmsMessages table columns:', Object.keys(tableDescription));
        if (tableDescription.messageLength) {
          console.log('✅ messageLength column confirmed in database'.green);
        } else {
          console.log('❌ messageLength column missing from database table'.red);
        }
      } catch (descError) {
        console.log('⚠️ Could not describe SmsMessages table:', descError.message);
      }
    }
    
    // Run seeders for roles and permissions if tables are empty
    await runSeeders();
    
  } catch (error) {
    console.error('❌ Database connection error:'.red, error.message);
    // Don't exit process on DB error in production - allow the server to start anyway
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      console.error('⚠️ Continuing despite database error in production environment'.yellow);
    }
  }
};

// Function to run seeders automatically
const runSeeders = async () => {
  try {
    const { User, Role, Permission, RolePermission, Shortcut } = require('./models');
    
    // Check if roles exist first
    const roleCount = await Role.count();
    if (roleCount === 0) {
      console.log('🌱 Seeding default roles and permissions...'.yellow);
      
      // Import and run the roles and permissions seeder
      const rolesSeederData = require('./seeders/20250818-seed-roles-permissions');
      await rolesSeederData.up(sequelize.getQueryInterface(), sequelize.constructor);
      
      console.log('✅ Default roles and permissions seeded'.green);
      
      // Run the permissions update seeder
      const permissionsUpdateSeeder = require('./seeders/20250818-update-permissions-seed');
      await permissionsUpdateSeeder.up(sequelize.getQueryInterface(), sequelize.constructor);
      
      console.log('✅ Additional permissions seeded'.green);
      
      // Run the member upload permission seeder
      const uploadPermissionsSeeder = require('./seeders/20251001-add-upload-permissions-to-roles');
      await uploadPermissionsSeeder.up(sequelize.getQueryInterface(), sequelize.constructor);
      
      console.log('✅ Member upload permissions assigned to roles'.green);
    } else {
      console.log('✅ Roles and permissions already exist'.green);
    }

    // Admin user creation is now handled by seedAdminUser.js utility after server starts
    // This eliminates the duplicate creation attempt and potential errors
    
    // Check if shortcuts exist and seed them
    const shortcutCount = await Shortcut.count();
    if (shortcutCount === 0) {
      console.log('🚀 Seeding default shortcuts...'.yellow);
      
      const { seedShortcuts } = require('./utils/shortcutSeeder');
      await seedShortcuts();
      
      console.log('✅ Default shortcuts seeded'.green);
    } else {
      console.log('✅ Shortcuts already exist'.green);
    }

  } catch (error) {
    console.error('❌ Error running seeders:', error.message);
    console.error('Stack:', error.stack);
  }
};

// Middleware
app.use(helmet()); // Security headers

// Add cache control middleware to prevent caching of API responses
app.use((req, res, next) => {
  // Prevent caching for all API routes
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Add static file serving for uploads
app.use('/uploads',
   express.static(path.join(__dirname, 'uploads')));

// Add static file serving for frontend assets if needed
app.use('/sounds', express.static(path.join(__dirname, '../frontend/public/sounds'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.wav') || path.endsWith('.mp3')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', 'audio/wav');
    }
  }
}));

// Place this BEFORE any middleware that uses this setting
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : 0); // Trust first proxy in production

// Use the cors package instead of custom middleware for more reliable CORS handling
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://system.awib-saccos.com', 'https://awib-saccos.com','https://www.awib-saccos.com'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      console.log(`CORS blocked origin: ${origin}`);
      return callback(null, false);
    }
    console.log(`CORS allowed origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  maxAge: 86400 // 24 hours
}));

// Explicit OPTIONS preflight handler - this helps with some CORS edge cases
app.options('*', cors());

// Let express use its built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Simplified logging for troubleshooting
app.use(morgan('dev'));

// Request logging
if (process.env.NODE_ENV !== 'production') {
  morgan.token('emoji', (req) => {
    switch (req.method) {
      case 'GET': return '👀';
      case 'POST': return '📝';
      case 'PUT': return '📤';
      case 'DELETE': return '🗑️';
      default: return '❓';
    }
  });
  app.use(morgan(':emoji  :method :url :status :response-time ms'));
} else {
  // In production, only log errors
  app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400 }
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000 || 15 * 60 * 1000, // Default 15 minutes if not set
  max: process.env.RATE_LIMIT_MAX || 100, // Default 100 requests per windowMs
  message: '⚠️  Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP from X-Forwarded-For but only trust Railway's proxy
  keyGenerator: (req) => {
    // For Railway, get the real IP from X-Forwarded-For
    return req.ip || req.connection.remoteAddress;
  }
});
app.use(limiter);

// Health check endpoint for Railway deployment
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AWIB SACCO API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    features: ['SMS messaging', 'Notifications', 'Member management']
  });
});

// Add a simple ping endpoint that doesn't use DB
app.get('/ping', (req, res) => {
  // Add detailed logging to help diagnose health check issues
  console.log(`PING request received from ${req.ip || 'unknown'} at ${new Date().toISOString()}`);
  
  // Send a simple response for Railway health checks
  res.set('Connection', 'keep-alive');
  res.set('Cache-Control', 'no-cache');
  res.status(200).send('pong');
});

// Add diagnostic routes BEFORE authentication middleware (keep this useful for debugging)
const diagnosticRoutes = require('./api/diagnostic');
app.use('/api/diagnostic', diagnosticRoutes);

// Session management
const sessionConfig = {
  store: new pgSession({
    conObject: process.env.DATABASE_URL 
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {
          host: config.production.host || config.development.host,
          port: config.production.port || config.development.port,
          database: config.production.database || config.development.database,
          user: config.production.username || config.development.username,
          password: config.production.password || config.development.password,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        }
  }),
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

app.use(session(sessionConfig));

// Apply session activity tracking middleware to all authenticated routes
const { updateSessionActivity } = require('./modules/auth/middleware/sessionMiddleware');

// =====================================
// MODULAR API (v1) - MAIN API ROUTES
// =====================================
app.use('/api/v1', updateSessionActivity);
app.use('/api/v1', apiV1);

// Apply API rate limiting to v1 routes
app.use('/api/v1', apiLimiter);

// Add a catch-all route for debugging
app.use('*', (req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: {
      health: 'GET /',
      ping: 'GET /ping',
      api: 'GET /api/v1/health',
      modules: [
        '/api/v1/auth',
        '/api/v1/members',
        '/api/v1/budget',
        '/api/v1/accounting',
        '/api/v1/expenses',
        '/api/v1/organization',
        '/api/v1/content',
        '/api/v1/notifications',
        '/api/v1/system',
        '/api/v1/leave',
        '/api/v1/payments',
        '/api/v1/documents',
        '/api/v1/communications'
      ],
      backwardCompatibility: [
        'POST /api/v1/users/login',
        'GET /api/v1/blogs',
        'GET /api/v1/announcements'
      ]
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack, details: err })
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    
    // Initialize services
    console.log('🔧 Initializing services...'.yellow);
    
    // Initialize email service
    try {
      const emailService = require('./core/services/emailService');
      await emailService.init();
      console.log('📧 Email service initialization completed');
    } catch (emailError) {
      console.warn('⚠️ Email service initialization error:', emailError.message);
      console.log('🔔 Application will continue without email functionality');
    }
    
    // Initialize SMS service
    try {
      const smsService = require('./core/services/simpleSmsService');
      if (smsService.isConfigured()) {
        console.log('✅ SMS service configured and ready'.green);
      } else {
        console.log('📱 SMS service not configured (API credentials missing)'.yellow);
      }
    } catch (smsError) {
      console.warn('⚠️ SMS service initialization failed:', smsError.message);
    }
    
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`.green.bold);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`.blue);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api/v1`.magenta);
      console.log('========================================================'.rainbow);
      console.log('📦 Active Modules:'.yellow.bold);
      console.log('   • Auth'.green);
      console.log('   • Members'.green);
      console.log('   • Budget'.green);
      console.log('   • Accounting'.green);
      console.log('   • Expenses'.green);
      console.log('   • Organization'.green);
      console.log('   • Content'.green);
      console.log('   • Notifications'.green);
      console.log('   • System'.green);
      console.log('   • Leave'.green);
      console.log('   • Payments'.green);
      console.log('   • Documents'.green);
      console.log('   • Communications'.green);
      console.log('   • Company Settings'.green);
      console.log('   • Branches Management'.green);
      console.log('============================================================'.rainbow);
      
      // Session cleanup scheduler
      const { cleanupExpiredSessions, markInactiveSessions } = require('./modules/auth/middleware/sessionMiddleware');
      
      // Run session cleanup every hour
      setInterval(async () => {
        await markInactiveSessions();
        await cleanupExpiredSessions();
      }, 60 * 60 * 1000); // 1 hour
      
      // Run initial cleanup
      console.log('🧹 Starting session cleanup scheduler...'.cyan);
      await markInactiveSessions();
      await cleanupExpiredSessions();
      
      
    });
  } catch (error) {
    console.error('❌ Failed to start server:'.red, error);
    process.exit(1);
  }
};

startServer();
