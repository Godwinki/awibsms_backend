// modules/payments/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../../auth/middleware/authMiddleware');
const { apiLimiter } = require('../../../core/middleware/rateLimiter');

// Public routes (none for payments - all require authentication)

// Protected routes
router.use(protect);

// Payment CRUD operations
router.get('/', apiLimiter, paymentController.getAllPayments);
router.get('/stats', apiLimiter, paymentController.getPaymentStats);
router.get('/:id', apiLimiter, paymentController.getPaymentById);
router.post('/', apiLimiter, paymentController.createPayment);
router.patch('/:id/status', apiLimiter, paymentController.updatePaymentStatus);
router.delete('/:id', apiLimiter, paymentController.deletePayment);

// Member-specific payment routes
router.get('/member/:memberId', apiLimiter, paymentController.getPaymentsByMember);
router.post('/member/:memberId/initial-payment', apiLimiter, paymentController.processInitialPayment);

module.exports = router;
