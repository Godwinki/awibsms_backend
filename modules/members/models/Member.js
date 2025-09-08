// Member.js
module.exports = (sequelize, DataTypes) => {
  const Member = sequelize.define('Member', {
    // Explicitly define ID as INTEGER (auto-increment)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // BRANCH ASSOCIATION - Critical for multi-tenancy
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'Members belong to a specific branch'
    },
    // Core personal info
    nin: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: false // Remove global uniqueness - will be unique per branch
    },
    fullName: { type: DataTypes.STRING, allowNull: false },
    idNo: { type: DataTypes.STRING, allowNull: false },
    placeOfBirth: { type: DataTypes.STRING },
    dateOfBirth: { type: DataTypes.DATEONLY },
    nationality: { type: DataTypes.STRING, defaultValue: 'Tanzanian' },
    region: { type: DataTypes.STRING, defaultValue: 'Arusha' },
    district: { type: DataTypes.STRING },
    ward: { type: DataTypes.STRING },
    village: { type: DataTypes.STRING },
    residence: { type: DataTypes.STRING },
    mobile: { type: DataTypes.STRING },
    pobox: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    maritalStatus: { type: DataTypes.STRING },
    // Employment & Financial
    employmentStatus: { type: DataTypes.STRING },
    employerName: { type: DataTypes.STRING },
    incomeBracket: { type: DataTypes.STRING },
    tin: { type: DataTypes.STRING },
    // Account info
    accountNumber: { type: DataTypes.STRING, allowNull: true }, // Manually added for now
    // Member status
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DECEASED'),
      defaultValue: 'ACTIVE',
      allowNull: false
    },
    // Misc
    incomeSource: { type: DataTypes.STRING },
    businessType: { type: DataTypes.STRING },
    partners: { type: DataTypes.STRING },
    owners: { type: DataTypes.STRING },
    knowHow: { type: DataTypes.STRING },
    knowHowDetail: { type: DataTypes.STRING },
    otherSaccos: { type: DataTypes.STRING },
    declaration: { type: DataTypes.BOOLEAN, defaultValue: false },
    // Document uploads (store file paths)
    idCopyPath: { type: DataTypes.STRING },
    passportPhotoPath: { type: DataTypes.STRING },
    coverLetterPath: { type: DataTypes.STRING },
  }, {
    tableName: 'Members',
    timestamps: true,
    indexes: [
      // Branch-specific uniqueness constraints
      {
        unique: true,
        fields: ['branchId', 'nin']
      },
      {
        unique: true,
        fields: ['branchId', 'idNo']
      },
      {
        unique: true,
        fields: ['branchId', 'mobile']
      },
      {
        unique: true,
        fields: ['branchId', 'email']
      },
      // Performance indexes
      {
        fields: ['branchId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['fullName']
      }
    ],
    scopes: {
      // Filter by branch
      byBranch(branchId) {
        return {
          where: {
            branchId: branchId
          }
        };
      },
      // Active members only
      active: {
        where: {
          status: 'ACTIVE'
        }
      },
      // Combine branch and active
      activeBranch(branchId) {
        return {
          where: {
            branchId: branchId,
            status: 'ACTIVE'
          }
        };
      }
    }
  });

  // Define associations
  Member.associate = (models) => {
    // Branch association - Members belong to a branch
    if (models.Branch) {
      Member.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }

    // Each member can have many documents
    Member.hasMany(models.MemberDocument, {
      foreignKey: 'memberId',
      as: 'documents'
    });
    
    // Each member can have many accounts
    Member.hasMany(models.MemberAccount, {
      foreignKey: 'memberId',
      as: 'accounts'
    });

    // Each member can have many beneficiaries
    Member.hasMany(models.Beneficiary, {
      foreignKey: 'memberId',
      as: 'beneficiaries'
    });

    // Each member can have many emergency contacts
    Member.hasMany(models.EmergencyContact, {
      foreignKey: 'memberId',
      as: 'emergencyContacts'
    });
    
    // Many-to-many relationship with ContactGroups for SMS messaging
    if (models.ContactGroup && models.GroupMember) {
      Member.belongsToMany(models.ContactGroup, {
        through: models.GroupMember,
        foreignKey: 'memberId',
        otherKey: 'groupId',
        as: 'contactGroups'
      });

      // Direct relationship to GroupMember for detailed group membership info
      Member.hasMany(models.GroupMember, {
        foreignKey: 'memberId',
        as: 'groupMemberships'
      });
    }

    // Many-to-many relationship with ContactCategories for member categorization
    if (models.ContactCategory && models.CategoryMember) {
      Member.belongsToMany(models.ContactCategory, {
        through: models.CategoryMember,
        foreignKey: 'memberId',
        otherKey: 'categoryId',
        as: 'contactCategories'
      });

      // Direct relationship to CategoryMember for detailed category membership info
      Member.hasMany(models.CategoryMember, {
        foreignKey: 'memberId',
        as: 'categoryMemberships'
      });
    }
  };

  return Member;
};
