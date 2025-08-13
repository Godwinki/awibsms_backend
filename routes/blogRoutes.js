// routes/blogRoutes.js
const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { protect } = require('../middleware/authMiddleware');
const blogMulter = require('../middleware/blogMulter');

// Public routes (no authentication required)
router.get('/public', blogController.getPublicBlogs);
router.get('/public/:identifier', blogController.getPublicBlog);
router.get('/public/featured', blogController.getFeaturedBlogs);
router.get('/categories', blogController.getCategories);
router.get('/tags', blogController.getTags);
router.get('/:id/image', blogController.downloadFeaturedImage);

// Protected routes (authentication required)
router.use(protect); // Apply authentication middleware to all routes below

// CMS management routes
router.get('/', blogController.getAllBlogs);
router.get('/stats', blogController.getBlogStats);
router.get('/:id', blogController.getBlog);
router.post('/', blogMulter.single('featuredImage'), blogController.createBlog);
router.put('/:id', blogMulter.single('featuredImage'), blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);
router.patch('/:id/publish', blogController.publishBlog);
router.post('/validate-slug', blogController.validateSlug);
router.post('/generate-slug', blogController.generateSlug);

module.exports = router;
