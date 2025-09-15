const { Blog, User } = require('../../../models');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');
const blogStorage = require('../services/blogStorage');

// Helper function to validate UUID
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Get all blogs (CMS)
exports.getAllBlogs = async (req, res) => {
  console.log('📥 [Blog] Request for all blogs');
  try {
    const { page = 1, limit = 10, status, category, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { titleSwahili: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { excerpt: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: blogs } = await Blog.findAndCountAll({
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
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`✅ [Blog] Retrieved ${blogs.length} blogs`);
    res.json({
      emoji: '📚',
      message: 'Blogs retrieved successfully',
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve blogs:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get public blogs (Website)
exports.getPublicBlogs = async (req, res) => {
  console.log('📥 [Blog] Request for public blogs');
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      status: 'published',
      isPublic: true,
      publishDate: { [Op.lte]: new Date() }
    };
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { titleSwahili: { [Op.iLike]: `%${search}%` } },
        { excerpt: { [Op.iLike]: `%${search}%` } },
        { excerptSwahili: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: blogs } = await Blog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['publishDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`✅ [Blog] Retrieved ${blogs.length} public blogs`);
    res.json({
      emoji: '📚',
      message: 'Public blogs retrieved successfully',
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve public blogs:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get single blog by ID
exports.getBlog = async (req, res) => {
  console.log(`📥 [Blog] Request for blog: ${req.params.id}`);
  try {
    const blog = await Blog.findByPk(req.params.id, {
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
    
    if (!blog) {
      console.log(`⚠️ [Blog] Blog not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Blog not found' });
    }
    
    console.log(`✅ [Blog] Blog retrieved: ${req.params.id}`);
    res.json({
      emoji: '📖',
      message: 'Blog retrieved successfully',
      blog
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve blog:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get single public blog by ID or slug
exports.getPublicBlog = async (req, res) => {
  console.log(`📥 [Blog] Request for public blog: ${req.params.identifier}`);
  try {
    const { identifier } = req.params;
    
    // Build where clause - only include ID condition if identifier is a valid UUID
    const whereClause = {
      status: 'published',
      isPublic: true,
      publishDate: { [Op.lte]: new Date() }
    };

    // Add OR condition based on whether identifier could be a UUID or slug
    if (isValidUUID(identifier)) {
      whereClause[Op.or] = [
        { id: identifier },
        { slug: identifier }
      ];
    } else {
      // If not a valid UUID, only search by slug
      whereClause.slug = identifier;
    }

    const blog = await Blog.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!blog) {
      console.log(`⚠️ [Blog] Public blog not found: ${identifier}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Blog not found' });
    }
    
    // Increment view count
    await blog.increment('viewCount');
    
    console.log(`✅ [Blog] Public blog retrieved: ${identifier}`);
    res.json({
      emoji: '📖',
      message: 'Blog retrieved successfully',
      blog
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve public blog:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Create new blog
exports.createBlog = async (req, res) => {
  console.log('📥 [Blog] Request to create blog');
  try {
    const {
      title,
      titleSwahili,
      content,
      contentSwahili,
      excerpt,
      excerptSwahili,
      slug,
      category,
      tags,
      status,
      publishDate,
      metaTitle,
      metaDescription,
      isPublic
    } = req.body;

    // Parse tags if it's a string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = [];
      }
    }

    const blogData = {
      title,
      titleSwahili,
      content,
      contentSwahili,
      excerpt,
      excerptSwahili,
      slug,
      category: category || 'News',
      tags: parsedTags,
      status: status || 'draft',
      publishDate: publishDate ? new Date(publishDate) : null,
      metaTitle,
      metaDescription,
      isPublic: isPublic !== undefined ? isPublic : true,
      authorId: req.user.id,
      images: [] // Initialize empty images array
    };

    // Handle image uploads with Supabase storage
    let imageData = {};
    let uploadedImages = [];
    
    if (req.files) {
      try {
        if (blogStorage.isAvailable()) {
          // Handle featured image
          if (req.files.featuredImage && req.files.featuredImage.length > 0) {
            const uploadResult = await blogStorage.uploadFeaturedImage(req.files.featuredImage[0], 'temp');
            imageData = {
              featuredImageUrl: uploadResult.url,
              featuredImagePath: uploadResult.path,
              featuredImageOriginalName: uploadResult.originalName,
              featuredImageSize: uploadResult.size
            };
            console.log('✅ [Blog] Featured image uploaded to Supabase');
          }

          // Handle additional images
          if (req.files.images && req.files.images.length > 0) {
            uploadedImages = await blogStorage.uploadMultipleImages(req.files.images, 'temp');
            console.log(`✅ [Blog] ${uploadedImages.length} additional images uploaded to Supabase`);
          }
        } else {
          // Fallback to local storage
          if (req.files.featuredImage && req.files.featuredImage.length > 0) {
            imageData.featuredImage = req.files.featuredImage[0].filename;
          }
          
          if (req.files.images && req.files.images.length > 0) {
            uploadedImages = req.files.images.map((file, index) => ({
              url: `/uploads/blogs/${file.filename}`,
              path: file.filename,
              originalName: file.originalname,
              size: file.size,
              order: index
            }));
          }
          console.log('⚠️ [Blog] Using local storage for images');
        }
      } catch (error) {
        console.error('❌ [Blog] Image upload failed:', error.message);
        // Continue with blog creation without images
      }
    }

    // Add uploaded images to blog data
    blogData.images = uploadedImages;

    const blog = await Blog.create({ ...blogData, ...imageData });

    // Fetch the created blog with associations
    const createdBlog = await Blog.findByPk(blog.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    console.log(`✅ [Blog] Blog created: ${blog.id}`);
    res.status(201).json({
      emoji: '✨',
      message: 'Blog created successfully',
      blog: createdBlog
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to create blog:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  console.log(`📥 [Blog] Request to update blog: ${req.params.id}`);
  try {
    const blog = await Blog.findByPk(req.params.id);
    
    if (!blog) {
      console.log(`⚠️ [Blog] Blog not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Blog not found' });
    }

    const {
      title,
      titleSwahili,
      content,
      contentSwahili,
      excerpt,
      excerptSwahili,
      slug,
      category,
      tags,
      status,
      publishDate,
      metaTitle,
      metaDescription,
      isPublic
    } = req.body;

    // Parse tags if it's a string
    let parsedTags = blog.tags;
    if (tags !== undefined) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = [];
      }
    }

    const updateData = {
      modifierId: req.user.id
    };

    // Only update fields that are provided
    if (title !== undefined) updateData.title = title;
    if (titleSwahili !== undefined) updateData.titleSwahili = titleSwahili;
    if (content !== undefined) updateData.content = content;
    if (contentSwahili !== undefined) updateData.contentSwahili = contentSwahili;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (excerptSwahili !== undefined) updateData.excerptSwahili = excerptSwahili;
    if (slug !== undefined) updateData.slug = slug;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = parsedTags;
    if (status !== undefined) updateData.status = status;
    if (publishDate !== undefined) updateData.publishDate = publishDate ? new Date(publishDate) : null;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Handle image uploads with Supabase storage
    if (req.files) {
      try {
        // Handle featured image
        if (req.files.featuredImage && req.files.featuredImage.length > 0) {
          // Delete old featured image from Supabase if exists
          if (blog.featuredImagePath) {
            await blogStorage.deleteFeaturedImage(blog.featuredImagePath);
          } else if (blog.featuredImage) {
            // Delete old local image if exists
            try {
              await fs.unlink(path.join(__dirname, '../uploads/blogs', blog.featuredImage));
            } catch (err) {
              console.log('Warning: Could not delete old local featured image:', err.message);
            }
          }

          if (blogStorage.isAvailable()) {
            // Upload new featured image to Supabase
            const uploadResult = await blogStorage.uploadFeaturedImage(req.files.featuredImage[0], blog.id);
            updateData.featuredImageUrl = uploadResult.url;
            updateData.featuredImagePath = uploadResult.path;
            updateData.featuredImageOriginalName = uploadResult.originalName;
            updateData.featuredImageSize = uploadResult.size;
            updateData.featuredImage = null; // Clear old local filename
            console.log('✅ [Blog] Featured image updated in Supabase');
          } else {
            // Fallback to local storage
            updateData.featuredImage = req.files.featuredImage[0].filename;
            console.log('⚠️ [Blog] Using local storage for featured image');
          }
        }

        // Handle additional images
        if (req.files.images && req.files.images.length > 0) {
          // Delete old additional images if they exist
          if (blog.images && Array.isArray(blog.images) && blog.images.length > 0) {
            const oldImagePaths = blog.images.map(img => img.path).filter(Boolean);
            if (oldImagePaths.length > 0) {
              await blogStorage.deleteMultipleImages(oldImagePaths);
            }
          }

          let uploadedImages = [];
          if (blogStorage.isAvailable()) {
            // Upload new images to Supabase
            uploadedImages = await blogStorage.uploadMultipleImages(req.files.images, blog.id);
            console.log(`✅ [Blog] ${uploadedImages.length} additional images updated in Supabase`);
          } else {
            // Fallback to local storage
            uploadedImages = req.files.images.map((file, index) => ({
              url: `/uploads/blogs/${file.filename}`,
              path: file.filename,
              originalName: file.originalname,
              size: file.size,
              order: index
            }));
            console.log('⚠️ [Blog] Using local storage for images');
          }
          updateData.images = uploadedImages;
        }
      } catch (error) {
        console.error('❌ [Blog] Image upload failed:', error.message);
        // Continue with blog update without image changes
      }
    }

    await blog.update(updateData);

    // Fetch updated blog with associations
    const updatedBlog = await Blog.findByPk(blog.id, {
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

    console.log(`✅ [Blog] Blog updated: ${req.params.id}`);
    res.json({
      emoji: '📝',
      message: 'Blog updated successfully',
      blog: updatedBlog
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to update blog:', error.message);
    res.status(400).json({ emoji: '❌', error: error.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  console.log(`📥 [Blog] Request to delete blog: ${req.params.id}`);
  try {
    const blog = await Blog.findByPk(req.params.id);
    
    if (!blog) {
      console.log(`⚠️ [Blog] Blog not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Blog not found' });
    }

    // Delete featured image from Supabase or local storage
    if (blog.featuredImagePath) {
      // Delete from Supabase
      await blogStorage.deleteFeaturedImage(blog.featuredImagePath);
    } else if (blog.featuredImage) {
      // Delete from local storage (fallback for old images)
      try {
        await fs.unlink(path.join(__dirname, '../uploads/blogs', blog.featuredImage));
      } catch (err) {
        console.log('Warning: Could not delete local featured image:', err.message);
      }
    }

    // Delete additional images from Supabase or local storage
    if (blog.images && Array.isArray(blog.images) && blog.images.length > 0) {
      const imagePaths = blog.images.map(img => img.path).filter(Boolean);
      if (imagePaths.length > 0) {
        await blogStorage.deleteMultipleImages(imagePaths);
      }
    }

    await blog.destroy();

    console.log(`✅ [Blog] Blog deleted: ${req.params.id}`);
    res.json({
      emoji: '🗑️',
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to delete blog:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get blog categories
exports.getCategories = async (req, res) => {
  console.log('📥 [Blog] Request for categories');
  try {
    const categories = Blog.getCategories();
    
    console.log('✅ [Blog] Categories retrieved');
    res.json({
      emoji: '📂',
      message: 'Categories retrieved successfully',
      categories
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve categories:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get popular tags
exports.getTags = async (req, res) => {
  console.log('📥 [Blog] Request for tags');
  try {
    // Get all published blogs and extract unique tags
    const blogs = await Blog.findAll({
      where: {
        status: 'published',
        tags: { [Op.ne]: null }
      },
      attributes: ['tags']
    });

    const tagCounts = {};
    blogs.forEach(blog => {
      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Sort tags by frequency and return top 20
    const sortedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag]) => tag);

    console.log('✅ [Blog] Tags retrieved');
    res.json({
      emoji: '🏷️',
      message: 'Tags retrieved successfully',
      tags: sortedTags
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve tags:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get blog statistics
exports.getBlogStats = async (req, res) => {
  console.log('📥 [Blog] Request for statistics');
  try {
    const [total, published, draft, scheduled, totalViewsResult] = await Promise.all([
      Blog.count(),
      Blog.count({ where: { status: 'published' } }),
      Blog.count({ where: { status: 'draft' } }),
      Blog.count({ where: { status: 'scheduled' } }),
      Blog.sum('viewCount')
    ]);

    const stats = {
      total,
      published,
      draft,
      scheduled,
      totalViews: totalViewsResult || 0
    };

    console.log('✅ [Blog] Statistics retrieved');
    res.json({
      emoji: '📊',
      message: 'Statistics retrieved successfully',
      stats
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve statistics:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Get featured blogs
exports.getFeaturedBlogs = async (req, res) => {
  console.log('📥 [Blog] Request for featured blogs');
  try {
    const { limit = 3 } = req.query;

    const blogs = await Blog.findAll({
      where: {
        status: 'published',
        isPublic: true,
        publishDate: { [Op.lte]: new Date() }
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['publishDate', 'DESC']],
      limit: parseInt(limit)
    });

    console.log(`✅ [Blog] Retrieved ${blogs.length} featured blogs`);
    res.json({
      emoji: '⭐',
      message: 'Featured blogs retrieved successfully',
      blogs
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to retrieve featured blogs:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Download featured image
exports.downloadFeaturedImage = async (req, res) => {
  console.log(`📥 [Blog] Request to download featured image for blog: ${req.params.id}`);
  try {
    const blog = await Blog.findByPk(req.params.id);
    
    if (!blog) {
      console.log(`⚠️ [Blog] Blog not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Blog not found' });
    }

    // Check if image is in Supabase (new format)
    if (blog.featuredImageUrl) {
      console.log(`✅ [Blog] Redirecting to Supabase image: ${blog.featuredImageUrl}`);
      return res.redirect(blog.featuredImageUrl);
    }
    
    // Fallback to local storage (old format)
    if (blog.featuredImage) {
      const imagePath = path.join(__dirname, '../uploads/blogs', blog.featuredImage);
      
      try {
        await fs.access(imagePath);
        res.download(imagePath);
        console.log(`✅ [Blog] Local featured image downloaded: ${blog.featuredImage}`);
        return;
      } catch (err) {
        console.log(`⚠️ [Blog] Local featured image file not found: ${blog.featuredImage}`);
      }
    }

    console.log(`⚠️ [Blog] No featured image found for blog: ${req.params.id}`);
    return res.status(404).json({ emoji: '⚠️', error: 'Featured image not found' });
  } catch (error) {
    console.log('❌ [Blog] Failed to download featured image:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Publish blog
exports.publishBlog = async (req, res) => {
  console.log(`📥 [Blog] Request to publish blog: ${req.params.id}`);
  try {
    const blog = await Blog.findByPk(req.params.id);
    
    if (!blog) {
      console.log(`⚠️ [Blog] Blog not found: ${req.params.id}`);
      return res.status(404).json({ emoji: '⚠️', error: 'Blog not found' });
    }

    blog.status = 'published';
    blog.publishDate = new Date();
    blog.modifierId = req.user.id;
    
    await blog.save();

    console.log(`✅ [Blog] Blog published: ${req.params.id}`);
    res.json({
      emoji: '🚀',
      message: 'Blog published successfully',
      blog
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to publish blog:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Validate slug
exports.validateSlug = async (req, res) => {
  console.log('📥 [Blog] Request to validate slug');
  try {
    const { slug, excludeId } = req.body;
    
    if (!slug) {
      return res.status(400).json({ emoji: '⚠️', error: 'Slug is required' });
    }

    const whereClause = { slug };
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const existingBlog = await Blog.findOne({ where: whereClause });
    
    const isValid = !existingBlog;
    
    console.log(`✅ [Blog] Slug validation: ${slug} - ${isValid ? 'Valid' : 'Invalid'}`);
    res.json({
      emoji: isValid ? '✅' : '⚠️',
      message: isValid ? 'Slug is available' : 'Slug is already taken',
      isValid,
      slug
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to validate slug:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};

// Generate slug
exports.generateSlug = async (req, res) => {
  console.log('📥 [Blog] Request to generate slug');
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ emoji: '⚠️', error: 'Title is required' });
    }

    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and increment until we find a unique one
    while (await Blog.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    console.log(`✅ [Blog] Generated slug: ${slug}`);
    res.json({
      emoji: '🔗',
      message: 'Slug generated successfully',
      slug
    });
  } catch (error) {
    console.log('❌ [Blog] Failed to generate slug:', error.message);
    res.status(500).json({ emoji: '❌', error: error.message });
  }
};
