const Joi = require('joi');

/**
 * Branch Validation Schema
 * Handles all validation logic for branch management
 */

// Phone number regex - International format
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Branch code regex - Exactly 4 digits
const branchCodeRegex = /^[0-9]{4}$/;

// Coordinates validation
const coordinateSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

// Operating hours validation
const operatingHoursSchema = Joi.object({
  monday: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    closed: Joi.boolean().default(false)
  }).optional(),
  tuesday: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    closed: Joi.boolean().default(false)
  }).optional(),
  wednesday: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    closed: Joi.boolean().default(false)
  }).optional(),
  thursday: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    closed: Joi.boolean().default(false)
  }).optional(),
  friday: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    closed: Joi.boolean().default(false)
  }).optional(),
  saturday: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    closed: Joi.boolean().default(true)
  }).optional(),
  sunday: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    closed: Joi.boolean().default(true)
  }).optional()
});

const branchSchema = Joi.object({
  // Required Fields
  companyId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid company ID format',
      'any.required': 'Company ID is required'
    }),

  branchCode: Joi.string()
    .pattern(branchCodeRegex)
    .required()
    .messages({
      'string.pattern.base': 'Branch code must be exactly 4 digits (e.g., 4001)',
      'any.required': 'Branch code is required'
    }),

  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Branch name is required',
      'string.min': 'Branch name must be at least 3 characters',
      'string.max': 'Branch name cannot exceed 100 characters'
    }),

  // Optional Fields
  displayName: Joi.string()
    .max(150)
    .allow('')
    .optional(),

  // Location Information
  region: Joi.string()
    .max(50)
    .default('Arusha')
    .allow('')
    .optional(),

  district: Joi.string()
    .max(50)
    .allow('')
    .optional(),

  ward: Joi.string()
    .max(50)
    .allow('')
    .optional(),

  street: Joi.string()
    .max(100)
    .allow('')
    .optional(),

  buildingName: Joi.string()
    .max(100)
    .allow('')
    .optional(),

  plotNumber: Joi.string()
    .max(50)
    .allow('')
    .optional(),

  postalAddress: Joi.string()
    .max(200)
    .allow('')
    .optional(),

  coordinates: coordinateSchema.optional(),

  // Contact Information
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

  email: Joi.string()
    .email()
    .max(100)
    .allow('')
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  // Management Information
  managerId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Invalid manager ID format'
    }),

  assistantManagerId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Invalid assistant manager ID format'
    }),

  // Operational Settings
  accountNumberPrefix: Joi.string()
    .length(4)
    .pattern(/^[0-9]{4}$/)
    .optional()
    .messages({
      'string.length': 'Account number prefix must be exactly 4 digits',
      'string.pattern.base': 'Account number prefix must contain only digits'
    }),

  lastAccountNumber: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional(),

  operatingHours: operatingHoursSchema.optional(),

  // Status and Configuration
  isActive: Joi.boolean()
    .default(true)
    .optional(),

  isHeadOffice: Joi.boolean()
    .default(false)
    .optional(),

  canProcessTransactions: Joi.boolean()
    .default(true)
    .optional(),

  canIssueLoans: Joi.boolean()
    .default(true)
    .optional(),

  canOpenAccounts: Joi.boolean()
    .default(true)
    .optional(),

  maxDailyTransactionAmount: Joi.number()
    .positive()
    .optional(),

  maxSingleTransactionAmount: Joi.number()
    .positive()
    .optional(),

  // Service Information
  servicesOffered: Joi.array()
    .items(Joi.string().valid(
      'savings', 
      'loans', 
      'shares', 
      'insurance', 
      'mobile_banking', 
      'atm_services',
      'foreign_exchange',
      'money_transfer'
    ))
    .optional(),

  branchType: Joi.string()
    .valid('MAIN', 'SUB_BRANCH', 'AGENT', 'MOBILE')
    .default('SUB_BRANCH')
    .optional(),

  // Additional Information
  description: Joi.string()
    .max(500)
    .optional(),

  establishedDate: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Established date cannot be in the future'
    })
});

// Validation for partial updates
const branchUpdateSchema = branchSchema.fork(
  ['companyId', 'branchCode', 'name'], 
  (schema) => schema.optional()
);

// Validation for branch code uniqueness check
const branchCodeSchema = Joi.object({
  branchCode: Joi.string()
    .pattern(branchCodeRegex)
    .required()
    .messages({
      'string.pattern.base': 'Branch code must be exactly 4 digits',
      'any.required': 'Branch code is required'
    }),
  excludeId: Joi.string().uuid().optional() // For updates
});

module.exports = {
  validateBranch: (data) => branchSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  }),
  
  validateBranchUpdate: (data) => branchUpdateSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  }),

  validateBranchCode: (data) => branchCodeSchema.validate(data),

  // Individual field validators for real-time validation
  validatePhone: (phone) => Joi.string().pattern(phoneRegex).validate(phone),
  validateEmail: (email) => Joi.string().email().validate(email),
  validateCoordinates: (coords) => coordinateSchema.validate(coords),
  validateOperatingHours: (hours) => operatingHoursSchema.validate(hours),

  // Business logic validators
  validateAccountPrefix: (prefix) => Joi.string().length(4).pattern(/^[0-9]{4}$/).validate(prefix),
  
  validateTransactionLimits: (data) => Joi.object({
    maxDailyTransactionAmount: Joi.number().positive().required(),
    maxSingleTransactionAmount: Joi.number().positive().max(Joi.ref('maxDailyTransactionAmount')).required()
  }).validate(data)
};
