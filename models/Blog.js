const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
const Blog = sequelize.define('Blog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  titleSwahili: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 255]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  contentSwahili: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 500]
    }
  },
  excerptSwahili: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      is: /^[a-z0-9-]+$/i // Only letters, numbers, and hyphens
    }
  },
  category: {
    type: DataTypes.ENUM(
      'News',
      'Reports', 
      'Events',
      'Success Stories',
      'Financial Tips',
      'Community',
      'Announcements',
      'Education'
    ),
    allowNull: false,
    defaultValue: 'News'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'scheduled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  publishDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  featuredImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  featuredImageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  featuredImagePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  featuredImageOriginalName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  featuredImageSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metaTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 60]
    }
  },
  metaDescription: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 160]
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  modifierId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'blogs',
  timestamps: true,
  indexes: [
    {
      fields: ['slug'],
      unique: true
    },
    {
      fields: ['status']
    },
    {
      fields: ['category']
    },
    {
      fields: ['publishDate']
    },
    {
      fields: ['isPublic']
    },
    {
      fields: ['authorId']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeValidate: (blog) => {
      // Auto-generate slug if not provided
      if (!blog.slug && blog.title) {
        blog.slug = blog.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }
      
      // Set publish date if status is published and no date is set
      if (blog.status === 'published' && !blog.publishDate) {
        blog.publishDate = new Date();
      }
    },
    beforeUpdate: (blog) => {
      // Update publish date when status changes to published
      if (blog.changed('status') && blog.status === 'published' && !blog.publishDate) {
        blog.publishDate = new Date();
      }
    }
  }
});

// Define associations
Blog.associate = (models) => {
  // Blog belongs to User (author)
  Blog.belongsTo(models.User, {
    foreignKey: 'authorId',
    as: 'author'
  });
  
  // Blog belongs to User (modifier)
  Blog.belongsTo(models.User, {
    foreignKey: 'modifierId',
    as: 'modifier'
  });
};

// Instance methods
Blog.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Parse tags if it's a string
  if (typeof values.tags === 'string') {
    try {
      values.tags = JSON.parse(values.tags);
    } catch (e) {
      values.tags = [];
    }
  }
  
  return values;
};

// Class methods
Blog.getCategories = function() {
  return [
    'News',
    'Reports', 
    'Events',
    'Success Stories',
    'Financial Tips',
    'Community',
    'Announcements',
    'Education'
  ];
};

Blog.getStatuses = function() {
  return ['draft', 'published', 'scheduled'];
};

return Blog;
};
