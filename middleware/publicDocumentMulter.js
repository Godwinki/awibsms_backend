const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create public documents directory if it doesn't exist
const createPublicDocumentsDir = () => {
  const uploadDir = path.join(__dirname, '../uploads/public-documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Configure storage for public documents
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = createPublicDocumentsDir();
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename with UUID
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}-${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

// File filter for public documents
const fileFilter = (req, file, cb) => {
  // Allow common document types for public forms
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, PowerPoint, images, and text files are allowed.'), false);
  }
};

// Export configured multer instance for public documents
const publicDocumentUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size for public documents
  }
});

module.exports = publicDocumentUpload;
