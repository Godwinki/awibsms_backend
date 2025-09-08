// ContactCategory.js
module.exports = (sequelize, DataTypes) => {
  const ContactCategory = sequelize.define('ContactCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // BRANCH ASSOCIATION - Contact categories belong to a specific branch
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'Contact categories belong to a specific branch'
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    description: { 
      type: DataTypes.TEXT
    },
    color: { 
      type: DataTypes.STRING, 
      allowNull: false,
      defaultValue: 'bg-blue-500'
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'ContactCategories',
    timestamps: true,
    indexes: [
      // Branch-specific uniqueness constraints
      {
        unique: true,
        fields: ['branchId', 'name']
      },
      // Performance indexes
      {
        fields: ['branchId']
      },
      {
        fields: ['createdById']
      }
    ]
  });

  ContactCategory.associate = (models) => {
    // Branch association - Contact categories belong to a branch
    if (models.Branch) {
      ContactCategory.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }

    // Each category is created by a user
    ContactCategory.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'categoryCreator'
    });

    // One-to-many relationship with category members
    ContactCategory.hasMany(models.CategoryMember, {
      foreignKey: 'categoryId',
      as: 'categoryMembers'
    });

    // Many-to-many relationship with Members through explicit CategoryMember model
    ContactCategory.belongsToMany(models.Member, {
      through: models.CategoryMember,
      foreignKey: 'categoryId',
      otherKey: 'memberId',
      as: 'members'
    });
  };

  return ContactCategory;
};
