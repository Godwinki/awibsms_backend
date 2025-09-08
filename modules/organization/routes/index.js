/**
 * Organization Routes Index
 */

const express = require('express');
const router = express.Router();

const departmentRoutes = require('./departmentRoutes');
const companyRoutes = require('../../company/routes/companyRoutes');

// Base route handler
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Organization API',
    endpoints: {
      departments: '/api/v1/organization/departments',
      company: '/api/v1/organization/company'
    }
  });
});

// Handle POST requests to base endpoint
router.post('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Organization API POST endpoint',
    note: 'To create a department, use POST /api/v1/organization/departments',
    data: req.body
  });
});

// Mount sub-routes
router.use('/departments', departmentRoutes);
router.use('/company', companyRoutes);

module.exports = router;
