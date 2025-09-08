// GroupMember.js - Junction table for ContactGroup-Member relationships
module.exports = (sequelize, DataTypes) => {
  const GroupMember = sequelize.define('GroupMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ContactGroups',
        key: 'id'
      }
    },
    memberId: {
      type: DataTypes.INTEGER, // INTEGER to match Member model's auto-increment ID
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    },
    addedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    addedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    tableName: 'GroupMembers',
    indexes: [
      {
        unique: true,
        fields: ['groupId', 'memberId']
      },
      {
        fields: ['groupId']
      },
      {
        fields: ['memberId']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  GroupMember.associate = (models) => {
    // Belongs to ContactGroup
    GroupMember.belongsTo(models.ContactGroup, {
      foreignKey: 'groupId',
      as: 'group'
    });

    // Belongs to Member - INTEGER foreign key
    GroupMember.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });

    // Added by User - UUID foreign key
    GroupMember.belongsTo(models.User, {
      foreignKey: 'addedById',
      as: 'addedBy'
    });
  };

  return GroupMember;
};
