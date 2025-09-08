/**
 * Validation Middleware Factory
 * Creates reusable validation middleware for different schemas
 */

const createValidationMiddleware = (validationFunction, options = {}) => {
  const {
    property = 'body', // 'body', 'query', 'params'
    allowUnknown = false,
    abortEarly = false
  } = options;

  return (req, res, next) => {
    const dataToValidate = req[property];
    
    try {
      const { error, value } = validationFunction(dataToValidate);
      
      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages,
          details: {
            invalidFields: errorMessages.length,
            firstError: errorMessages[0]?.message
          }
        });
      }

      // Replace the original data with validated/sanitized data
      req[property] = value;
      next();
      
    } catch (validationError) {
      console.error('Validation middleware error:', validationError);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error',
        error: process.env.NODE_ENV === 'development' ? validationError.message : undefined
      });
    }
  };
};

/**
 * Real-time field validation for frontend
 */
const createFieldValidator = (validationFunction) => {
  return (req, res) => {
    const { field, value } = req.body;
    
    try {
      const { error } = validationFunction(value);
      
      if (error) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: error.details[0].message,
          field
        });
      }

      return res.json({
        success: true,
        valid: true,
        message: 'Field is valid',
        field
      });
      
    } catch (validationError) {
      return res.status(500).json({
        success: false,
        valid: false,
        message: 'Validation error occurred',
        field
      });
    }
  };
};

/**
 * Conditional validation middleware
 * Only validates if certain conditions are met
 */
const createConditionalValidation = (condition, validationFunction, options = {}) => {
  return (req, res, next) => {
    if (!condition(req)) {
      return next(); // Skip validation
    }
    
    return createValidationMiddleware(validationFunction, options)(req, res, next);
  };
};

module.exports = {
  createValidationMiddleware,
  createFieldValidator,
  createConditionalValidation,
  
  // Common validation responses
  validationResponse: {
    success: (data, message = 'Validation successful') => ({
      success: true,
      message,
      data
    }),
    
    error: (errors, message = 'Validation failed') => ({
      success: false,
      message,
      errors
    })
  }
};
