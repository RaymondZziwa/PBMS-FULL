const express = require('express');
const {getExpensesRecords, createExpense, editExpense, deleteExpense, getExpensesReport} = require('../controllers/expensesController')
const router = express.Router();

router.post('/get-expenses', getExpensesRecords);
router.post('/expenses-report', getExpensesReport);
router.post('/create', createExpense);
router.post('/delete', deleteExpense);
router.post('/edit', editExpense);

module.exports = router;
