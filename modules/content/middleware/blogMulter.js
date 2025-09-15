// middleware/blogMulter.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/blogs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `blog-${uniqueSuffix}${extension}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for blog images'), false);
  }
};

// Configure multer with appropriate file size for blog images
const blogMulter = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit per image
    files: 10 // Allow up to 10 images per blog post
  },
  fileFilter: fileFilter
});

// Export different configurations
module.exports = {
  // Single featured image upload (for backward compatibility)
  single: blogMulter.single('featuredImage'),
  
  // Multiple images upload (new feature)
  multiple: blogMulter.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'images', maxCount: 9 } // 9 additional images + 1 featured = 10 total
  ]),
  
  // All images as array (alternative approach)
  array: blogMulter.array('images', 10)
};
