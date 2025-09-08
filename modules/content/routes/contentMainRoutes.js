/**
 * Content Module Main Routes
 */

const express = require('express');
const router = express.Router();
const blogRoutes = require('./blogRoutes');
const announcementRoutes = require('./announcementRoutes');
const documentRoutes = require('./documentRoutes');
const publicDocumentRoutes = require('./publicDocumentRoutes');

// Mount content routes
router.use('/blogs', blogRoutes);
router.use('/announcements', announcementRoutes);
router.use('/documents', documentRoutes);
router.use('/public-documents', publicDocumentRoutes);

module.exports = router;
