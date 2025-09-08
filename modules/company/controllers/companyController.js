// controllers/companyController.js
const { CompanySettings, User, Branch } = require('../../../models');
const { validateCompanySettings, validateCompanySettingsUpdate } = require('../validations/companyValidation');
const { validationResponse } = require('../validations/validationMiddleware');
const { ActivityLog } = require('../../../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/company');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `logo_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Get company settings
 */
exports.getCompanySettings = async (req, res) => {
  try {
    console.log('🏢 [Company] Fetching company settings...');
    
    // Get the first (and should be only) company settings record
    let settings = await CompanySettings.findOne({
      order: [['createdAt', 'ASC']]
    });
    
    // If no settings exist, create default ones
    if (!settings) {
      console.log('⚠️ [Company] No settings found, creating default settings...');
      settings = await CompanySettings.create({});
    }
    
    console.log('✅ [Company] Company settings retrieved successfully');
    res.json({
      status: 'success',
      message: 'Company settings retrieved successfully',
      data: settings
    });
  } catch (error) {
    console.error('❌ [Company] Error fetching company settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company settings',
      error: error.message
    });
  }
};

/**
 * Update company settings
 */
exports.updateCompanySettings = async (req, res) => {
  try {
    console.log('🏢 [Company] Updating company settings...');
    
    // Get existing settings
    let settings = await CompanySettings.findOne();
    
    if (!settings) {
      // Create new settings if none exist
      settings = await CompanySettings.create(req.body);
    } else {
      // Update existing settings
      await settings.update(req.body);
    }
    
    console.log('✅ [Company] Company settings updated successfully');
    res.json({
      status: 'success',
      message: 'Company settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('❌ [Company] Error updating company settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update company settings',
      error: error.message
    });
  }
};

/**
 * Upload company logo
 */
exports.uploadLogo = [
  upload.single('logo'),
  async (req, res) => {
    try {
      console.log('🏢 [Company] Uploading company logo...');
      
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No logo file provided'
        });
      }
      
      const logoUrl = `/uploads/company/${req.file.filename}`;
      
      // Update company settings with new logo URL
      let settings = await CompanySettings.findOne();
      if (!settings) {
        settings = await CompanySettings.create({ logo: logoUrl, logoUrl });
      } else {
        // Remove old logo file if it exists
        if (settings.logo || settings.logoUrl) {
          const oldLogoPath = path.join(__dirname, '../../../', settings.logo || settings.logoUrl);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }
        
        await settings.update({ logo: logoUrl, logoUrl });
      }
      
      console.log('✅ [Company] Logo uploaded successfully');
      res.json({
        status: 'success',
        message: 'Logo uploaded successfully',
        data: {
          logoUrl,
          filename: req.file.filename
        }
      });
    } catch (error) {
      console.error('❌ [Company] Error uploading logo:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to upload logo',
        error: error.message
      });
    }
  }
];

/**
 * Get business rules
 */
exports.getBusinessRules = async (req, res) => {
  try {
    console.log('🏢 [Company] Fetching business rules...');
    
    const settings = await CompanySettings.findOne();
    
    if (!settings) {
      return res.status(404).json({
        status: 'error',
        message: 'Company settings not found'
      });
    }
    
    console.log('✅ [Company] Business rules retrieved successfully');
    res.json({
      status: 'success',
      message: 'Business rules retrieved successfully',
      data: settings.businessRules
    });
  } catch (error) {
    console.error('❌ [Company] Error fetching business rules:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch business rules',
      error: error.message
    });
  }
};

/**
 * Update business rules
 */
exports.updateBusinessRules = async (req, res) => {
  try {
    console.log('🏢 [Company] Updating business rules...');
    
    const settings = await CompanySettings.findOne();
    
    if (!settings) {
      return res.status(404).json({
        status: 'error',
        message: 'Company settings not found'
      });
    }
    
    // Merge new rules with existing ones
    const updatedRules = {
      ...settings.businessRules,
      ...req.body
    };
    
    await settings.update({ businessRules: updatedRules });
    
    console.log('✅ [Company] Business rules updated successfully');
    res.json({
      status: 'success',
      message: 'Business rules updated successfully',
      data: updatedRules
    });
  } catch (error) {
    console.error('❌ [Company] Error updating business rules:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update business rules',
      error: error.message
    });
  }
};

/**
 * Initialize company settings with AWIB defaults
 */
exports.initializeCompanySettings = async (req, res) => {
  try {
    console.log('🏢 [Company] Initializing AWIB SACCO settings...');
    
    // Check if settings already exist
    const existingSettings = await CompanySettings.findOne();
    if (existingSettings) {
      return res.status(400).json({
        status: 'error',
        message: 'Company settings already initialized'
      });
    }
    
    const awibSettings = {
      companyName: 'Arusha Women in Business SACCO Society Ltd',
      companyCode: 'AWIB',
      registrationNumber: 'AWIB/REG/2024/001',
      headOfficeAddress: 'Arusha, Tanzania',
      city: 'Arusha',
      region: 'Arusha',
      country: 'Tanzania',
      primaryPhone: '+255744958059',
      primaryEmail: 'info@awibsacco.co.tz',
      website: 'https://awibsacco.co.tz',
      regulatoryBody: 'TCDC',
      baseCurrency: 'TZS',
      currencySymbol: 'TSH',
      accountNumberPrefix: '4001',
      businessRules: {
        minimumSharesRequired: 100000,
        membershipFee: 50000,
        minLoanAmount: 100000,
        maxLoanAmount: 10000000,
        interestCalculationMethod: 'reducing_balance',
        maxLoanTerm: 60, // months
        gracePeriod: 7, // days
        penaltyRate: 5 // percentage
      }
    };
    
    const settings = await CompanySettings.create(awibSettings);
    
    console.log('✅ [Company] AWIB SACCO settings initialized successfully');
    res.status(201).json({
      status: 'success',
      message: 'AWIB SACCO settings initialized successfully',
      data: settings
    });
  } catch (error) {
    console.error('❌ [Company] Error initializing company settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize company settings',
      error: error.message
    });
  }
};

/**
 * Get company statistics/dashboard data
 */
exports.getCompanyStats = async (req, res) => {
  try {
    console.log('📊 [Company] Fetching company statistics...');
    
    // Get counts from various models
    const [totalMembers, totalBranches, totalUsers, companySettings] = await Promise.all([
      // Assuming Member model exists - if not, adjust accordingly
      User.count({ where: { role: 'member' } }).catch(() => 0),
      Branch.count(),
      User.count(),
      CompanySettings.findOne()
    ]);

    // Calculate years established
    let establishedYears = 0;
    if (companySettings && companySettings.establishedDate) {
      const establishedDate = new Date(companySettings.establishedDate);
      const currentDate = new Date();
      establishedYears = Math.floor((currentDate - establishedDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    const stats = {
      totalMembers,
      totalBranches,
      totalUsers,
      establishedYears
      // Add totalAssets, totalLoans, totalSavings if you have those models
    };

    console.log('✅ [Company] Company statistics retrieved successfully');
    res.json({
      status: 'success',
      message: 'Company statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('❌ [Company] Error fetching company statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company statistics',
      error: error.message
    });
  }
};

/**
 * Get company dashboard data (combines settings and stats)
 */
exports.getCompanyDashboard = async (req, res) => {
  try {
    console.log('📊 [Company] Fetching company dashboard data...');
    
    // Get company settings
    const company = await CompanySettings.findOne({
      order: [['createdAt', 'ASC']]
    });

    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company settings not found'
      });
    }

    // Get statistics
    const [totalMembers, totalBranches, totalUsers] = await Promise.all([
      User.count({ where: { role: 'member' } }).catch(() => 0),
      Branch.count(),
      User.count()
    ]);

    // Calculate years established
    let establishedYears = 0;
    if (company.establishedDate) {
      const establishedDate = new Date(company.establishedDate);
      const currentDate = new Date();
      establishedYears = Math.floor((currentDate - establishedDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    const stats = {
      totalMembers,
      totalBranches,
      totalUsers,
      establishedYears
    };

    // Get recent activities (last 10 activities)
    const recentActivities = await ActivityLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    }).catch(() => []);

    const dashboardData = {
      company,
      stats,
      recentActivities: recentActivities.map(activity => ({
        id: activity.id,
        type: activity.action,
        description: activity.details?.description || activity.action,
        timestamp: activity.createdAt,
        user: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System'
      }))
    };

    console.log('✅ [Company] Company dashboard data retrieved successfully');
    res.json({
      status: 'success',
      message: 'Company dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ [Company] Error fetching company dashboard data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company dashboard data',
      error: error.message
    });
  }
};

/**
 * Remove company logo
 */
exports.removeLogo = async (req, res) => {
  try {
    console.log('🏢 [Company] Removing company logo...');
    
    const settings = await CompanySettings.findOne();
    
    if (!settings || (!settings.logo && !settings.logoUrl)) {
      return res.status(404).json({
        status: 'error',
        message: 'No logo found to remove'
      });
    }

    // Remove logo file from filesystem
    const logoPath = path.join(__dirname, '../../../', settings.logo || settings.logoUrl);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

    // Update database
    await settings.update({ logo: null, logoUrl: null });

    console.log('✅ [Company] Logo removed successfully');
    res.json({
      status: 'success',
      message: 'Logo removed successfully',
      data: { logo: null }
    });
  } catch (error) {
    console.error('❌ [Company] Error removing logo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove logo',
      error: error.message
    });
  }
};

/**
 * Validate company code availability
 */
exports.validateCompanyCode = async (req, res) => {
  try {
    const { companyCode, currentCode } = req.body;

    if (!companyCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Company code is required'
      });
    }

    // Check if code is available (excluding current code if updating)
    const whereClause = { companyCode };
    if (currentCode) {
      whereClause.companyCode = { [require('sequelize').Op.ne]: currentCode };
    }

    const existingCompany = await CompanySettings.findOne({ where: whereClause });

    res.json({
      status: 'success',
      data: {
        available: !existingCompany,
        message: existingCompany ? 'Company code is already taken' : 'Company code is available'
      }
    });
  } catch (error) {
    console.error('❌ [Company] Error validating company code:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate company code',
      error: error.message
    });
  }
};

/**
 * Get company history/audit trail
 */
exports.getCompanyHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    console.log(`📊 [Company] Fetching company history (page ${page}, limit ${limit})...`);

    // Get company-related activities
    const { count, rows: activities } = await ActivityLog.findAndCountAll({
      where: {
        action: {
          [require('sequelize').Op.in]: [
            'COMPANY_CREATED',
            'COMPANY_UPDATED', 
            'COMPANY_LOGO_UPLOADED',
            'COMPANY_LOGO_REMOVED',
            'COMPANY_SETTINGS_UPDATED'
          ]
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const history = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      description: activity.details?.description || activity.action,
      changes: activity.details?.changes || {},
      user: {
        id: activity.user?.id || 'system',
        name: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'System',
        email: activity.user?.email || 'system@company.com'
      },
      timestamp: activity.createdAt
    }));

    const totalPages = Math.ceil(count / limit);

    console.log('✅ [Company] Company history retrieved successfully');
    res.json({
      status: 'success',
      message: 'Company history retrieved successfully',
      data: {
        history,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          limit
        }
      }
    });
  } catch (error) {
    console.error('❌ [Company] Error fetching company history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company history',
      error: error.message
    });
  }
};
