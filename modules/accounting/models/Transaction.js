// models/Transaction.js
module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MemberAccounts',
        key: 'id'
      }
    },
    // BRANCH INHERITANCE - Transaction inherits branch from account
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'Transactions inherit branch from their account'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
      // Options: DEPOSIT, WITHDRAWAL, TRANSFER, INTEREST, FEE
    },
    description: {
      type: DataTypes.TEXT
    },
    referenceNumber: {
      type: DataTypes.STRING,
      unique: true
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'COMPLETED'
      // Options: PENDING, COMPLETED, FAILED, REVERSED
    },
    performedBy: {
      type: DataTypes.INTEGER,
      allowNull: true, // Make this nullable
    }
  }, {
    tableName: 'Transactions',
    timestamps: true,
    indexes: [
      // Performance indexes
      {
        fields: ['branchId']
      },
      {
        fields: ['accountId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['branchId', 'createdAt']
      }
    ]
  });

  Transaction.associate = (models) => {
    // Branch association - Transactions inherit branch from account
    if (models.Branch) {
      Transaction.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }

    Transaction.belongsTo(models.MemberAccount, {
      foreignKey: 'accountId',
      as: 'account'
    });
    
    // Only try to associate with User if the model exists
    if (models.User) {
      Transaction.belongsTo(models.User, {
        foreignKey: 'performedBy',
        as: 'performer',
        constraints: false // Disable foreign key constraint
      });
    }
  };

  return Transaction;
};
