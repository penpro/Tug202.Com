const mysql = require('mysql2/promise');

// One shared pool for the process. mysql2 lazily opens connections, so
// requiring this module is cheap even when the DB is down; the first query
// is what fails. server.js pings on boot so a bad .env is loud, not silent.
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4'
});

module.exports = pool;
