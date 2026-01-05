const express = require('express');
const {moveStock, stockTaking, fetchStockMovementRecords} = require('../controllers/shopStoreController')
const router = express.Router();

router.post('/move-stock', moveStock);
router.post('/stock-taking', stockTaking);
router.post('/stock-movement-records', fetchStockMovementRecords);

module.exports = router;
