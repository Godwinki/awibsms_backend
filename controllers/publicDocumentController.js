// controllers/publicDocumentController.js
const db = require('../models');
const PublicDocument = db.PublicDocument;
const User = db.User;
const fs = require('fs');
const path = require('path');

// Get all public documents (for website - no auth required)
exports.getPublicDocuments = async (req, res) => {
  console.log('📥 [PublicDocument] Request to list public documents');
  try {
    const { category, language, active = 'true' } = req.query;
    
    const whereClause = {
      isPublic: true
    };
    
    if (active === 'true') {
      whereClause.isActive = true;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (language && language !== 'both') {
      whereClause.language = { [db.Sequelize.Op.in]: [language, 'both'] };
    }
    
    // Check if expiry date is in the future or null
    whereClause[db.Sequelize.Op.or] = [
      { expiryDate: null },
      { expiryDate: { [db.Sequelize.Op.gt]: new Date() } }
    ];
    
    const documents = await PublicDocument.findAll({
      where: whereClause,
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
      attributes: [
        'id', 'title', 'titleSwahili', 'description', 'descriptionSwahili', 
        'detailedDescription', 'detailedDescriptionSwahili', 'category', 
        'documentType', 'originalName', 'fileSize', 'downloadCount', 
        'language', 'tags', 'publishDate', 'createdAt', 'note', 'noteSwahili'
      ]
    });
    
    console.log(`✅ [PublicDocument] Returned ${documents.length} public documents`);
    res.json({ 
      emoji: '📁', 
      message: 'Public documents fetched successfully', 
      documents 
    });
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to fetch public documents:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get all documents for CMS management (requires auth)
exports.getAllDocuments = async (req, res) => {
  console.log('📥 [PublicDocument] CMS request to list all documents');
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { tags: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows: documents } = await PublicDocument.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    console.log(`✅ [PublicDocument] CMS returned ${documents.length} documents (${count} total)`);
    res.json({ 
      emoji: '📁', 
      message: 'Documents fetched successfully', 
      documents,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to fetch documents for CMS:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Upload a new document (requires auth)
exports.uploadDocument = async (req, res) => {
  console.log('📝 [PublicDocument] Upload document request received');
  try {
    const { 
      title, description, category, documentType, language = 'en', 
      tags, isPublic = true, isActive = true, sortOrder = 0, 
      publishDate, expiryDate 
    } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ emoji: '❌', error: 'No file uploaded' });
    }
    
    // Handle date validation and conversion
    let validPublishDate = new Date();
    if (publishDate && publishDate !== '' && publishDate !== 'Invalid date') {
      const parsedPublishDate = new Date(publishDate);
      if (!isNaN(parsedPublishDate.getTime())) {
        validPublishDate = parsedPublishDate;
      }
    }
    
    let validExpiryDate = null;
    if (expiryDate && expiryDate !== '' && expiryDate !== 'Invalid date') {
      const parsedExpiryDate = new Date(expiryDate);
      if (!isNaN(parsedExpiryDate.getTime())) {
        validExpiryDate = parsedExpiryDate;
      }
    }

    const document = await PublicDocument.create({
      title,
      description,
      category,
      documentType,
      language,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      tags,
      isPublic: isPublic === 'true' || isPublic === true,
      isActive: isActive === 'true' || isActive === true,
      sortOrder: parseInt(sortOrder) || 0,
      uploadedBy: req.user.id,
      publishDate: validPublishDate,
      expiryDate: validExpiryDate
    });
    
    console.log('✅ [PublicDocument] Document uploaded:', document.id);
    res.status(201).json({ 
      emoji: '🎉', 
      message: 'Document uploaded successfully', 
      document 
    });
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to upload document:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Update a document (requires auth)
exports.updateDocument = async (req, res) => {
  console.log(`📝 [PublicDocument] Update request for document: ${req.params.id}`);
  try {
    const document = await PublicDocument.findByPk(req.params.id);
    if (!document) {
      console.log(`⚠️ [PublicDocument] Document not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Document not found' });
    }
    
    const updateData = { ...req.body };
    updateData.lastModifiedBy = req.user.id;
    
    // Handle boolean conversions
    if (updateData.isPublic !== undefined) {
      updateData.isPublic = updateData.isPublic === 'true' || updateData.isPublic === true;
    }
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
    }
    if (updateData.sortOrder !== undefined) {
      updateData.sortOrder = parseInt(updateData.sortOrder) || 0;
    }
    
    // Handle date validation and conversion
    if (updateData.publishDate !== undefined) {
      if (updateData.publishDate === '' || updateData.publishDate === 'Invalid date') {
        updateData.publishDate = new Date();
      } else {
        const publishDate = new Date(updateData.publishDate);
        if (isNaN(publishDate.getTime())) {
          updateData.publishDate = new Date();
        } else {
          updateData.publishDate = publishDate;
        }
      }
    }
    
    if (updateData.expiryDate !== undefined) {
      if (updateData.expiryDate === '' || updateData.expiryDate === 'Invalid date') {
        updateData.expiryDate = null;
      } else {
        const expiryDate = new Date(updateData.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          updateData.expiryDate = null;
        } else {
          updateData.expiryDate = expiryDate;
        }
      }
    }
    
    await document.update(updateData);
    
    console.log(`✅ [PublicDocument] Document updated: ${req.params.id}`);
    res.json({ 
      emoji: '✅', 
      message: 'Document updated successfully', 
      document 
    });
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to update document:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Delete a document (requires auth)
exports.deleteDocument = async (req, res) => {
  console.log(`🗑️ [PublicDocument] Delete request for document: ${req.params.id}`);
  try {
    const document = await PublicDocument.findByPk(req.params.id);
    if (!document) {
      console.log(`⚠️ [PublicDocument] Document not found for delete: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Document not found' });
    }
    
    // Delete the physical file if it exists
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    
    await document.destroy();
    console.log(`✅ [PublicDocument] Document deleted: ${req.params.id}`);
    res.json({ emoji: '🗑️', message: 'Document deleted successfully' });
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to delete document:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Download a document (public endpoint, no auth required)
exports.downloadDocument = async (req, res) => {
  console.log(`📥 [PublicDocument] Download request for document: ${req.params.id}`);
  try {
    const document = await PublicDocument.findByPk(req.params.id);
    if (!document) {
      console.log(`⚠️ [PublicDocument] Document not found for download: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Document not found' });
    }
    
    // Check if document is public and active
    if (!document.isPublic || !document.isActive) {
      console.log(`⚠️ [PublicDocument] Document not accessible: ${req.params.id}`);
      return res.status(403).json({ emoji: '⚠️', error: 'Document not accessible' });
    }
    
    // Check if document has expired
    if (document.expiryDate && new Date() > document.expiryDate) {
      console.log(`⚠️ [PublicDocument] Document expired: ${req.params.id}`);
      return res.status(410).json({ emoji: '⚠️', error: 'Document has expired' });
    }
    
    if (!fs.existsSync(document.filePath)) {
      console.log(`⚠️ [PublicDocument] File not found on disk: ${document.filePath}`);
      return res.status(404).json({ emoji: '⚠️', error: 'File not found on disk' });
    }
    
    // Increment download count
    await document.increment('downloadCount');
    
    console.log(`✅ [PublicDocument] Document downloaded: ${req.params.id}`);
    res.download(document.filePath, document.originalName);
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to download document:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get document categories (for dropdowns)
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'MEMBERSHIP', label: 'Membership Forms' },
      { value: 'LOANS', label: 'Loan Applications' },
      { value: 'SAVINGS', label: 'Savings & Deposits' },
      { value: 'INSURANCE', label: 'Insurance Forms' },
      { value: 'GENERAL', label: 'General Documents' },
      { value: 'FORMS', label: 'Application Forms' },
      { value: 'POLICIES', label: 'Policies & Guidelines' }
    ];
    
    res.json({ 
      emoji: '📋', 
      message: 'Categories fetched successfully', 
      categories 
    });
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to fetch categories:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get document types (for dropdowns)
exports.getDocumentTypes = async (req, res) => {
  try {
    const documentTypes = [
      { value: 'APPLICATION_FORM', label: 'Application Form' },
      { value: 'POLICY_DOCUMENT', label: 'Policy Document' },
      { value: 'GUIDE', label: 'Guide/Manual' },
      { value: 'BROCHURE', label: 'Brochure' },
      { value: 'TERMS_CONDITIONS', label: 'Terms & Conditions' },
      { value: 'OTHER', label: 'Other' }
    ];
    
    res.json({ 
      emoji: '📋', 
      message: 'Document types fetched successfully', 
      documentTypes 
    });
  } catch (error) {
    console.log('❌ [PublicDocument] Failed to fetch document types:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};
