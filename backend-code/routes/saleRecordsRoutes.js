const express = require('express');
const {getSalesRecords, getSalesReport} = require('../controllers/salesRecordsController')
const router = express.Router();

router.post('/get-sales', getSalesRecords);
router.post('/sales-report', getSalesReport)

module.exports = router;
