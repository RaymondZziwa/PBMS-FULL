const express = require('express');
const adminFuncs = require('../controllers/adminController')
const router = express.Router();

router.post('/register', adminFuncs.registerNewEmployee);
router.post('/delete', adminFuncs.deleteEmployee);
router.post('/edit', adminFuncs.editEmployee);
router.post('/list', adminFuncs.getEmployees);
router.post('/save-payroll', adminFuncs.generatePayroll);
router.post('/salary-details', adminFuncs.getSalaryDetails)
router.post('/salary-payment-records', adminFuncs.filterSalaryPaymentRecords)
module.exports = router;
