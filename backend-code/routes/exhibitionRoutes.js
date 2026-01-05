const express = require('express');
const exhibitionController = require('../controllers/exhibitions/exhibitionController')
const router = express.Router();

router.post('/save-exhibition', exhibitionController.registerNewExhibition);
router.get('/get-all-exhibitions', exhibitionController.getAllExhibitions);
router.post('/modify-exhibition', exhibitionController.updateExhibition);
router.post('/delete-exhibition', exhibitionController.deleteExhibition);
router.post('/expo-move-stock', exhibitionController.moveStock);
router.post('/stock-taking', exhibitionController.stockTaking);
router.post('/inventory-records', exhibitionController.fetchStockMovementRecords);
router.post('/save-expo-sale', exhibitionController.recordExpoSale);
router.post('/get-expo-sales', exhibitionController.getAllExpoSales);
router.get('/get-expo-sales-report', exhibitionController.getAllExpoSalesReport);
module.exports = router;
