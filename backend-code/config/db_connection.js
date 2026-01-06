// config/db.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv')
dotenv.config({
    path: './.env'
});

const db = mysql.createPool({
    host: '195.35.11.24',
    user: 'newroot',
    password: 'arsenal',
    database: 'profbioresearch',
    //database: 'proftestdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;