const seeder = require('../seeders/20251001-add-upload-permissions-to-roles');
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('colors');

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false
  }
);

// Run the seeder
async function runSeeder() {
  console.log('🔄 Running permissions seeder manually...'.cyan);
  try {
    // Connect to the database
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully'.green);

    // Run the seeder's up function
    await seeder.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✅ Seeder executed successfully'.green);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeder:'.red, error);
    process.exit(1);
  }
}

runSeeder();
