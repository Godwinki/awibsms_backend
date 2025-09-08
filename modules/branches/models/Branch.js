// models/Branch.js
module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define('Branch', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'CompanySettings',
        key: 'id'
      }
    },
    // Branch Identification
    branchCode: {
      type: DataTypes.STRING(4),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true // e.g., "Arusha Main Branch"
    },
    
    // Location Information
    region: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Arusha'
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ward: {
      type: DataTypes.STRING,
      allowNull: true
    },
    street: {
      type: DataTypes.STRING,
      allowNull: true
    },
    physicalAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    postalAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Contact Information
    primaryPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    secondaryPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    
    // Management Information
    managerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    assistantManagerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    // Operational Information
    establishedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    operationalStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    branchType: {
      type: DataTypes.ENUM('MAIN', 'SUB_BRANCH', 'AGENT', 'MOBILE'),
      defaultValue: 'SUB_BRANCH'
    },
    
    // Status and Configuration
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'closed'),
      defaultValue: 'active',
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isHeadOffice: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    canOpenAccounts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    canProcessLoans: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    canProcessTransactions: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // Account Number Configuration
    accountNumberPrefix: {
      type: DataTypes.STRING(4),
      allowNull: false,
      get() {
        return this.getDataValue('accountNumberPrefix') || this.getDataValue('branchCode');
      }
    },
    lastAccountNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    // Geographic Coordinates (for mapping)
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    
    // Operating Hours
    operatingHours: {
      type: DataTypes.JSONB,
      defaultValue: {
        monday: { open: '08:00', close: '17:00', isOpen: true },
        tuesday: { open: '08:00', close: '17:00', isOpen: true },
        wednesday: { open: '08:00', close: '17:00', isOpen: true },
        thursday: { open: '08:00', close: '17:00', isOpen: true },
        friday: { open: '08:00', close: '17:00', isOpen: true },
        saturday: { open: '08:00', close: '13:00', isOpen: true },
        sunday: { open: '00:00', close: '00:00', isOpen: false }
      }
    },
    
    // Additional Configuration
    configuration: {
      type: DataTypes.JSONB,
      defaultValue: {
        maxDailyTransactionAmount: 10000000, // TSH 10M
        maxLoanAmount: 50000000, // TSH 50M
        requiresApprovalAbove: 5000000, // TSH 5M
        allowedServices: ['accounts', 'loans', 'deposits', 'withdrawals'],
        securityLevel: 'standard'
      }
    }
  }, {
    tableName: 'Branches',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['branchCode']
      },
      {
        fields: ['companyId']
      },
      {
        fields: ['region', 'district']
      },
      {
        fields: ['isActive']
      }
    ],
    hooks: {
      beforeCreate: async (branch, options) => {
        // Set accountNumberPrefix to branchCode if not provided
        if (!branch.accountNumberPrefix) {
          branch.accountNumberPrefix = branch.branchCode;
        }
      }
    }
  });

  Branch.associate = (models) => {
    // Branch belongs to Company
    if (models.CompanySettings) {
      Branch.belongsTo(models.CompanySettings, {
        foreignKey: 'companyId',
        as: 'company'
      });
    }

    // Branch has a manager (User) - optional for now
    if (models.User) {
      Branch.belongsTo(models.User, {
        foreignKey: 'managerId',
        as: 'manager'
      });
    }

    // Branch has an assistant manager (User) - optional for now
    if (models.User) {
      Branch.belongsTo(models.User, {
        foreignKey: 'assistantManagerId',
        as: 'assistantManager'
      });
    }

    // Branch has many users
    if (models.User) {
      Branch.hasMany(models.User, {
        foreignKey: 'branchId',
        as: 'users'
      });
    }

    // Branch has many members
    if (models.Member) {
      Branch.hasMany(models.Member, {
        foreignKey: 'branchId',
        as: 'members'
      });
    }

    // Branch has many member accounts
    if (models.MemberAccount) {
      Branch.hasMany(models.MemberAccount, {
        foreignKey: 'branchId',
        as: 'accounts'
      });
    }

    // Branch has many transactions
    if (models.Transaction) {
      Branch.hasMany(models.Transaction, {
        foreignKey: 'branchId',
        as: 'transactions'
      });
    }

    // Branch has many contact groups
    if (models.ContactGroup) {
      Branch.hasMany(models.ContactGroup, {
        foreignKey: 'branchId',
        as: 'contactGroups'
      });
    }

    // Branch has many contact categories
    if (models.ContactCategory) {
      Branch.hasMany(models.ContactCategory, {
        foreignKey: 'branchId',
        as: 'contactCategories'
      });
    }

    // Branch has many SMS messages
    if (models.SmsMessage) {
      Branch.hasMany(models.SmsMessage, {
        foreignKey: 'branchId',
        as: 'smsMessages'
      });
    }
  };

  // Class methods
  Branch.findByCode = function(branchCode) {
    return this.findOne({
      where: { branchCode, isActive: true }
    });
  };

  Branch.findByRegion = function(region) {
    return this.findAll({
      where: { region, isActive: true },
      order: [['name', 'ASC']]
    });
  };

  Branch.getActiveBranches = function() {
    return this.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
  };

  // Instance methods
  Branch.prototype.generateAccountNumber = async function() {
    const nextNumber = this.lastAccountNumber + 1;
    await this.update({ lastAccountNumber: nextNumber });
    
    const year = new Date().getFullYear().toString().slice(-2);
    const paddedNumber = nextNumber.toString().padStart(6, '0');
    
    return `${this.branchCode}${year}${paddedNumber}`;
  };

  Branch.prototype.isOperational = function() {
    return this.isActive && this.canProcessTransactions;
  };

  return Branch;
};
