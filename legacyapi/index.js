const express = require('express');
const db = require('./config/dbConfig');
const app = require('./app');
const PORT = 3040;

// middleware
app.use(express.json());

(async () => {
    try {
        const [rows] = await db.query('SELECT NOW() AS now');
        console.log('✅ Connected to DB, server time:', rows[0].now);
    } catch (err) {
        console.error('❌ DB connection failed:', err.message);
        process.exit(1); // stop server if DB connection fails
    }
})();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});