const express = require('express');
const namungoonaController = require('../controllers/namungoona/namungoonaController')
const router = express.Router();

router.post('/save-item', namungoonaController.saveNewItem);
router.post('/delete-item', namungoonaController.deleteItem);
router.get('/get-items', namungoonaController.findItems);

router.post('/move-stock', namungoonaController.moveStock);
router.post('/stock-taking', namungoonaController.stockTaking);
router.get('/stock-movement-records', namungoonaController.fetchStockMovementRecords);

router.post('/move-processed-stock', namungoonaController.moveProcessedStock);
router.get('/processed-stock-taking', namungoonaController.processedStockTaking);
router.get('/processed-stock-movement-records', namungoonaController.fetchProcessedStockMovementRecords);

module.exports = router;
