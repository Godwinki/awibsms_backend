// modules/documents/routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../../auth/middleware/authMiddleware');
const { apiLimiter } = require('../../../core/middleware/rateLimiter');
const multer = require('../middleware/publicDocumentMulter');

// Public routes (none for documents - all require authentication)

// Protected routes
router.use(protect);

// Receipt CRUD operations
router.get('/receipts', apiLimiter, documentController.getAllReceipts);
router.get('/receipts/stats', apiLimiter, documentController.getReceiptStats);
router.get('/receipts/:id', apiLimiter, documentController.getReceiptById);
router.get('/receipts/:id/download', apiLimiter, documentController.downloadReceipt);
router.patch('/receipts/:id/verify', apiLimiter, documentController.verifyReceipt);
router.delete('/receipts/:id', apiLimiter, documentController.deleteReceipt);

// Expense request receipt routes
router.get('/expense-requests/:expenseRequestId/receipts', apiLimiter, documentController.getReceiptsByExpenseRequest);
router.post('/expense-requests/:expenseRequestId/receipts', apiLimiter, multer.single('receipt'), documentController.uploadReceipt);

module.exports = router;
