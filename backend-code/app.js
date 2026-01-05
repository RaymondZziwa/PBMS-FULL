const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const expensesRoutes = require('./routes/expensesRoutes')
const salesRecordsRoutes = require('./routes/saleRecordsRoutes')
const productsRoutes = require('./routes/productRoutes')
const adminRoutes  = require('./routes/adminRoutes')
const attendanceRoutes = require('./routes/attendanceRoutes')
const shopStoreRoutes = require('./routes/shopStoreRoutes')
const generalStoreRoutes = require('./routes/generalStoreRoutes')
const customerRoutes = require('./routes/customerRoutes')
const saleRoutes = require('./routes/shopSaleRoutes')
const supplierRoutes = require('./routes/supplierRoutes')
const massageRecordsRoutes = require('./routes/massageRoutes')
const projectsRoutes = require('./routes/projectsRoutes')
const namungoonaRoutes = require('./routes/namungoonaRoutes')
const expoRoutes = require('./routes/exhibitionRoutes')
// const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/pbpm/patients');
const visitRoutes = require('./routes/pbpm/visits');
const userRoutes = require('./routes/pbpm/users');
const dataRoutes = require('./routes/pbpm/signsAndSymptoms');

const app = express();

app.use(cors({
    //origin: ['http://profbioresearchmanagementsystem.com', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5740', 'https://pbmcas.netlify.app', 'https://pbms.netlify.app'],
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/sales', salesRecordsRoutes);
app.use('/api/employees', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/store', shopStoreRoutes);
app.use('/api/gs', generalStoreRoutes);
app.use('/api/clients', customerRoutes);
app.use('/api/shop', saleRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/massage', massageRecordsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/namungoona', namungoonaRoutes);
app.use('/api/exhibition', expoRoutes);
//app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/signs-and-symptoms', dataRoutes);

module.exports = app;
