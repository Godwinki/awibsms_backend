/**
 * Budget Module Main Routes
 */

const express = require('express');
const router = express.Router();
const budgetRoutes = require('./budgetRoutes');
const budgetCategoryRoutes = require('./budgetCategoryRoutes');

// Mount specific routes first (before parameterized routes)
router.use('/categories', budgetCategoryRoutes);
router.use('/', budgetRoutes);

module.exports = router;
