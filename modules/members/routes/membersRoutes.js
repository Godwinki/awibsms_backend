/**
 * Members Module Main Routes
 */

const express = require('express');
const router = express.Router();
const memberRoutes = require('./memberRoutes');
const memberUploadRoutes = require('./memberUploadRoutes');
const categoryRoutes = require('./categoryRoutes');

// Mount member routes
router.use('/', memberRoutes);
router.use('/uploads', memberUploadRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;
