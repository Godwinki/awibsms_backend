// models/CompanySettings.js
module.exports = (sequelize, DataTypes) => {
  const CompanySettings = sequelize.define('CompanySettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Basic Company Information
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'AWIB SACCO Society Ltd'
    },
    companyCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'AWIB'
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Short display name for UI'
    },
    registrationNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    taxIdentificationNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    establishedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    
    // Contact Information
    headOfficeAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      defaultValue: 'Arusha'
    },
    region: {
      type: DataTypes.STRING,
      defaultValue: 'Arusha'
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: 'Tanzania'
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    primaryPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    secondaryPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    primaryEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    secondaryEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Company description'
    },
    vision: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Company vision statement'
    },
    mission: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Company mission statement'
    },
    coreValues: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of core values'
    },
    
    // Regulatory Information
    regulatoryBody: {
      type: DataTypes.STRING,
      defaultValue: 'TCDC' // Tanzania Cooperative Development Commission
    },
    regulatoryLicense: {
      type: DataTypes.STRING,
      allowNull: true
    },
    licenseExpiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    
    // Financial Configuration
    baseCurrency: {
      type: DataTypes.STRING(3),
      defaultValue: 'TZS'
    },
    currencySymbol: {
      type: DataTypes.STRING(5),
      defaultValue: 'TSH'
    },
    financialYearStart: {
      type: DataTypes.INTEGER,
      defaultValue: 1 // January = 1
    },
    
    // Account Number Configuration
    accountNumberPrefix: {
      type: DataTypes.STRING(4),
      defaultValue: '4001' // Default branch code
    },
    accountNumberLength: {
      type: DataTypes.INTEGER,
      defaultValue: 12
    },
    
    // Branding
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Company logo URL'
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Legacy field - use logo instead'
    },
    faviconUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    primaryColor: {
      type: DataTypes.STRING(7),
      defaultValue: '#1e40af' // Blue
    },
    secondaryColor: {
      type: DataTypes.STRING(7),
      defaultValue: '#64748b' // Slate
    },
    
    // System Configuration
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isMultiBranch: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'Africa/Dar_es_Salaam'
    },
    language: {
      type: DataTypes.STRING(5),
      defaultValue: 'en_US'
    },
    
    // Additional Settings (JSON for flexibility)
    businessRules: {
      type: DataTypes.JSONB,
      defaultValue: {
        minimumSharesRequired: 100000, // TSH 100,000
        membershipFee: 50000, // TSH 50,000
        minLoanAmount: 100000,
        maxLoanAmount: 10000000,
        interestCalculationMethod: 'reducing_balance'
      }
    },
    
    // Notification Settings
    notificationSettings: {
      type: DataTypes.JSONB,
      defaultValue: {
        emailNotifications: true,
        smsNotifications: true,
        systemNotifications: true,
        reminderDays: [7, 3, 1] // Days before due dates
      }
    },
    
    // Integration Settings
    integrationSettings: {
      type: DataTypes.JSONB,
      defaultValue: {
        paymentGateway: null,
        bankingApi: null,
        smsProvider: null,
        emailProvider: null
      }
    },
    
    // System Initialization Tracking
    isInitialized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    initializedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    initializedBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'CompanySettings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['companyCode']
      }
    ]
  });

  CompanySettings.associate = (models) => {
    // Company has many branches
    if (models.Branch) {
      CompanySettings.hasMany(models.Branch, {
        foreignKey: 'companyId',
        as: 'branches'
      });
    }
  };

  return CompanySettings;
};
