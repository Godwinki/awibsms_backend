// controllers/announcementController.js
const db = require('../../../models');
const Announcement = db.Announcement;
const User = db.User;
const fs = require('fs');
const path = require('path');
const supabaseStorage = require('../../../core/services/supabaseStorage');

// Get all announcements (CMS - requires auth)
exports.getAllAnnouncements = async (req, res) => {
  console.log('📥 [Announcement] CMS request to list all announcements');
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      status, 
      priority, 
      search, 
      targetAudience,
      isFeatured 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (category) whereClause.category = category;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (targetAudience) whereClause.targetAudience = targetAudience;
    if (isFeatured !== undefined) whereClause.isFeatured = isFeatured === 'true';
    
    if (search) {
      whereClause[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { titleSwahili: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { content: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { contentSwahili: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { tags: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    console.log(`✅ [Announcement] CMS returned ${announcements.length} announcements (${count} total)`);
    res.json({
      emoji: '📢',
      message: 'Announcements fetched successfully',
      announcements,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to fetch announcements for CMS:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get public announcements (Website - no auth required)
exports.getPublicAnnouncements = async (req, res) => {
  console.log('📥 [Announcement] Public request to list announcements');
  try {
    const { 
      category, 
      language, 
      status = 'published',
      featured,
      limit = 50,
      page = 1
    } = req.query;
    
    const whereClause = {
      status: 'active' // Only show active announcements on website
    };
    
    // Check if not expired
    whereClause[db.Sequelize.Op.or] = [
      { expiryDate: null },
      { expiryDate: { [db.Sequelize.Op.gt]: new Date() } }
    ];
    
    if (category) whereClause.category = category;
    if (featured !== undefined) whereClause.isFeatured = featured === 'true';
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [
        ['priority', 'DESC'], // Urgent/high priority first
        ['publishDate', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset: offset
    });
    
    const totalPages = Math.ceil(count / parseInt(limit));
    
    console.log(`✅ [Announcement] Public returned ${announcements.length} of ${count} announcements`);
    res.json({
      emoji: '📢',
      message: 'Public announcements fetched successfully',
      announcements,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to fetch public announcements:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get single public announcement by ID
exports.getPublicAnnouncement = async (req, res) => {
  console.log(`📥 [Announcement] Request for public announcement: ${req.params.id}`);
  try {
    const announcement = await Announcement.findOne({
      where: {
        id: req.params.id,
        status: 'active',
        isPublic: true
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!announcement) {
      console.log(`⚠️ [Announcement] Public announcement not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Announcement not found' });
    }
    
    // Increment view count
    await announcement.increment('viewCount');
    
    console.log(`✅ [Announcement] Public announcement retrieved: ${req.params.id}`);
    res.json({
      emoji: '📢',
      message: 'Announcement fetched successfully',
      announcement
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to fetch public announcement:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get single announcement
exports.getAnnouncement = async (req, res) => {
  console.log(`📥 [Announcement] Request for announcement: ${req.params.id}`);
  try {
    const announcement = await Announcement.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'modifier',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!announcement) {
      console.log(`⚠️ [Announcement] Announcement not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Announcement not found' });
    }
    
    // Increment view count for public announcements
    if (announcement.isPublic && announcement.status === 'active') {
      await announcement.increment('viewCount');
    }
    
    console.log(`✅ [Announcement] Announcement retrieved: ${req.params.id}`);
    res.json({
      emoji: '📢',
      message: 'Announcement fetched successfully',
      announcement
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to fetch announcement:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Create announcement (requires auth)
exports.createAnnouncement = async (req, res) => {
  console.log('📝 [Announcement] Create announcement request received');
  try {
    const {
      title, titleSwahili, content, contentSwahili, summary, summarySwahili,
      priority = 'medium', status = 'draft', category = 'general', 
      targetAudience = 'all', publishDate, expiryDate, eventDate,
      venue, venueSwahili, registrationRequired = false, registrationDeadline,
      maxParticipants, isFeatured = false, isPublic = true, 
      allowComments = false, sendNotification = true, tags, sortOrder = 0
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ emoji: '❌', error: 'Title and content are required' });
    }
    
    // Handle date validation
    let validPublishDate = new Date();
    if (publishDate && publishDate !== '' && publishDate !== 'Invalid date') {
      const parsedDate = new Date(publishDate);
      if (!isNaN(parsedDate.getTime())) {
        validPublishDate = parsedDate;
      }
    }
    
    let validExpiryDate = null;
    if (expiryDate && expiryDate !== '' && expiryDate !== 'Invalid date') {
      const parsedDate = new Date(expiryDate);
      if (!isNaN(parsedDate.getTime())) {
        validExpiryDate = parsedDate;
      }
    }
    
    let validEventDate = null;
    if (eventDate && eventDate !== '' && eventDate !== 'Invalid date') {
      const parsedDate = new Date(eventDate);
      if (!isNaN(parsedDate.getTime())) {
        validEventDate = parsedDate;
      }
    }
    
    let validRegistrationDeadline = null;
    if (registrationDeadline && registrationDeadline !== '' && registrationDeadline !== 'Invalid date') {
      const parsedDate = new Date(registrationDeadline);
      if (!isNaN(parsedDate.getTime())) {
        validRegistrationDeadline = parsedDate;
      }
    }
    
    // Handle banner upload with Supabase storage
    let bannerData = {};
    if (req.file) {
      try {
        if (supabaseStorage.isAvailable()) {
          // Upload to Supabase storage
          const uploadResult = await supabaseStorage.uploadBanner(req.file, Date.now());
          bannerData = {
            bannerUrl: uploadResult.url,
            bannerPath: uploadResult.path,
            bannerOriginalName: uploadResult.originalName,
            bannerSize: uploadResult.size
          };
          console.log('✅ Banner uploaded to Supabase:', uploadResult.url);
          console.log('🔍 Upload result:', JSON.stringify(uploadResult, null, 2));
        } else {
          // Fallback to local storage
          bannerData = {
            bannerPath: req.file.path,
            bannerOriginalName: req.file.originalname,
            bannerSize: req.file.size
          };
          console.log('⚠️ Using local storage for banner');
        }
      } catch (error) {
        console.log('❌ Banner upload failed:', error.message);
        // Fallback to local storage
        bannerData = {
          bannerPath: req.file.path,
          bannerOriginalName: req.file.originalname,
          bannerSize: req.file.size
        };
      }
    }
    
    const announcementData = {
      title, titleSwahili, content, contentSwahili, summary, summarySwahili,
      priority, status, category, targetAudience,
      publishDate: validPublishDate,
      expiryDate: validExpiryDate,
      eventDate: validEventDate,
      venue, venueSwahili,
      registrationRequired: registrationRequired === 'true' || registrationRequired === true,
      registrationDeadline: validRegistrationDeadline,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isPublic: isPublic === 'true' || isPublic === true,
      allowComments: allowComments === 'true' || allowComments === true,
      sendNotification: sendNotification === 'true' || sendNotification === true,
      tags,
      sortOrder: parseInt(sortOrder) || 0,
      authorId: req.user.id,
      modifierId: req.user.id,
      ...bannerData
    };
    
    console.log('🔍 Banner data being stored:', JSON.stringify(bannerData, null, 2));
    
    const announcement = await Announcement.create(announcementData);
    
    // Update banner URL with actual announcement ID only if using local storage
    if (req.file && !bannerData.bannerUrl) {
      await announcement.update({
        bannerUrl: `/api/announcements/${announcement.id}/banner`
      });
    }
    
    console.log(`✅ [Announcement] Created with banner URL: ${announcement.bannerUrl}`);
    res.status(201).json({
      emoji: '✅',
      message: 'Announcement created successfully',
      announcement
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to create announcement:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Update announcement (requires auth)
exports.updateAnnouncement = async (req, res) => {
  console.log(`📝 [Announcement] Update request for announcement: ${req.params.id}`);
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) {
      console.log(`⚠️ [Announcement] Announcement not found for update: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Announcement not found' });
    }
    
    const updateData = { ...req.body };
    
    // Handle boolean conversions
    ['registrationRequired', 'isFeatured', 'isPublic', 'allowComments', 'sendNotification'].forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field] === 'true' || updateData[field] === true;
      }
    });
    
    // Handle integer conversions
    ['maxParticipants', 'sortOrder'].forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== '') {
        updateData[field] = parseInt(updateData[field]) || 0;
      }
    });
    
    // Handle date validation and conversion
    ['publishDate', 'expiryDate', 'eventDate', 'registrationDeadline'].forEach(field => {
      if (updateData[field] !== undefined) {
        if (updateData[field] === '' || updateData[field] === 'Invalid date') {
          updateData[field] = field === 'publishDate' ? new Date() : null;
        } else {
          const parsedDate = new Date(updateData[field]);
          if (isNaN(parsedDate.getTime())) {
            updateData[field] = field === 'publishDate' ? new Date() : null;
          } else {
            updateData[field] = parsedDate;
          }
        }
      }
    });
    
    // Handle banner upload with Supabase storage
    if (req.file) {
      try {
        // Delete old banner if exists
        if (announcement.bannerPath) {
          if (supabaseStorage.isAvailable()) {
            await supabaseStorage.deleteBanner(announcement.bannerPath);
          } else if (fs.existsSync(announcement.bannerPath)) {
            fs.unlinkSync(announcement.bannerPath);
          }
        }
        
        if (supabaseStorage.isAvailable()) {
          // Upload to Supabase storage
          const uploadResult = await supabaseStorage.uploadBanner(req.file, announcement.id);
          updateData.bannerUrl = uploadResult.url;
          updateData.bannerPath = uploadResult.path;
          updateData.bannerOriginalName = uploadResult.originalName;
          updateData.bannerSize = uploadResult.size;
          console.log('✅ Banner updated in Supabase:', uploadResult.url);
        } else {
          // Fallback to local storage
          updateData.bannerUrl = `/api/announcements/${announcement.id}/banner`;
          updateData.bannerPath = req.file.path;
          updateData.bannerOriginalName = req.file.originalname;
          updateData.bannerSize = req.file.size;
          console.log('⚠️ Using local storage for banner update');
        }
      } catch (error) {
        console.log('❌ Banner upload failed during update:', error.message);
        // Fallback to local storage
        updateData.bannerUrl = `/api/announcements/${announcement.id}/banner`;
        updateData.bannerPath = req.file.path;
        updateData.bannerOriginalName = req.file.originalname;
        updateData.bannerSize = req.file.size;
      }
    }
    
    updateData.modifierId = req.user.id;
    
    await announcement.update(updateData);
    
    console.log(`✅ [Announcement] Announcement updated: ${req.params.id}`);
    res.json({
      emoji: '✅',
      message: 'Announcement updated successfully',
      announcement
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to update announcement:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Delete announcement (requires auth)
exports.deleteAnnouncement = async (req, res) => {
  console.log(`🗑️ [Announcement] Delete request for announcement: ${req.params.id}`);
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) {
      console.log(`⚠️ [Announcement] Announcement not found for delete: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Announcement not found' });
    }
    
    // Delete banner file if exists
    if (announcement.bannerPath) {
      if (supabaseStorage.isAvailable()) {
        await supabaseStorage.deleteBanner(announcement.bannerPath);
      } else if (fs.existsSync(announcement.bannerPath)) {
        fs.unlinkSync(announcement.bannerPath);
      }
    }
    
    await announcement.destroy();
    console.log(`✅ [Announcement] Announcement deleted: ${req.params.id}`);
    res.json({ emoji: '🗑️', message: 'Announcement deleted successfully' });
  } catch (error) {
    console.log('❌ [Announcement] Failed to delete announcement:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Publish announcement (requires auth)
exports.publishAnnouncement = async (req, res) => {
  console.log(`📤 [Announcement] Publish request for announcement: ${req.params.id}`);
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) {
      console.log(`⚠️ [Announcement] Announcement not found for publish: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Announcement not found' });
    }
    
    await announcement.update({
      status: 'active',
      publishDate: new Date(),
      modifierId: req.user.id
    });
    
    console.log(`✅ [Announcement] Announcement published: ${req.params.id}`);
    res.json({
      emoji: '📤',
      message: 'Announcement published successfully',
      announcement
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to publish announcement:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Download announcement banner
exports.downloadBanner = async (req, res) => {
  try {
    console.log(`📥 [Announcement] Banner download requested: ${req.params.id}`);
    
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) {
      console.log(`⚠️ [Announcement] Announcement not found for banner download: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Announcement not found' });
    }
    
    if (!announcement.bannerUrl) {
      console.log(`⚠️ [Announcement] No banner for announcement: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'No banner found' });
    }
    
    // If banner is stored in Supabase (URL starts with https), redirect to it
    if (announcement.bannerUrl.startsWith('https://')) {
      console.log(`✅ [Announcement] Redirecting to Supabase banner: ${announcement.bannerUrl}`);
      return res.redirect(announcement.bannerUrl);
    }
    
    // For local storage, serve the file
    if (announcement.bannerPath && fs.existsSync(announcement.bannerPath)) {
      console.log(`✅ [Announcement] Serving local banner: ${announcement.bannerPath}`);
      return res.download(announcement.bannerPath, announcement.bannerOriginalName);
    }
    
    console.log(`⚠️ [Announcement] Banner file not found: ${announcement.bannerPath}`);
    res.status(404).json({ emoji: '⚠️', error: 'Banner file not found' });
  } catch (error) {
    console.log('❌ [Announcement] Failed to download banner:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get announcement categories
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'general', label: 'General' },
      { value: 'event', label: 'Event' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'policy', label: 'Policy Update' },
      { value: 'training', label: 'Training' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'news', label: 'News' }
    ];
    
    res.json({
      emoji: '📋',
      message: 'Categories fetched successfully',
      categories
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to fetch categories:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get target audiences
exports.getTargetAudiences = async (req, res) => {
  try {
    const audiences = [
      { value: 'all', label: 'All Members' },
      { value: 'members', label: 'Members Only' },
      { value: 'staff', label: 'Staff Only' },
      { value: 'board', label: 'Board Members' },
      { value: 'public', label: 'Public' }
    ];
    
    res.json({
      emoji: '📋',
      message: 'Target audiences fetched successfully',
      audiences
    });
  } catch (error) {
    console.log('❌ [Announcement] Failed to fetch audiences:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};
