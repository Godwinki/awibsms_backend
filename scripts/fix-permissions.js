require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const colors = require('colors');

// Load database config
const configPath = path.join(__dirname, '../core/config/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Create connection
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function fixPermissions() {
  try {
    console.log('🔄 Connecting to database...'.yellow);
    await sequelize.authenticate();
    console.log('✅ Database connected'.green);

    // 1. Find the upload permission ID
    const [permissions] = await sequelize.query(`
      SELECT id FROM "Permissions" 
      WHERE name = 'members.uploads.upload'
    `);
    
    if (!permissions.length) {
      console.log('❌ Permission not found in database'.red);
      return;
    }
    
    const permissionId = permissions[0].id;
    console.log(`✅ Found permission ID: ${permissionId}`.green);
    
    // 2. Get all roles
    const [roles] = await sequelize.query(`
      SELECT id, name FROM "Roles"
    `);
    
    console.log(`✅ Found ${roles.length} roles`.green);
    
    // 3. Find existing role-permission assignments
    const [existingAssignments] = await sequelize.query(`
      SELECT "roleId" FROM "RolePermissions" 
      WHERE "permissionId" = '${permissionId}'
    `);
    
    const rolesWithPermission = new Set(existingAssignments.map(rp => rp.roleId));
    console.log(`ℹ️ ${existingAssignments.length} roles already have this permission`.blue);
    
    // 4. Create missing assignments
    for (const role of roles) {
      if (!rolesWithPermission.has(role.id)) {
        console.log(`➕ Adding permission to ${role.name}`.yellow);
        
        await sequelize.query(`
          INSERT INTO "RolePermissions" (id, "roleId", "permissionId", "grantedAt", "createdAt", "updatedAt")
          VALUES (
            '${require('uuid').v4()}', 
            '${role.id}', 
            '${permissionId}', 
            NOW(), 
            NOW(), 
            NOW()
          )
        `);
        
        console.log(`✅ Added permission to ${role.name}`.green);
      } else {
        console.log(`ℹ️ Role ${role.name} already has this permission`.blue);
      }
    }
    
    console.log('\n🎉 Permission assignment complete!'.green);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
    console.log('👋 Database connection closed'.yellow);
  }
}

fixPermissions();
