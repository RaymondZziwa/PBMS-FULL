const express = require('express');
const {
    getExpensesRecords,
    getShopSales,
    getMassageSales
} = require('../controllers/equatorialLegacyController')
const {
    getExpensesRecords: getMasanafuExpensesRecords,
    getShopSales: getMasanafuShopSales
} = require('../controllers/masanafuLegacyController')
const router = express.Router();

router.get('/masanafu-expenses', getMasanafuExpensesRecords);
router.get('/masanafu-shop-sales', getMasanafuShopSales);

router.get('/equatorial-expenses', getExpensesRecords);
router.get('/equatorial-shop-sales', getShopSales);
router.get('/equatorial-massage-sales', getMassageSales);

module.exports = router;