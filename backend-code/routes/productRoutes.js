const express = require('express');
const productsController = require('../controllers/productsController')
const router = express.Router();

router.post('/register-product', productsController.registerNewProduct);
router.post('/delete-product', productsController.deleteProduct);
router.post('/edit-product', productsController.editProduct);
router.get('/find-products', productsController.findProducts);
router.post('/product-performance-report', productsController.productPerformanceReport);

module.exports = router;