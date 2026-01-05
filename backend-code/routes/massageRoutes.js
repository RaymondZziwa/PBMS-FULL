const express = require('express');
const {getProductSalesRecords, getServicesSalesRecords, getProductSalesReport} = require('../controllers/massage/massageSalesRecordsController')
const servicesController = require('../controllers/massage/massageServicesController')
const massagePOSController = require('../controllers/massage/posController')
const massageInventoryController = require('../controllers/massage/massageInventoryController')
const router = express.Router();

router.post('/get-product-sales', getProductSalesRecords);
router.post('/get-service-sales',  getServicesSalesRecords);

router.get('/find-products',  massageInventoryController.findMassageProducts);
router.post('/register-service', servicesController.registerNewService);
router.post('/delete-service', servicesController.deleteService);
router.post('/edit-service', servicesController.editService);
router.get('/find-services', servicesController.findServices);

router.post('/save-product-sale', massagePOSController.saveProductsSale);
router.post('/save-services-sale', massagePOSController.saveServicesSale);

router.post('/move-stock', massageInventoryController.moveStock)
router.post('/stock-taking', massageInventoryController.stockTaking)
router.post('/stock-movement-records', massageInventoryController.fetchStockMovementRecords)

router.post('/product-sale-report', getProductSalesReport)
module.exports = router;
