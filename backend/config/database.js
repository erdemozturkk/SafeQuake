const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE,
  port: 1433,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD
    }
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool;

const connectDB = async () => {
  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ MS SQL Server connected (Windows Auth)');
    return pool;
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
};

const getPool = () => pool;

module.exports = { connectDB, getPool };
