// models/Announcement.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Bilingual title fields
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
    
    // Bilingual content fields
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
    
    // Bilingual summary fields
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    summarySwahili: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Priority and status
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'scheduled', 'expired'),
      allowNull: false,
      defaultValue: 'draft'
    },
    
    // Categorization
    category: {
      type: DataTypes.ENUM('general', 'event', 'maintenance', 'policy', 'training', 'meeting', 'news'),
      allowNull: false,
      defaultValue: 'general'
    },
    targetAudience: {
      type: DataTypes.ENUM('all', 'members', 'staff', 'board', 'public'),
      allowNull: false,
      defaultValue: 'all'
    },
    
    // Publishing settings
    publishDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Event-specific fields
    eventDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    venue: {
      type: DataTypes.STRING,
      allowNull: true
    },
    venueSwahili: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Registration settings
    registrationRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    registrationDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    currentParticipants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Display settings
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    allowComments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    // Notification settings
    sendNotification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    notificationSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    // Media
    bannerUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bannerPath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bannerOriginalName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bannerSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    
    // Metadata
    tags: {
      type: DataTypes.STRING,
      allowNull: true
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Foreign keys
    authorId: {
      type: DataTypes.UUID,
      allowNull: true,
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
    tableName: 'Announcements',
    timestamps: true,
    indexes: [
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
        fields: ['isFeatured']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['eventDate']
      }
    ]
  });

  // Define associations
  Announcement.associate = (models) => {
    // Author relationship
    Announcement.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author'
    });
    
    // Modifier relationship
    Announcement.belongsTo(models.User, {
      foreignKey: 'modifierId',
      as: 'modifier'
    });
  };

  return Announcement;
};
