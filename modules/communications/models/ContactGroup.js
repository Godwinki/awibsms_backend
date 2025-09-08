// ContactGroup.js - For organizing members into groups for SMS campaigns
module.exports = (sequelize, DataTypes) => {
  const ContactGroup = sequelize.define('ContactGroup', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // BRANCH ASSOCIATION - Contact groups belong to a specific branch
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'Contact groups belong to a specific branch'
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
      defaultValue: '#3B82F6' // Blue color
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    memberCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    lastUsedAt: {
      type: DataTypes.DATE
    }
  }, {
    timestamps: true,
    tableName: 'ContactGroups',
    indexes: [
      {
        unique: true,
        fields: ['branchId', 'name']
      },
      {
        fields: ['branchId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['createdById']
      }
    ]
  });

  ContactGroup.associate = (models) => {
    // Branch association - Contact groups belong to a branch
    if (models.Branch) {
      ContactGroup.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }

    // Each group is created by a user
    ContactGroup.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'createdBy'
    });

    // One-to-many relationship with group members
    ContactGroup.hasMany(models.GroupMember, {
      foreignKey: 'groupId',
      as: 'groupMembers'
    });

    // Many-to-many relationship with Members through GroupMember
    ContactGroup.belongsToMany(models.Member, {
      through: models.GroupMember,
      foreignKey: 'groupId',
      otherKey: 'memberId',
      as: 'members'
    });

    // One-to-many relationship with SMS campaigns (if exists)
    if (models.SmsCampaign) {
      ContactGroup.hasMany(models.SmsCampaign, {
        foreignKey: 'groupId',
        as: 'campaigns'
      });
    }
  };

  return ContactGroup;
};
