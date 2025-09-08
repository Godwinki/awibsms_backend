/**
 * Branch Service Layer
 * Business logic for branch management operations
 */

const { Branch, CompanySettings, User } = require('../../../models');
const { validateBranch, validateBranchUpdate } = require('../validations/branchValidation');
const { Op } = require('sequelize');

class BranchService {
  /**
   * Get all branches with optional filtering
   */
  static async getAllBranches(filters = {}) {
    try {
      const {
        region,
        isActive = true,
        branchType,
        includeInactive = false,
        search,
        page = 1,
        limit = 50
      } = filters;

      // Build where clause
      const whereClause = {};
      
      if (!includeInactive && isActive !== undefined) {
        whereClause.isActive = isActive;
      }
      
      if (region) {
        whereClause.region = region;
      }
      
      if (branchType) {
        whereClause.branchType = branchType;
      }
      
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { branchCode: { [Op.iLike]: `%${search}%` } },
          { displayName: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Calculate pagination
      const offset = (page - 1) * limit;

      const { count, rows: branches } = await Branch.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: CompanySettings,
            as: 'company',
            attributes: ['companyName', 'companyCode']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          }
        ],
        order: [
          ['branchType', 'ASC'],
          ['name', 'ASC']
        ],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: {
          branches,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        },
        message: 'Branches retrieved successfully'
      };
    } catch (error) {
      console.error('BranchService.getAllBranches error:', error);
      return {
        success: false,
        message: 'Failed to retrieve branches',
        error: error.message
      };
    }
  }

  /**
   * Get branch by ID
   */
  static async getBranchById(branchId) {
    try {
      const branch = await Branch.findByPk(branchId, {
        include: [
          {
            model: CompanySettings,
            as: 'company',
            attributes: ['companyName', 'companyCode']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            required: false
          },
          {
            model: User,
            as: 'assistantManager',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            required: false
          }
        ]
      });

      if (!branch) {
        return {
          success: false,
          message: 'Branch not found'
        };
      }

      return {
        success: true,
        data: branch,
        message: 'Branch retrieved successfully'
      };
    } catch (error) {
      console.error('BranchService.getBranchById error:', error);
      return {
        success: false,
        message: 'Failed to retrieve branch',
        error: error.message
      };
    }
  }

  /**
   * Create new branch
   */
  static async createBranch(branchData, userId = null) {
    try {
      // Validate branch data
      const { error, value } = validateBranch(branchData);
      if (error) {
        return {
          success: false,
          message: 'Validation failed',
          errors: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        };
      }

      // Check if branch code is unique
      const existingBranch = await Branch.findOne({
        where: { branchCode: value.branchCode }
      });

      if (existingBranch) {
        return {
          success: false,
          message: 'Branch code already exists',
          field: 'branchCode'
        };
      }

      // Ensure company exists
      const company = await CompanySettings.findByPk(value.companyId);
      if (!company) {
        return {
          success: false,
          message: 'Company not found',
          field: 'companyId'
        };
      }

      // Set default account number prefix to branch code if not provided
      if (!value.accountNumberPrefix) {
        value.accountNumberPrefix = value.branchCode;
      }

      // Create the branch
      const branch = await Branch.create(value);

      // Reload with associations
      await branch.reload({
        include: [
          { model: CompanySettings, as: 'company' },
          { model: User, as: 'manager', required: false }
        ]
      });

      return {
        success: true,
        data: branch,
        message: 'Branch created successfully'
      };
    } catch (error) {
      console.error('BranchService.createBranch error:', error);
      return {
        success: false,
        message: 'Failed to create branch',
        error: error.message
      };
    }
  }

  /**
   * Update branch
   */
  static async updateBranch(branchId, updateData, userId = null) {
    try {
      // Validate update data
      const { error, value } = validateBranchUpdate(updateData);
      if (error) {
        return {
          success: false,
          message: 'Validation failed',
          errors: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        };
      }

      // Find the branch
      const branch = await Branch.findByPk(branchId);
      if (!branch) {
        return {
          success: false,
          message: 'Branch not found'
        };
      }

      // Check branch code uniqueness if being updated
      if (value.branchCode && value.branchCode !== branch.branchCode) {
        const existingBranch = await Branch.findOne({
          where: { 
            branchCode: value.branchCode,
            id: { [Op.ne]: branchId }
          }
        });

        if (existingBranch) {
          return {
            success: false,
            message: 'Branch code already exists',
            field: 'branchCode'
          };
        }
      }

      // Update the branch
      await branch.update(value);
      await branch.reload({
        include: [
          { model: CompanySettings, as: 'company' },
          { model: User, as: 'manager', required: false },
          { model: User, as: 'assistantManager', required: false }
        ]
      });

      return {
        success: true,
        data: branch,
        message: 'Branch updated successfully'
      };
    } catch (error) {
      console.error('BranchService.updateBranch error:', error);
      return {
        success: false,
        message: 'Failed to update branch',
        error: error.message
      };
    }
  }

  /**
   * Delete/Deactivate branch
   */
  static async deleteBranch(branchId, softDelete = true) {
    try {
      const branch = await Branch.findByPk(branchId);
      if (!branch) {
        return {
          success: false,
          message: 'Branch not found'
        };
      }

      // Check if branch has active members or accounts
      // TODO: Add checks for active members, accounts, transactions

      if (softDelete) {
        await branch.update({ 
          isActive: false,
          canProcessTransactions: false,
          deactivatedAt: new Date()
        });
        
        return {
          success: true,
          message: 'Branch deactivated successfully'
        };
      } else {
        await branch.destroy();
        return {
          success: true,
          message: 'Branch deleted successfully'
        };
      }
    } catch (error) {
      console.error('BranchService.deleteBranch error:', error);
      return {
        success: false,
        message: 'Failed to delete branch',
        error: error.message
      };
    }
  }

  /**
   * Generate new account number for branch
   */
  static async generateAccountNumber(branchId) {
    try {
      const branch = await Branch.findByPk(branchId);
      if (!branch) {
        return {
          success: false,
          message: 'Branch not found'
        };
      }

      if (!branch.isActive || !branch.canProcessTransactions) {
        return {
          success: false,
          message: 'Branch is not operational'
        };
      }

      const accountNumber = await branch.generateAccountNumber();
      
      return {
        success: true,
        data: { accountNumber },
        message: 'Account number generated successfully'
      };
    } catch (error) {
      console.error('BranchService.generateAccountNumber error:', error);
      return {
        success: false,
        message: 'Failed to generate account number',
        error: error.message
      };
    }
  }

  /**
   * Get branches by region
   */
  static async getBranchesByRegion(region) {
    try {
      const branches = await Branch.findAll({
        where: { 
          region,
          isActive: true 
        },
        include: [
          {
            model: User,
            as: 'manager',
            attributes: ['firstName', 'lastName', 'phone'],
            required: false
          }
        ],
        order: [['name', 'ASC']]
      });

      return {
        success: true,
        data: branches,
        message: `Branches in ${region} retrieved successfully`
      };
    } catch (error) {
      console.error('BranchService.getBranchesByRegion error:', error);
      return {
        success: false,
        message: 'Failed to retrieve branches by region',
        error: error.message
      };
    }
  }

  /**
   * Validate branch code uniqueness
   */
  static async validateBranchCode(branchCode, excludeId = null) {
    try {
      const whereClause = { branchCode };
      if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
      }

      const existingBranch = await Branch.findOne({ where: whereClause });
      
      return {
        success: true,
        isUnique: !existingBranch,
        message: existingBranch ? 'Branch code already exists' : 'Branch code is available'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate branch code',
        error: error.message
      };
    }
  }

  /**
   * Get branch statistics
   */
  static async getBranchStatistics(branchId) {
    try {
      const branch = await Branch.findByPk(branchId);
      if (!branch) {
        return {
          success: false,
          message: 'Branch not found'
        };
      }

      // TODO: Add actual statistics when Member, Account, Transaction models are available
      const stats = {
        totalMembers: 0,
        totalAccounts: 0,
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        branchInfo: {
          name: branch.name,
          code: branch.branchCode,
          region: branch.region,
          isActive: branch.isActive
        }
      };

      return {
        success: true,
        data: stats,
        message: 'Branch statistics retrieved successfully'
      };
    } catch (error) {
      console.error('BranchService.getBranchStatistics error:', error);
      return {
        success: false,
        message: 'Failed to retrieve branch statistics',
        error: error.message
      };
    }
  }

  /**
   * Create a new branch with initial setup and multi-tenancy support
   */
  static async createBranchWithSetup(branchData, adminData = null) {
    const transaction = await Branch.sequelize.transaction();
    
    try {
      // 1. Generate branch code if not provided
      if (!branchData.branchCode) {
        branchData.branchCode = await this.generateUniqueBranchCode(branchData.name);
      }

      // 2. Validate company exists
      const company = await CompanySettings.findByPk(branchData.companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // 3. Create branch
      const branch = await Branch.create({
        ...branchData,
        isActive: true,
        status: 'active'
      }, { transaction });

      console.log(`✅ Created branch: ${branch.name} (${branch.branchCode})`);

      // 4. Create initial admin user if provided
      let adminUser = null;
      if (adminData) {
        adminUser = await this.createBranchAdmin(branch.id, adminData, transaction);
        
        // Update branch with manager
        await branch.update({
          managerId: adminUser.id
        }, { transaction });
      }

      await transaction.commit();

      return {
        success: true,
        data: {
          branch: branch.toJSON(),
          adminUser: adminUser ? adminUser.toJSON() : null
        },
        message: 'Branch created successfully with multi-tenant setup'
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Branch creation failed:', error);
      return {
        success: false,
        message: 'Failed to create branch',
        error: error.message
      };
    }
  }

  /**
   * Create branch admin user
   */
  static async createBranchAdmin(branchId, adminData, transaction) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(adminData.password || 'Admin123!', 12);
    
    const adminUser = await User.create({
      branchId,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      email: adminData.email,
      password: hashedPassword,
      phoneNumber: adminData.phoneNumber,
      department: 'Management',
      role: 'admin',
      status: 'active',
      passwordChangeRequired: true
    }, { transaction });

    console.log(`✅ Created branch admin: ${adminUser.email}`);
    return adminUser;
  }

  /**
   * Generate unique branch code
   */
  static async generateUniqueBranchCode(branchName) {
    let attempts = 0;
    let branchCode;
    
    do {
      branchCode = this.generateCodeFromName(branchName, attempts);
      const existing = await Branch.findOne({ where: { branchCode } });
      
      if (!existing) {
        return branchCode;
      }
      
      attempts++;
    } while (attempts < 10);
    
    throw new Error('Could not generate unique branch code');
  }

  /**
   * Generate code from branch name
   */
  static generateCodeFromName(name, attempt = 0) {
    // Take first 2-3 letters of each word
    const words = name.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/);
    let code = '';
    
    if (words.length === 1) {
      code = words[0].substring(0, 4);
    } else {
      code = words.map(word => word.substring(0, 2)).join('');
    }
    
    // Ensure 4 characters max
    code = code.substring(0, 4);
    
    // Add attempt number if needed
    if (attempt > 0) {
      code = code.substring(0, 3) + attempt;
    }
    
    return code;
  }

  /**
   * Get branch-specific data with multi-tenant filtering
   */
  static async getBranchData(branchId, options = {}) {
    try {
      const { 
        includeUsers = false,
        includeMembers = false,
        includeAccounts = false,
        includeStats = false 
      } = options;

      const branch = await Branch.findByPk(branchId);
      if (!branch) {
        return {
          success: false,
          message: 'Branch not found'
        };
      }

      const result = {
        branch: branch.toJSON()
      };

      // Include users if requested
      if (includeUsers) {
        result.users = await User.scope({ method: ['byBranch', branchId] }).findAll();
      }

      // Include members if requested
      if (includeMembers) {
        const { Member } = require('../../members/models');
        result.members = await Member.scope({ method: ['byBranch', branchId] }).findAll();
      }

      // Include accounts if requested
      if (includeAccounts) {
        const { MemberAccount } = require('../../members/models');
        result.accounts = await MemberAccount.scope({ method: ['byBranch', branchId] }).findAll();
      }

      // Include statistics if requested
      if (includeStats) {
        result.stats = await this.getBranchStatsMultiTenant(branchId);
      }

      return {
        success: true,
        data: result,
        message: 'Branch data retrieved successfully'
      };

    } catch (error) {
      console.error('BranchService.getBranchData error:', error);
      return {
        success: false,
        message: 'Failed to retrieve branch data',
        error: error.message
      };
    }
  }

  /**
   * Get multi-tenant aware branch statistics
   */
  static async getBranchStatsMultiTenant(branchId) {
    try {
      const { Member, MemberAccount, Transaction } = require('../../../models');
      
      const [
        totalUsers,
        activeUsers,
        totalMembers,
        activeMembers,
        totalAccounts,
        activeAccounts,
        totalBalance,
        transactionCount
      ] = await Promise.all([
        User.count({ where: { branchId } }),
        User.count({ where: { branchId, status: 'active' } }),
        Member.count({ where: { branchId } }),
        Member.count({ where: { branchId, status: 'ACTIVE' } }),
        MemberAccount.count({ where: { branchId } }),
        MemberAccount.count({ where: { branchId, status: 'ACTIVE' } }),
        MemberAccount.sum('balance', { where: { branchId, status: 'ACTIVE' } }),
        Transaction.count({ where: { branchId } })
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        members: {
          total: totalMembers,
          active: activeMembers
        },
        accounts: {
          total: totalAccounts,
          active: activeAccounts
        },
        transactions: {
          total: transactionCount
        },
        financials: {
          totalBalance: totalBalance || 0
        }
      };

    } catch (error) {
      console.error('Error getting branch stats:', error);
      throw error;
    }
  }

  /**
   * Update branch status
   */
  static async updateBranchStatus(branchId, status) {
    try {
      const branch = await Branch.findByPk(branchId);
      
      if (!branch) {
        return {
          success: false,
          message: 'Branch not found'
        };
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: 'Invalid status. Must be one of: active, inactive, suspended'
        };
      }

      // Update status and isActive field
      await branch.update({
        status: status,
        isActive: status === 'active'
      });

      return {
        success: true,
        data: branch,
        message: 'Branch status updated successfully'
      };

    } catch (error) {
      console.error('BranchService.updateBranchStatus error:', error);
      return {
        success: false,
        message: 'Failed to update branch status',
        error: error.message
      };
    }
  }
}

module.exports = BranchService;
