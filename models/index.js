'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
// Check directly for DATABASE_URL first, then fall back to config.use_env_variable
if (process.env.DATABASE_URL) {
  // Direct DATABASE_URL connection (for Back4app, Heroku, Railway, Sevalla, etc.)
  console.log('Using DATABASE_URL environment variable for connection');
  
  // Configure SSL based on environment or explicit setting
  const sslConfig = process.env.DB_SSL === 'false' ? false : {
    require: true,
    rejectUnauthorized: false
  };
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: sslConfig
    },
    logging: false
  });
} else if (config.use_env_variable && process.env[config.use_env_variable]) {
  // Only use config.use_env_variable if the environment variable actually exists
  console.log(`Using ${config.use_env_variable} environment variable for connection`);
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  // Fall back to local database configuration
  console.log('Using local database configuration');
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file !== 'associations.js' &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    try {
      const modelModule = require(path.join(__dirname, file));
      let model;
      
      if (typeof modelModule === 'function') {
        model = modelModule(sequelize, Sequelize.DataTypes);
      } else if (modelModule.default && typeof modelModule.default === 'function') {
        model = modelModule.default(sequelize, Sequelize.DataTypes);
      } else {
        console.warn(`Model file ${file} doesn't export a function. Skipping.`);
        return;
      }
      
      db[model.name] = model;
    } catch (error) {
      console.warn(`Error loading model from file ${file}:`, error.message);
    }
  });

// Remove these lines as they're causing duplicate model registration
// db.Leave = require('./Leave')(sequelize, Sequelize.DataTypes);
// if (db.Leave) {
//   db.Leave.associate(db);
// }

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    try {
      db[modelName].associate(db);
      console.log(`✅ Associated model: ${modelName}`.green);
    } catch (error) {
      console.warn(`Error associating model ${modelName}:`, error.message);
    }
  }
});

// Log all loaded models
console.log('\n📋 Loaded Models:'.cyan);
Object.keys(db).forEach(modelName => {
  if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
    console.log(`  📄 ${modelName}`.blue);
  }
});

// Log all associations
console.log('\n🔗 Model Associations:'.cyan);
Object.keys(db).forEach(modelName => {
  if (modelName !== 'sequelize' && modelName !== 'Sequelize') {
    const model = db[modelName];
    if (model.associations && Object.keys(model.associations).length > 0) {
      console.log(`  ${modelName}:`.yellow);
      Object.keys(model.associations).forEach(assocName => {
        const association = model.associations[assocName];
        console.log(`    ${assocName} -> ${association.target.name} (${association.associationType})`.gray);
      });
    }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
