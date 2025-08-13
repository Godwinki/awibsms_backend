// models/PublicDocument.js
module.exports = (sequelize, DataTypes) => {
  const PublicDocument = sequelize.define('PublicDocument', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    detailedDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Rich explanation for website forms page'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['MEMBERSHIP', 'LOANS', 'SAVINGS', 'INSURANCE', 'GENERAL', 'FORMS', 'POLICIES']]
      }
    },
    documentType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['APPLICATION_FORM', 'POLICY_DOCUMENT', 'GUIDE', 'BROCHURE', 'TERMS_CONDITIONS', 'OTHER']]
      }
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this document is publicly accessible without authentication'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Display order on the website'
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'en',
      validate: {
        isIn: [['en', 'sw', 'both']]
      }
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Comma-separated tags for search and filtering'
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    publishDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Website-specific fields for bilingual support
    titleSwahili: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Swahili title for website forms'
    },
    descriptionSwahili: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Swahili description for website forms'
    },
    detailedDescriptionSwahili: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Swahili detailed explanation for website forms'
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional note/instruction in English'
    },
    noteSwahili: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional note/instruction in Swahili'
    }
  }, {
    tableName: 'PublicDocuments',
    timestamps: true,
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['isActive', 'isPublic']
      },
      {
        fields: ['language']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });

  PublicDocument.associate = (models) => {
    PublicDocument.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader'
    });
    
    PublicDocument.belongsTo(models.User, {
      foreignKey: 'lastModifiedBy',
      as: 'modifier'
    });
  };

  return PublicDocument;
};
