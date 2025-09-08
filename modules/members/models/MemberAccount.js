// models/MemberAccount.js
module.exports = (sequelize, DataTypes) => {
  const MemberAccount = sequelize.define('MemberAccount', {
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Members',
        key: 'id'
      }
    },
    // BRANCH INHERITANCE - Account inherits branch from member
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'Accounts inherit branch from their member'
    },
    accountTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'AccountTypes',
        key: 'id'
      }
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false // Remove global uniqueness - will be unique per branch
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0.00,
      get() {
        // Always return balance as a number, never as a string
        const value = this.getDataValue('balance');
        return value === null || value === undefined ? 0.00 : parseFloat(value);
      }
    },
    lastTransactionDate: {
      type: DataTypes.DATE
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ACTIVE'
      // Options: ACTIVE, FROZEN, CLOSED, DORMANT
    },
    activationDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    closureDate: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'MemberAccounts',
    timestamps: true,
    indexes: [
      // Branch-specific uniqueness constraints
      {
        unique: true,
        fields: ['branchId', 'accountNumber']
      },
      // Performance indexes
      {
        fields: ['branchId']
      },
      {
        fields: ['memberId']
      },
      {
        fields: ['accountTypeId']
      },
      {
        fields: ['status']
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
      // Active accounts only
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

  MemberAccount.associate = (models) => {
    // Branch association - Accounts inherit branch from member
    if (models.Branch) {
      MemberAccount.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }

    MemberAccount.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member'
    });
    
    MemberAccount.belongsTo(models.AccountType, {
      foreignKey: 'accountTypeId',
      as: 'accountType'
    });
    
    MemberAccount.hasMany(models.Transaction, {
      foreignKey: 'accountId',
      as: 'transactions'
    });
  };

  return MemberAccount;
};
