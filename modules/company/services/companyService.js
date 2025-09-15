/**
 * Company Service Layer
 * Business logic for company management operations
 */

const { CompanySettings } = require('../../../models');
const { validateCompanySettings, validateCompanySettingsUpdate } = require('../validations/companyValidation');

class CompanyService {
  /**
   * Get company settings (singleton pattern - only one company per system)
   */
  static async getCompanySettings() {
    try {
      let company = await CompanySettings.findOne({
        order: [['createdAt', 'ASC']] // Get the first (and should be only) company
      });

      // If no company settings exist, create default ones
      if (!company) {
        company = await this.createDefaultCompanySettings();
      }

      return {
        success: true,
        data: company,
        message: 'Company settings retrieved successfully'
      };
    } catch (error) {
      console.error('CompanyService.getCompanySettings error:', error);
      return {
        success: false,
        message: 'Failed to retrieve company settings',
        error: error.message
      };
    }
  }

  /**
   * Create or update company settings
   */
  static async updateCompanySettings(updateData, userId = null) {
    try {
      // Validate the update data
      const { error, value } = validateCompanySettingsUpdate(updateData);
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

      // Get existing company or create new one
      let company = await CompanySettings.findOne();
      
      if (company) {
        // Update existing
        await company.update(value);
        await company.reload();
      } else {
        // Create new with defaults
        const { error: createError, value: createValue } = validateCompanySettings({
          ...this.getDefaultSettings(),
          ...value
        });
        
        if (createError) {
          return {
            success: false,
            message: 'Failed to create company settings',
            errors: createError.details.map(d => ({
              field: d.path.join('.'),
              message: d.message
            }))
          };
        }
        
        company = await CompanySettings.create(createValue);
      }

      return {
        success: true,
        data: company,
        message: company.isNewRecord ? 'Company settings created successfully' : 'Company settings updated successfully'
      };
    } catch (error) {
      console.error('CompanyService.updateCompanySettings error:', error);
      return {
        success: false,
        message: 'Failed to update company settings',
        error: error.message
      };
    }
  }

  /**
   * Update company logo
   */
  static async updateCompanyLogo(logoData) {
    try {
      const company = await CompanySettings.findOne();
      if (!company) {
        return {
          success: false,
          message: 'Company settings not found'
        };
      }

      // Delete old logo if exists
      if (company.logoUrl && company.logoUrl !== logoData.url) {
        // Implement logo cleanup logic here
        this.cleanupOldLogo(company.logoUrl);
      }

      await company.update({
        logoUrl: logoData.url,
        logoUploadedAt: new Date()
      });

      return {
        success: true,
        data: {
          logoUrl: company.logoUrl,
          logoUploadedAt: company.logoUploadedAt
        },
        message: 'Company logo updated successfully'
      };
    } catch (error) {
      console.error('CompanyService.updateCompanyLogo error:', error);
      return {
        success: false,
        message: 'Failed to update company logo',
        error: error.message
      };
    }
  }

  /**
   * Get company business rules
   */
  static async getBusinessRules() {
    try {
      const company = await CompanySettings.findOne({
        attributes: ['businessRules', 'updatedAt']
      });

      return {
        success: true,
        data: company?.businessRules || this.getDefaultBusinessRules(),
        lastUpdated: company?.updatedAt,
        message: 'Business rules retrieved successfully'
      };
    } catch (error) {
      console.error('CompanyService.getBusinessRules error:', error);
      return {
        success: false,
        message: 'Failed to retrieve business rules',
        error: error.message
      };
    }
  }

  /**
   * Update business rules
   */
  static async updateBusinessRules(newRules) {
    try {
      const company = await CompanySettings.findOne();
      if (!company) {
        return {
          success: false,
          message: 'Company settings not found'
        };
      }

      // Merge with existing rules
      const currentRules = company.businessRules || {};
      const updatedRules = { ...currentRules, ...newRules };

      await company.update({ businessRules: updatedRules });

      return {
        success: true,
        data: updatedRules,
        message: 'Business rules updated successfully'
      };
    } catch (error) {
      console.error('CompanyService.updateBusinessRules error:', error);
      return {
        success: false,
        message: 'Failed to update business rules',
        error: error.message
      };
    }
  }

  /**
   * Validate company code uniqueness
   */
  static async validateCompanyCode(companyCode, excludeId = null) {
    try {
      const whereClause = { companyCode };
      if (excludeId) {
        whereClause.id = { [require('sequelize').Op.ne]: excludeId };
      }

      const existingCompany = await CompanySettings.findOne({ where: whereClause });
      
      return {
        success: true,
        isUnique: !existingCompany,
        message: existingCompany ? 'Company code already exists' : 'Company code is available'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate company code',
        error: error.message
      };
    }
  }

  /**
   * Create default company settings
   */
  static async createDefaultCompanySettings() {
    const defaultSettings = this.getDefaultSettings();
    return await CompanySettings.create(defaultSettings);
  }

  /**
   * Get default company settings
   */
  static getDefaultSettings() {
    return {
      companyName: 'AWIB SACCOS Society Ltd',
      companyCode: 'AWIB',
      city: 'Arusha',
      region: 'Arusha',
      country: 'Tanzania',
      baseCurrency: 'TZS',
      financialYearStart: 1,
      accountNumberLength: 12,
      businessRules: this.getDefaultBusinessRules(),
      notificationSettings: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: false,
        autoReminders: true
      }
    };
  }

  /**
   * Get default business rules
   */
  static getDefaultBusinessRules() {
    return {
      membership: {
        maxMembershipFee: 50000, // TZS
        minSharesRequired: 10,
        maxSharesPerMember: 1000
      },
      loans: {
        maxLoanAmount: 10000000, // TZS 10M
        minLoanAmount: 100000,   // TZS 100K
        defaultInterestRate: 12, // 12% annually
        maxLoanTerm: 60         // 60 months
      },
      savings: {
        minSavingsBalance: 10000,      // TZS 10K
        maxDailyWithdrawal: 500000,    // TZS 500K
        savingsInterestRate: 6         // 6% annually
      },
      transactions: {
        maxDailyTransactionAmount: 1000000,  // TZS 1M
        maxSingleTransactionAmount: 500000,  // TZS 500K
        transactionFeePercentage: 0.5       // 0.5%
      }
    };
  }

  /**
   * Cleanup old logo file
   */
  static cleanupOldLogo(logoUrl) {
    try {
      // Extract filename from URL and delete physical file
      const filename = path.basename(logoUrl);
      const filePath = path.join(__dirname, '../../../uploads/company', filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Old logo deleted: ${filename}`);
      }
    } catch (error) {
      console.error('Failed to cleanup old logo:', error.message);
    }
  }
}

module.exports = CompanyService;
