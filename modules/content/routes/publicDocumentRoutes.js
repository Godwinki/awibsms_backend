// modules/content/routes/publicDocumentRoutes.js
const express = require('express');
const router = express.Router();
const publicDocumentController = require('../controllers/publicDocumentController');
const { protect } = require('../../auth/middleware/authMiddleware');
const { apiLimiter } = require('../../../core/middleware/rateLimiter');
const publicDocumentMulter = require('../../documents/middleware/publicDocumentMulter');

// Public routes (no authentication required)
router.get('/public', apiLimiter, publicDocumentController.getPublicDocuments);
router.get('/download/:id', apiLimiter, publicDocumentController.downloadDocument);

// Protected routes (require authentication)
router.use(protect);

// CMS management routes
router.get('/cms', apiLimiter, publicDocumentController.getAllDocuments);
router.post('/upload', apiLimiter, publicDocumentMulter.single('document'), publicDocumentController.uploadDocument);
router.put('/:id', apiLimiter, publicDocumentController.updateDocument);
router.delete('/:id', apiLimiter, publicDocumentController.deleteDocument);

// Additional utility routes
router.get('/categories', apiLimiter, publicDocumentController.getCategories);
router.get('/document-types', apiLimiter, publicDocumentController.getDocumentTypes);
router.get('/:id', apiLimiter, publicDocumentController.getDocumentById);

module.exports = router;
