const Joi = require('joi');

/**
 * Company Settings Validation Schema
 * Handles all validation logic for company configuration
 */

// Phone number regex - International format
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Company code regex - 2-10 uppercase letters/numbers
const companyCodeRegex = /^[A-Z0-9]{2,10}$/;

// URL validation regex
const urlRegex = /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/;

const companySettingsSchema = Joi.object({
  // Basic Company Information
  companyName: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Company name is required',
      'string.min': 'Company name must be at least 3 characters',
      'string.max': 'Company name cannot exceed 100 characters'
    }),

  companyCode: Joi.string()
    .pattern(companyCodeRegex)
    .required()
    .messages({
      'string.pattern.base': 'Company code must be 2-10 uppercase letters/numbers',
      'string.empty': 'Company code is required'
    }),

  registrationNumber: Joi.string()
    .max(50)
    .allow('')
    .optional(),

  taxIdentificationNumber: Joi.string()
    .max(50)
    .allow('')
    .optional(),

  licenseNumber: Joi.string()
    .max(50)
    .allow('')
    .optional(),

  establishedDate: Joi.alternatives()
    .try(
      Joi.date().max('now'),
      Joi.string().allow('').optional()
    )
    .optional()
    .messages({
      'date.max': 'Established date cannot be in the future'
    }),

  // Contact Information
  headOfficeAddress: Joi.string()
    .max(500)
    .allow('')
    .optional(),

  city: Joi.string()
    .max(50)
    .optional(),

  region: Joi.string()
    .max(50)
    .optional(),

  country: Joi.string()
    .max(50)
    .default('Tanzania')
    .optional(),

  postalCode: Joi.string()
    .max(20)
    .allow('')
    .optional(),

  primaryPhone: Joi.string()
    .pattern(phoneRegex)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (e.g., +255123456789)'
    }),

  secondaryPhone: Joi.string()
    .pattern(phoneRegex)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number (e.g., +255123456789)'
    }),

  primaryEmail: Joi.string()
    .email()
    .max(100)
    .allow('')
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  secondaryEmail: Joi.string()
    .email()
    .max(100)
    .allow('')
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  website: Joi.string()
    .pattern(urlRegex)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid website URL (e.g., https://example.com)'
    }),

  // Financial Settings
  baseCurrency: Joi.string()
    .length(3)
    .uppercase()
    .default('TZS')
    .messages({
      'string.length': 'Currency code must be exactly 3 characters (e.g., TZS, USD)'
    }),

  financialYearStart: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .default(1)
    .messages({
      'number.min': 'Financial year start must be between 1 and 12',
      'number.max': 'Financial year start must be between 1 and 12'
    }),

  accountNumberLength: Joi.number()
    .integer()
    .min(8)
    .max(20)
    .default(12)
    .messages({
      'number.min': 'Account number length must be at least 8 digits',
      'number.max': 'Account number length cannot exceed 20 digits'
    }),

  // Business Rules (JSONB validation)
  businessRules: Joi.object({
    maxMembershipFee: Joi.number().positive().optional(),
    minSharesRequired: Joi.number().integer().min(1).optional(),
    maxLoanAmount: Joi.number().positive().optional(),
    maxSavingsWithdrawal: Joi.number().positive().optional(),
    interestRates: Joi.object({
      savings: Joi.number().min(0).max(100).optional(),
      loans: Joi.number().min(0).max(100).optional()
    }).optional()
  }).optional(),

  // Notification Settings
  notificationSettings: Joi.object({
    emailNotifications: Joi.boolean().default(true),
    smsNotifications: Joi.boolean().default(true),
    pushNotifications: Joi.boolean().default(false),
    autoReminders: Joi.boolean().default(true)
  }).optional()
});

// Validation for partial updates
const companySettingsUpdateSchema = companySettingsSchema.fork(
  ['companyName', 'companyCode'], 
  (schema) => schema.optional()
);

module.exports = {
  validateCompanySettings: (data) => companySettingsSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  }),
  
  validateCompanySettingsUpdate: (data) => companySettingsUpdateSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  }),

  // Individual field validators for real-time validation
  validateCompanyCode: (code) => Joi.string().pattern(companyCodeRegex).validate(code),
  validateEmail: (email) => Joi.string().email().validate(email),
  validatePhone: (phone) => Joi.string().pattern(phoneRegex).validate(phone),
  validateUrl: (url) => Joi.string().pattern(urlRegex).validate(url)
};
