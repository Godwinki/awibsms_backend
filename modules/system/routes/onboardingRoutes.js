/**
 * Onboarding Routes
 * Handles SACCO initialization and setup
 */

const express = require('express');
const router = express.Router();
const OnboardingController = require('../controllers/onboardingController');
const rateLimit = require('express-rate-limit');

// Rate limiting for onboarding attempts
const onboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 onboarding attempts per IP per window
  message: {
    success: false,
    message: 'Too many onboarding attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// System status check (no authentication required)
router.get('/status', OnboardingController.getSystemStatus);

// Start onboarding process (no authentication required for initial setup)
router.post('/start', 
  onboardingLimiter,
  OnboardingController.startOnboarding
);

// Validate onboarding data (for real-time frontend validation)
router.post('/validate', OnboardingController.validateOnboardingData);

// Check company code availability
router.post('/check-company-code', OnboardingController.checkCompanyCodeAvailability);

// Check branch code availability
router.post('/check-branch-code', OnboardingController.checkBranchCodeAvailability);

// Reset system (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/reset', OnboardingController.resetSystem);
}

module.exports = router;
