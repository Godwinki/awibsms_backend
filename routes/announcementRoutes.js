// routes/announcementRoutes.js
const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const announcementMulter = require('../middleware/announcementMulter');

// Public routes (no authentication required)
router.get('/public', announcementController.getPublicAnnouncements);
router.get('/public/:id', announcementController.getPublicAnnouncement);
router.get('/categories', announcementController.getCategories);
router.get('/audiences', announcementController.getTargetAudiences);
router.get('/:id/banner', announcementController.downloadBanner);

// Protected routes (authentication required)
router.use(protect); // Apply authentication middleware to all routes below

// CMS management routes
router.get('/', announcementController.getAllAnnouncements);
router.get('/:id', announcementController.getAnnouncement);
router.post('/', announcementMulter.single('banner'), announcementController.createAnnouncement);
router.put('/:id', announcementMulter.single('banner'), announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);
router.patch('/:id/publish', announcementController.publishAnnouncement);

module.exports = router;
