const express = require('express');
const {saveSale, updateShopSale, updateShopSaleInfoController} = require('../controllers/salesController')
const router = express.Router();

router.post('/save-sale', saveSale);
router.post('/update-sale-payment', updateShopSale)
router.post('/update-sale-info', updateShopSaleInfoController)

module.exports = router;
