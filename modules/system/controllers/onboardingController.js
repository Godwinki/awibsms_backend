/**
 * Onboarding Controller
 * Handles SACCO organization setup and initialization
 */

const OnboardingService = require('../services/onboardingService');
const Joi = require('joi');

// Validation schema for onboarding data
const onboardingSchema = Joi.object({
  companyInfo: Joi.object({
    companyName: Joi.string().min(3).max(100).required(),
    companyCode: Joi.string().length(4).pattern(/^[A-Z0-9]{4}$/).required(),
    registrationNumber: Joi.string().max(50).allow('').optional(),
    taxIdentificationNumber: Joi.string().max(50).allow('').optional(),
    licenseNumber: Joi.string().max(50).allow('').optional(),
    establishedDate: Joi.alternatives().try(
      Joi.date().max('now'),
      Joi.string().allow('')
    ).optional(),
    headOfficeAddress: Joi.string().max(500).allow('').optional(),
    city: Joi.string().max(50).default('Arusha'),
    region: Joi.string().max(50).default('Arusha'),
    country: Joi.string().max(50).default('Tanzania'),
    primaryPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional(),
    primaryEmail: Joi.string().email().allow('').optional(),
    website: Joi.string().uri().allow('').optional()
  }).required(),

  mainBranchInfo: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    branchCode: Joi.string().length(4).pattern(/^[0-9]{4}$/).required(),
    displayName: Joi.string().max(150).allow('').optional(),
    region: Joi.string().max(50).default('Arusha'),
    district: Joi.string().max(50).allow('').optional(),
    ward: Joi.string().max(50).allow('').optional(),
    street: Joi.string().max(100).allow('').optional(),
    primaryPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    servicesOffered: Joi.array().items(Joi.string().valid(
      'savings', 'loans', 'shares', 'insurance', 'mobile_banking'
    )).default(['savings', 'loans', 'shares'])
  }).required(),

  adminUserInfo: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character'
      }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    nationalId: Joi.string().max(20).allow('').optional(),
    dateOfBirth: Joi.alternatives().try(
      Joi.date().max('now'),
      Joi.string().allow('')
    ).optional()
  }).required(),

  setupOptions: Joi.object({
    createSampleData: Joi.boolean().default(false),
    forcePasswordChange: Joi.boolean().default(true),
    enableNotifications: Joi.boolean().default(true),
    autoActivateFeatures: Joi.boolean().default(true)
  }).optional()
});

class OnboardingController {
  /**
   * Start SACCO onboarding process
   */
  static async startOnboarding(req, res) {
    try {
      // Validate input data
      const { error, value } = onboardingSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context.value
          }))
        });
      }

      // Check if system is already initialized
      const statusCheck = await OnboardingService.getSystemStatus();
      console.log('🔍 Controller Debug - Full statusCheck result:', JSON.stringify(statusCheck, null, 2));
      console.log('🔍 Controller Debug - statusCheck.success:', statusCheck.success);
      console.log('🔍 Controller Debug - statusCheck.data:', statusCheck.data);
      console.log('🔍 Controller Debug - statusCheck.data.needsOnboarding:', statusCheck.data?.needsOnboarding);
      console.log('🔍 Controller Debug - !statusCheck.data.needsOnboarding:', !statusCheck.data?.needsOnboarding);
      
      if (statusCheck.success && !statusCheck.data.needsOnboarding) {
        console.log('❌ Controller Debug - Blocking onboarding because needsOnboarding is false');
        return res.status(409).json({
          success: false,
          message: 'SACCO system is already initialized',
          currentStatus: 'initialized'
        });
      }
      
      console.log('✅ Controller Debug - Proceeding with onboarding because needsOnboarding is true');

      // Start onboarding process
      const result = await OnboardingService.completeSaccoOnboarding(value);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        message: 'SACCO onboarding completed successfully',
        data: result.data
      });

    } catch (error) {
      console.error('OnboardingController.startOnboarding error:', error);
      res.status(500).json({
        success: false,
        message: 'Onboarding process failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get system initialization status
   */
  static async getSystemStatus(req, res) {
    try {
      const result = await OnboardingService.getSystemStatus();

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message
      });

    } catch (error) {
      console.error('OnboardingController.getSystemStatus error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Validate onboarding data (for frontend real-time validation)
   */
  static async validateOnboardingData(req, res) {
    try {
      const { step, data } = req.body;

      let schema;
      switch (step) {
        case 'company':
          schema = onboardingSchema.extract('companyInfo');
          break;
        case 'branch':
          schema = onboardingSchema.extract('mainBranchInfo');
          break;
        case 'admin':
          schema = onboardingSchema.extract('adminUserInfo');
          break;
        default:
          schema = onboardingSchema;
      }

      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        return res.status(400).json({
          success: false,
          valid: false,
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          step
        });
      }

      res.json({
        success: true,
        valid: true,
        message: `${step} data is valid`,
        step
      });

    } catch (error) {
      console.error('OnboardingController.validateOnboardingData error:', error);
      res.status(500).json({
        success: false,
        valid: false,
        message: 'Validation error occurred',
        step: req.body.step
      });
    }
  }

  /**
   * Check if company code is available
   */
  static async checkCompanyCodeAvailability(req, res) {
    try {
      const { companyCode } = req.body;

      if (!companyCode) {
        return res.status(400).json({
          success: false,
          message: 'Company code is required'
        });
      }

      // For now, check against existing company (there should only be one)
      const { CompanySettings } = require('../../../models');
      const existingCompany = await CompanySettings.findOne({
        where: { companyCode }
      });

      res.json({
        success: true,
        available: !existingCompany,
        message: existingCompany 
          ? 'Company code is already taken' 
          : 'Company code is available'
      });

    } catch (error) {
      console.error('OnboardingController.checkCompanyCodeAvailability error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check company code availability',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if branch code is available
   */
  static async checkBranchCodeAvailability(req, res) {
    try {
      const { branchCode } = req.body;

      if (!branchCode) {
        return res.status(400).json({
          success: false,
          message: 'Branch code is required'
        });
      }

      const { Branch } = require('../../../models');
      const existingBranch = await Branch.findOne({
        where: { branchCode }
      });

      res.json({
        success: true,
        available: !existingBranch,
        message: existingBranch 
          ? 'Branch code is already taken' 
          : 'Branch code is available'
      });

    } catch (error) {
      console.error('OnboardingController.checkBranchCodeAvailability error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check branch code availability',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reset system (for development only)
   */
  static async resetSystem(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'System reset not allowed in production'
        });
      }

      const { confirmationCode } = req.body;
      const result = await OnboardingService.resetSystem(confirmationCode);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);

    } catch (error) {
      console.error('OnboardingController.resetSystem error:', error);
      res.status(500).json({
        success: false,
        message: 'System reset failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = OnboardingController;
