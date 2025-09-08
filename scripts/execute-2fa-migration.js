require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Get database configuration
let dbConfig;
const configPath = path.join(__dirname, '../core/config/config.json');
const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const nodeEnv = process.env.NODE_ENV || 'development';
dbConfig = configFile[nodeEnv];

// Create connection pool
const pool = new Pool({
  user: process.env.DB_USERNAME || dbConfig.username,
  host: process.env.DB_HOST || dbConfig.host,
  database: process.env.DB_DATABASE || dbConfig.database,
  password: process.env.DB_PASSWORD || dbConfig.password,
  port: process.env.DB_PORT || dbConfig.port,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function executeMigration() {
  try {
    console.log('Reading SQL migration file...');
    const sqlPath = path.join(__dirname, 'add-2fa-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL migration...');
    const result = await pool.query(sql);
    console.log('Migration executed successfully!');
    
    // Print verification results (last query in the SQL file)
    if (result && result.length && result[result.length - 1].rows) {
      console.table(result[result.length - 1].rows);
    }
    
    console.log('All 2FA columns have been added to the database.');
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    pool.end();
  }
}

executeMigration();
