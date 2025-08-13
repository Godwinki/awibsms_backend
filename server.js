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
const { apiLimiter } = require('./middleware/rateLimiter');
const userRoutes = require('./routes/userRoutes');
const config = require('./config/config.json');
const activityRoutes = require('./routes/activityRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const budgetCategoryRoutes = require('./routes/budgetCategoryRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const memberRoutes = require('./routes/memberRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const publicDocumentRoutes = require('./routes/publicDocumentRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const blogRoutes = require('./routes/blogRoutes');
const accountRoutes = require('./routes/accountRoutes');


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

// Initialize Express app
const app = express();
ensureUploadsDirectory();

// Custom Banner
const displayBanner = () => {
  console.log('\n');
  console.log('⚡️'.yellow, '='.repeat(50).cyan);
  console.log(`
     /\\\\\\\\\\\\\\\\\\     /\\\\\\\\\\\\\\\\\\     /\\\\\\     /\\\\\\  /\\\\\\\\\\\\\\\\\\     /\\\\\\\\\\\\\\\\\\     /\\\\\\\\\\\\\\\\\\     
    /\\\\\\//////     /\\\\\\//////     \\/\\\\\\    /\\\\\\  /\\\\\\//////     /\\\\\\//////     /\\\\\\//////      

  `.blue);
  console.log('🏦', 'T Management System v1.0.0'.yellow.bold);
  console.log('📍', ' Server Status:'.cyan, 'Initializing...'.yellow);
  console.log('⚡️'.yellow, '='.repeat(50).cyan);
  console.log('\n');
};

// Replace existing console.log banner with:
displayBanner();

// Database connection setup
console.log('\n🔄 Setting up database connection...'.yellow);

// Log the DATABASE_URL if available (without exposing credentials)
if (process.env.DATABASE_URL) {
  const sanitizedUrl = process.env.DATABASE_URL.replace(/(postgresql:\/\/[^:]+:)[^@]+(@.+)/, '$1****$2');
  console.log(`🔄 DATABASE_URL is set: ${sanitizedUrl}`.yellow);
} else {
  console.log('⚠️ No DATABASE_URL found, will use local config'.yellow);
}

// Import database models
const db = require('./models');
const sequelize = db.sequelize;

// Function to initialize database including SMS tables
const initDatabase = async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully'.green);
    
    // Create Announcements table if it doesn't exist
    try {
      const [results] = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Announcements'"
      );
      
      if (results.length === 0) {
        console.log('🔄 Creating Announcements table...'.yellow);
        await db.Announcement.sync({ force: false });
        console.log('✅ Announcements table created'.green);
      }
    } catch (error) {
      console.log('⚠️ Could not create Announcements table:', error.message);
    }

    // Create Blogs table if it doesn't exist
    try {
      const [blogResults] = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blogs'"
      );
      
      if (blogResults.length === 0) {
        console.log('🔄 Creating Blogs table...'.yellow);
        await db.Blog.sync({ force: false });
        console.log('✅ Blogs table created'.green);
      } else {
        console.log('✅ Blogs table already exists'.green);
      }
    } catch (error) {
      console.log('⚠️ Could not create Blogs table:', error.message);
    }
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Add diagnostic routes BEFORE authentication middleware
const diagnosticRoutes = require('./routes/diagnosticRoutes');
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
          connectionString: `postgres://${config.development.username}:${config.development.password}@${config.development.host}:${config.development.port || 5432}/${config.development.database}`
        },
    createTableIfMissing: true,
    pruneSessionInterval: 60
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined
  }
};

app.use(session(sessionConfig));

// Routes with proper prefixes
app.use('/api/activities', activityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/budget-categories', budgetCategoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/leaves', leaveRoutes); 
app.use('/api/notifications', notificationRoutes); 

// Register settings routes at top-level
const settingRoutes = require('./routes/settingRoutes');
app.use('/api/settings', settingRoutes);

app.use('/api/members', memberRoutes);

// Member bulk upload routes
const memberUploadRoutes = require('./routes/memberUploadRoutes');
app.use('/api/member-uploads', memberUploadRoutes);

app.use('/api/documents', documentRoutes);
app.use('/api/public-documents', publicDocumentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/accounts', accountRoutes);

// Import account type controller directly
const accountController = require('./controllers/accountController');
const { protect } = require('./middleware/authMiddleware');

// Add direct routes for account types to match frontend expectations
app.get('/api/account-types', protect, accountController.getAccountTypes);
app.get('/api/account-types/:id', protect, accountController.getAccountTypeById);


// Apply API rate limiting to routes except special cases
// The readOnlyLimiter is applied directly in the route files for special endpoints
app.use('/api/users', apiLimiter);
app.use('/api/budgets', apiLimiter);
app.use('/api/activities', apiLimiter);
app.use('/api/expenses', apiLimiter);

// Add a catch-all route for debugging
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Update the initializeDatabase function
const initializeDatabase = async () => {
  try {
    console.log('\n🔄 Initializing database...'.yellow);
    
    // Test database connection with retry logic
    let retries = 5;
    let lastError;
    
    while (retries) {
      try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully'.green);
        break;
      } catch (error) {
        lastError = error;
        retries -= 1;
        if (retries === 0) {
          console.error('❌ All connection attempts failed'.red);
          throw lastError;
        }
        console.log(`⚠️ Database connection attempt failed. Retrying... (${retries} attempts left)`.yellow);
        console.log(`Error details: ${error.message}`.yellow);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Explicitly require critical models to ensure they're loaded
    try {
      require('./models/Member');
      require('./models/Blog');
      require('./models/Announcement');
      console.log('✅ Critical models loaded successfully'.green);
    } catch (error) {
      console.error('❌ Error loading critical models:'.red, error.message);
    }

    // Display all loaded models
    console.log('\n📋 Loaded Models:'.cyan);
    Object.keys(db).forEach(modelName => {
      if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
        console.log(`  📄 ${modelName}`.blue);
      }
    });
    
    // Check if this is a fresh database by looking for Users table
    let isFreshDatabase = false;
    try {
      const usersTableExists = await sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'Users'
        )`,
        { type: sequelize.QueryTypes.SELECT, plain: true }
      );
      isFreshDatabase = !usersTableExists.exists;
    } catch (error) {
      // If we can't check, assume it's a fresh database
      isFreshDatabase = true;
    }
    
    if (isFreshDatabase) {
      console.log('🆕 Fresh database detected - enabling synchronization to create tables'.green);
      try {
        await sequelize.sync({ alter: false });
        console.log('✅ Database tables created successfully'.green);
      } catch (syncError) {
        console.error('❌ Error creating database tables:'.red, syncError.message);
        throw syncError;
      }
    } else {
      console.log('ℹ️ Existing database detected - skipping synchronization to prevent conflicts'.yellow);
      console.log('✅ Using existing database schema'.green);
    }

    // Verify critical tables exist and create if missing
    const criticalTables = [
      { name: 'Members', model: 'Member' },
      { name: 'blogs', model: 'Blog' },
      { name: 'Announcements', model: 'Announcement' },
      { name: 'PublicDocuments', model: 'PublicDocument' },
      { name: 'download_logs', model: 'DownloadLog' }
    ];

    console.log('\n🔍 Verifying critical tables...'.cyan);
    for (const table of criticalTables) {
      try {
        const tableExists = await sequelize.query(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = '${table.name}'
          )`,
          { type: sequelize.QueryTypes.SELECT, plain: true }
        );
        
        if (tableExists && tableExists.exists) {
          console.log(`✅ ${table.name} table exists`.green);
          
          // For blogs table, check if new Supabase fields exist and add them if not
          if (table.name === 'blogs') {
            try {
              const columnsExist = await sequelize.query(
                `SELECT column_name FROM information_schema.columns 
                 WHERE table_name = 'blogs' AND column_name IN ('featuredImageUrl', 'featuredImagePath', 'featuredImageOriginalName', 'featuredImageSize')`,
                { type: sequelize.QueryTypes.SELECT }
              );
              
              if (columnsExist.length < 4) {
                console.log('📝 Adding new Supabase fields to blogs table...'.yellow);
                await sequelize.query(`
                  ALTER TABLE "blogs" 
                  ADD COLUMN IF NOT EXISTS "featuredImageUrl" VARCHAR(500),
                  ADD COLUMN IF NOT EXISTS "featuredImagePath" VARCHAR(300),
                  ADD COLUMN IF NOT EXISTS "featuredImageOriginalName" VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS "featuredImageSize" INTEGER;
                `);
                console.log('✅ Supabase fields added to blogs table'.green);
              }
            } catch (alterError) {
              console.log('⚠️ Could not add Supabase fields to blogs table:', alterError.message);
            }
          }
        } else {
          console.log(`⚠️ ${table.name} table missing - creating...`.yellow);
          
          if (db[table.model]) {
            await db[table.model].sync({ force: false });
            console.log(`✅ ${table.name} table created successfully`.green);
          } else {
            console.log(`❌ Model ${table.model} not found in db object`.red);
          }
        }
      } catch (error) {
        console.error(`❌ Error verifying ${table.name} table:`.red, error.message);
      }
    }
    
    // Check if admin user exists and create if not
    console.log('\n👤 Verifying admin user...'.cyan);
    try {
      const AdminSeeder = require('./seeders/20240328-admin-user');
      const [results] = await sequelize.query('SELECT * FROM "Users" WHERE role = \'admin\' LIMIT 1');
      
      if (results.length === 0) {
        console.log('👤 No admin user found, creating one...'.yellow);
        await AdminSeeder.up(sequelize.getQueryInterface(), Sequelize);
        console.log('👤 Admin user created successfully'.green);
      } else {
        console.log('👤 Admin user already exists'.green);
      }
    } catch (error) {
      console.error('❌ Error verifying admin user:'.red, error.message);
    }
    
    console.log('✅ Database synchronized successfully'.green);

  } catch (error) {
    console.error('❌ Database initialization error:'.red);
    console.error('⚠️  Details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Update start server function
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initializeDatabase();
    
    // Railway expects the server to listen on PORT
    const server = app.listen(PORT, () => {
      console.log('🚀'.green, `Server running on port ${PORT}`.cyan);
      console.log('📍'.yellow, `Environment: ${process.env.NODE_ENV}`.cyan);
      console.log('🔗'.yellow, `Health check at: /ping`.cyan);
      console.log('⚡️'.yellow, '='.repeat(50).cyan);
    });

    // Critical for Railway - specify longer timeouts to prevent premature connection termination
    server.keepAliveTimeout = 65000; // Ensure longer than ALB's idle timeout (usually 60s)
    server.headersTimeout = 66000; // Slightly more than keepAliveTimeout
    
    // Add proper shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`🛑 Received ${signal || 'shutdown'} signal, closing server...`.yellow);
      server.close(() => {
        console.log('✅ Server closed successfully'.green);
        process.exit(0);
      });
      
      // Force close if it takes too long
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down'.red);
        process.exit(1);
      }, 30000); // Give it 30 seconds to close connections
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:'.red, error.message);
      
      // Don't exit on connection errors in production
      if (process.env.NODE_ENV === 'production' && 
          (error.code === 'ECONNRESET' || error.code === 'EPIPE')) {
        console.log('⚠️ Connection error in production - not exiting'.yellow);
      } else {
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:'.red, error);
    process.exit(1);
  }
};

startServer();

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:'.red, err.stack);
  res.status(500).json({
    status: 'error',
    message: '🔥 Internal server error'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION! Shutting down...'.red.bold);
  console.error('Error:', err);
  process.exit(1);
});