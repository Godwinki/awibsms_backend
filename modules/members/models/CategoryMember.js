// CategoryMember.js - Junction table for ContactCategory-Member relationships
module.exports = (sequelize, DataTypes) => {
  const CategoryMember = sequelize.define('CategoryMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ContactCategories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    memberId: {
      type: DataTypes.INTEGER, // INTEGER to match Member model's auto-increment ID
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    addedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'CategoryMembers',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['categoryId', 'memberId']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['memberId']
      }
    ]
  });

  CategoryMember.associate = (models) => {
    // Belongs to ContactCategory
    CategoryMember.belongsTo(models.ContactCategory, {
      foreignKey: 'categoryId',
      as: 'category',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Belongs to Member - INTEGER foreign key
    CategoryMember.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };
  
  return CategoryMember;
};
