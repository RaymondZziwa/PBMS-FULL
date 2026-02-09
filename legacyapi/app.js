const express = require('express');
const cors = require('cors');
const legacyDataRoutes = require('./routes/legacyDataRoute');

const app = express();

app.use(cors({
    //origin: ['http://profbioresearchmanagementsystem.com', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5740', 'https://pbmcas.netlify.app', 'https://pbms.netlify.app'],
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/legacy-data', legacyDataRoutes);



module.exports = app;