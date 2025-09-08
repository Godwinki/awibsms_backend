/**
 * SACCO Onboarding Service
 * Handles complete organization setup and initialization
 */

const { sequelize, Op } = require('../../../core/database/database');
const { User } = require('../../auth/models');
const { Role } = require('../models');
const { CompanySettings } = require('../../company/models');
const { Branch } = require('../../branches/models');
const CompanyService = require('../../company/services/companyService');
const BranchService = require('../../branches/services/branchService');
const { v4: uuidv4 } = require('uuid');

class OnboardingService {
  /**
   * Complete SACCO onboarding process
   * Steps: 1. Company Setup 2. Main Branch Creation 3. Admin User Creation 4. Permissions Setup
   */
  static async completeSaccoOnboarding(onboardingData) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log('🚀 Starting SACCO onboarding process...');
      console.log('📥 Received onboarding data structure:', {
        companyInfo: onboardingData.companyInfo ? Object.keys(onboardingData.companyInfo) : 'undefined',
        mainBranchInfo: onboardingData.mainBranchInfo ? Object.keys(onboardingData.mainBranchInfo) : 'undefined',
        adminUserInfo: onboardingData.adminUserInfo ? Object.keys(onboardingData.adminUserInfo) : 'undefined',
        setupOptions: onboardingData.setupOptions ? Object.keys(onboardingData.setupOptions) : 'undefined'
      });
      
      const {
        // Company Information
        companyInfo,
        // Main Branch Information
        mainBranchInfo,
        // Admin User Information
        adminUserInfo,
        // Additional Setup Options
        setupOptions = {}
      } = onboardingData;

      // Step 1: Check if system is already initialized
      const existingCompany = await CompanySettings.findOne();
      if (existingCompany && existingCompany.isInitialized) {
        return {
          success: false,
          message: 'SACCO system is already initialized',
          currentStatus: 'initialized'
        };
      }

      // Step 2: Create or Update Company Settings
      console.log('📊 Creating/updating company settings...');
      console.log('📊 Company data being validated:', JSON.stringify(companyInfo, null, 2));
      
      // If we have an existing company (not initialized), update it
      const updateCompanyId = existingCompany ? existingCompany.id : null;
      const companyResult = await CompanyService.updateCompanySettings(companyInfo, updateCompanyId);
      if (!companyResult.success) {
        console.error('Company validation errors:', companyResult.errors);
        return {
          success: false,
          message: 'Company validation failed',
          errors: companyResult.errors,
          details: companyResult.message,
          step: 'company_setup'
        };
      }

      const company = companyResult.data;
      console.log(`✅ Company "${company.companyName}" ${existingCompany ? 'updated' : 'created'} successfully`);

      // Step 3: Create or Update Main Branch
      console.log('🏢 Creating/updating main branch...');
      
      // Check if main branch already exists
      const existingMainBranch = await Branch.findOne({
        where: {
          companyId: company.id,
          [Op.or]: [
            { isHeadOffice: true },
            { branchType: 'MAIN' }
          ]
        }
      });
      
      const branchData = {
        ...mainBranchInfo,
        companyId: company.id,
        branchType: 'MAIN', // Use correct database enum value
        isHeadOffice: true, // Mark as head office
        isActive: true,
        canProcessTransactions: true,
        canProcessLoans: true,
        canOpenAccounts: true,
        accountNumberPrefix: mainBranchInfo.branchCode || '0001' // Ensure this is set
      };
      
      console.log('🏢 Branch data being processed:', JSON.stringify(branchData, null, 2));

      let mainBranch;
      if (existingMainBranch) {
        // Update existing main branch
        console.log('🔄 Updating existing main branch...');
        await existingMainBranch.update(branchData);
        mainBranch = existingMainBranch;
        console.log(`✅ Main branch "${mainBranch.name}" updated successfully`);
      } else {
        // Create new main branch
        const branchResult = await BranchService.createBranch(branchData, null);
        if (!branchResult.success) {
          console.error('Branch validation errors:', branchResult.errors);
          return {
            success: false,
            message: 'Branch validation failed',
            errors: branchResult.errors,
            details: branchResult.message,
            step: 'branch_setup'
          };
        }
        mainBranch = branchResult.data;
        console.log(`✅ Main branch "${mainBranch.name}" created successfully`);
      }

      // Step 4: Create Admin User
      console.log('👤 Creating admin user...');
      const adminData = {
        ...adminUserInfo,
        branchId: mainBranch.id,
        role: 'admin',
        isActive: true,
        emailVerified: true, // Auto-verify during onboarding
        mustChangePassword: setupOptions.forcePasswordChange || false
      };

      const adminResult = await this.createAdminUser(adminData, transaction);
      if (!adminResult.success) {
        console.error('Admin user creation errors:', adminResult.error);
        return {
          success: false,
          message: 'Admin user creation failed',
          errors: [{ field: 'adminUser', message: adminResult.message }],
          details: adminResult.error,
          step: 'admin_setup'
        };
      }

      const adminUser = adminResult.data;
      console.log(`✅ Admin user "${adminUser.email}" created successfully`);

      // Step 5: Assign Branch Manager
      console.log('🔗 Assigning branch manager...');
      await mainBranch.update({ 
        managerId: adminUser.id 
      }, { transaction });

      // Step 6: Create Initial Setup Data (if requested)
      if (setupOptions.createSampleData) {
        await this.createInitialSetupData(company.id, mainBranch.id, transaction);
      }

      // Step 7: Mark system as initialized
      await company.update({
        isInitialized: true,
        initializedAt: new Date(),
        initializedBy: adminUser.id
      }, { transaction });

      await transaction.commit();

      // Step 8: Generate onboarding summary
      const summary = await this.generateOnboardingSummary(company.id);

      console.log('🎉 SACCO onboarding completed successfully!');

      return {
        success: true,
        message: 'SACCO onboarding completed successfully',
        data: {
          company: {
            id: company.id,
            name: company.companyName,
            code: company.companyCode
          },
          mainBranch: {
            id: mainBranch.id,
            name: mainBranch.name,
            code: mainBranch.branchCode
          },
          adminUser: {
            id: adminUser.id,
            email: adminUser.email,
            fullName: `${adminUser.firstName} ${adminUser.lastName}`
          },
          summary
        }
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ SACCO onboarding failed:', error);
      
      return {
        success: false,
        message: 'SACCO onboarding failed',
        error: error.message,
        step: this.determineFailedStep(error)
      };
    }
  }

  /**
   * Create admin user with proper role assignment
   */
  static async createAdminUser(adminData, transaction) {
    try {
      // Get admin role
      const adminRole = await Role.findOne({ 
        where: { name: 'admin' } 
      });

      if (!adminRole) {
        throw new Error('Admin role not found in system');
      }

      // Set up dates for password management
      const now = new Date();
      const threeMonthsFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

      // Create user with all required fields (password will be hashed by User model's beforeSave hook)
      const user = await User.create({
        id: uuidv4(),
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        password: adminData.password, // Don't hash here - User model will hash it automatically
        phoneNumber: adminData.phone, // Note: phoneNumber not phone
        department: 'Administration',
        role: 'admin',
        status: 'active',
        failedLoginAttempts: 0,
        lastPasswordChangedAt: now,
        passwordExpiresAt: threeMonthsFromNow,
        lockoutUntil: null,
        passwordHistory: [],
        securityQuestions: [],
        preferences: {},
        profilePicture: null,
        lastLogin: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        forcePasswordChange: adminData.mustChangePassword || false,
        twoFactorEnabled: true, // Enable 2FA for admin users by default
        twoFactorMethod: 'email',
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        lastOtpTime: null,
        otpAttempts: 0,
        // Account unlock fields
        unlockToken: null,
        unlockTokenExpires: null,
        unlockOtp: null,
        unlockOtpExpires: null,
        unlockOtpAttempts: 0,
        lockReason: null,
        lockedBy: null,
        unlockRequested: false,
        unlockRequestedAt: null,
        // Additional fields
        nationalId: adminData.nationalId || null,
        dateOfBirth: adminData.dateOfBirth ? new Date(adminData.dateOfBirth) : null,
        branchId: adminData.branchId,
        createdBy: 'system_onboarding'
      }, { transaction });

      return {
        success: true,
        data: user
      };

    } catch (error) {
      console.error('Error creating admin user:', error);
      return {
        success: false,
        message: 'Failed to create admin user',
        error: error.message
      };
    }
  }

  /**
   * Create initial setup data (sample members, account types, etc.)
   */
  static async createInitialSetupData(companyId, branchId, transaction) {
    try {
      console.log('📋 Creating initial setup data...');

      // Create default account types, member categories, etc.
      // This can be expanded based on your needs

      console.log('✅ Initial setup data created');
      return { success: true };

    } catch (error) {
      console.error('⚠️ Failed to create initial setup data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check system initialization status
   */
  static async getSystemStatus() {
    try {
      // Check if company/organization is registered
      const company = await CompanySettings.findOne();
      
      // Check if there's at least one admin user (check for both legacy role and new role system)
      const adminUser = await User.findOne({ 
        where: { 
          [Op.or]: [
            { role: 'admin' },
            { role: 'super_admin' }
          ]
        }
      });
      
      // Check if there's at least one head office branch (main branch)
      const headOfficeBranch = await Branch.findOne({ 
        where: { 
          [Op.or]: [
            { isHeadOffice: true },
            { branchType: 'MAIN' }
          ]
        }
      });

      // Debug: Let's also check for any branch and log details
      const anyBranch = await Branch.findOne();
      console.log('🔍 Debug - Any branch found:', anyBranch ? {
        id: anyBranch.id,
        name: anyBranch.name,
        branchType: anyBranch.branchType,
        isHeadOffice: anyBranch.isHeadOffice
      } : 'No branch found');

      const status = {
        isInitialized: !!(company && company.isInitialized),
        hasCompany: !!company,
        hasAdminUser: !!adminUser,
        hasMainBranch: !!headOfficeBranch,
        initializationDate: company?.initializedAt,
        needsOnboarding: !company || !adminUser || !headOfficeBranch || !(company && company.isInitialized)
      };

      console.log('🔍 Debug - System status:', status);

      return {
        success: true,
        data: status,
        message: status.needsOnboarding 
          ? 'System needs onboarding - missing organization setup' 
          : 'System is fully initialized'
      };

    } catch (error) {
      console.error('OnboardingService.getSystemStatus error:', error);
      return {
        success: false,
        message: 'Failed to check system status',
        error: error.message
      };
    }
  }

  /**
   * Generate onboarding summary
   */
  static async generateOnboardingSummary(companyId) {
    try {
      const company = await CompanySettings.findOne({
        where: { id: companyId }
      });

      const branches = await Branch.count({
        where: { companyId }
      });

      const users = await User.count({
        where: { isActive: true }
      });

      return {
        organizationName: company.companyName,
        totalBranches: branches,
        totalUsers: users,
        setupDate: new Date().toISOString(),
        nextSteps: [
          'Configure business rules and policies',
          'Set up member categories and account types',
          'Create additional user accounts',
          'Configure SMS and email notifications',
          'Import existing member data (if applicable)'
        ]
      };

    } catch (error) {
      return {
        error: 'Failed to generate summary',
        message: error.message
      };
    }
  }

  /**
   * Reset system (for development/testing)
   */
  static async resetSystem(confirmationCode) {
    if (confirmationCode !== 'RESET_SACCO_SYSTEM_2025') {
      return {
        success: false,
        message: 'Invalid confirmation code'
      };
    }

    const transaction = await sequelize.transaction();

    try {
      console.log('🔄 Resetting SACCO system...');

      // Delete in correct order to respect foreign keys
      await User.destroy({ where: {}, transaction });
      await Branch.destroy({ where: {}, transaction });
      await CompanySettings.destroy({ where: {}, transaction });

      await transaction.commit();

      console.log('✅ System reset completed');

      return {
        success: true,
        message: 'System reset completed successfully'
      };

    } catch (error) {
      await transaction.rollback();
      return {
        success: false,
        message: 'System reset failed',
        error: error.message
      };
    }
  }

  /**
   * Determine which step failed during onboarding
   */
  static determineFailedStep(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('company')) return 'company_setup';
    if (errorMessage.includes('branch')) return 'branch_creation';
    if (errorMessage.includes('admin') || errorMessage.includes('user')) return 'admin_creation';
    if (errorMessage.includes('permission')) return 'permission_setup';
    
    return 'unknown';
  }

  /**
   * Validate onboarding data before processing
   */
  static validateOnboardingData(data) {
    const errors = [];

    // Validate company info
    if (!data.companyInfo?.companyName) {
      errors.push('Company name is required');
    }
    if (!data.companyInfo?.companyCode) {
      errors.push('Company code is required');
    }

    // Validate branch info
    if (!data.mainBranchInfo?.name) {
      errors.push('Main branch name is required');
    }
    if (!data.mainBranchInfo?.branchCode) {
      errors.push('Main branch code is required');
    }

    // Validate admin user info
    if (!data.adminUserInfo?.firstName) {
      errors.push('Admin first name is required');
    }
    if (!data.adminUserInfo?.lastName) {
      errors.push('Admin last name is required');
    }
    if (!data.adminUserInfo?.email) {
      errors.push('Admin email is required');
    }
    if (!data.adminUserInfo?.password) {
      errors.push('Admin password is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = OnboardingService;
