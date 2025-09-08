// models/DownloadLog.js
module.exports = (sequelize, DataTypes) => {
  const DownloadLog = sequelize.define('DownloadLog', {
    memberName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Full name of the member who downloaded the document'
    },
    memberAccountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Account number if member was verified'
    },
    documentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'PublicDocuments',
        key: 'id'
      },
      comment: 'ID of the downloaded document'
    },
    documentTitle: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Title of the downloaded document at time of download'
    },
    documentCategory: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Category of the downloaded document'
    },
    downloadType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['CONTRACT', 'COLLATERAL', 'LOAN_APPLICATION', 'GENERAL_FORM']]
      },
      comment: 'Type of document downloaded'
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Phone number provided by member (for loan applications)'
    },
    loanAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Loan amount requested (for loan applications)'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP address of the download request'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string from the download request'
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Location information: {country, region, city, latitude, longitude, timezone}'
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the member was successfully verified'
    },
    downloadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: 'Timestamp when the document was downloaded'
    }
  }, {
    tableName: 'download_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['memberName']
      },
      {
        fields: ['documentId']
      },
      {
        fields: ['downloadType']
      },
      {
        fields: ['downloadedAt']
      },
      {
        fields: ['verified']
      }
    ]
  });

  DownloadLog.associate = function(models) {
    DownloadLog.belongsTo(models.PublicDocument, {
      foreignKey: 'documentId',
      as: 'document'
    });
  };

  return DownloadLog;
};
