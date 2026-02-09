// db.js
const mysql = require('mysql2/promise');

// Create a connection pool (recommended for production)
const db = mysql.createPool({
    host: '31.97.58.162', // your VPS IP
    user: 'user', // MySQL username
    password: 'PbmsProd@2026!', // MySQL password
    database: 'pbmsbkp', // DB name
    port: 3306, // MySQL default port
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db