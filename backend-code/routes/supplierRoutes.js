const express = require('express');
const supplierController = require('../controllers/supplierController')
const router = express.Router();

router.post('/save-supplier', supplierController.registerNewsupplier);
router.post('/delete-supplier', supplierController.deletesupplier);
router.post('/edit-supplier', supplierController.editsupplier);
router.get('/get-suppliers', supplierController.getsuppliers);

module.exports = router;
