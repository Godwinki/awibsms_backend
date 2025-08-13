// routes/publicDocumentRoutes.js
const express = require('express');
const router = express.Router();
const publicDocumentController = require('../controllers/publicDocumentController');
const auth = require('../middleware/authMiddleware');
const publicDocumentUpload = require('../middleware/publicDocumentMulter');

// PUBLIC ROUTES (No authentication required)

// Get all public documents - for website consumption
router.get('/public', publicDocumentController.getPublicDocuments);

// Download a public document - for website consumption
router.get('/download/:id', publicDocumentController.downloadDocument);

// Get categories and document types for public use
router.get('/categories', publicDocumentController.getCategories);
router.get('/document-types', publicDocumentController.getDocumentTypes);

// PROTECTED ROUTES (Authentication required - for CMS)

// Get all documents for CMS management
router.get('/cms', 
  auth.protect, 
  publicDocumentController.getAllDocuments
);

// Upload a new document
router.post('/upload', 
  auth.protect, 
  publicDocumentUpload.single('document'), 
  publicDocumentController.uploadDocument
);

// Update a document
router.put('/:id', 
  auth.protect, 
  publicDocumentController.updateDocument
);

// Delete a document
router.delete('/:id', 
  auth.protect, 
  publicDocumentController.deleteDocument
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      emoji: '❌',
      error: 'File too large. Maximum size is 50MB.'
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      emoji: '❌',
      error: error.message
    });
  }
  
  next(error);
});

module.exports = router;
