const expenseRecordsModel  = require('../models/expenseRecordsModel')
const expensesCrudModel = require('../models/expenseModel')
const convertDateFormat = require('../utils/dateConverter')

const createExpense = async (req, res) => {
  const {branch, date, category, name, desc, cost, amountPaid, balance, paymentMethod, paymentStatus} = req.body;
  try {
    const records = await expensesCrudModel.createExpense(branch, convertDateFormat(date), category, name, desc, cost, amountPaid, balance, paymentMethod, paymentStatus);
    if (records.length === 0) {
      return res.status(404).json({ message: 'Records not found' });
    }
    return res.status(201).json({ message: 'Expense record saved successfully', records: records });
  } catch (error) {
    res.status(500).json({ message: 'Server error while saving expense record', error });
  }
}

const editExpense = async (req, res) => {
  const {branch, id, category, name, desc, cost, amountPaid, balance, paymentMethod, paymentStatus} = req.body;
  try {
    const records = await expensesCrudModel.editExpense(branch, id, category, name, desc, cost, amountPaid, balance, paymentMethod, paymentStatus)
    if (records.length === 0) {
      return res.status(404).json({ message: 'Records not found' });
    }
    return res.status(200).json({ message: 'Expense record edited successfully', records: records });
  } catch (error) {
    res.status(500).json({ message: 'Server error while editing expense record', error });
  }
}

const deleteExpense = async (req, res) => {
  const {branch, id} = req.body;
  try {
    const records = await expensesCrudModel.deleteExpense(branch, id);
    if (records.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    return res.status(200).json({ message: 'Expense record deleted successfully', records: records });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting expense record', error });
  }
}

const getExpensesRecords = async (req, res) => {
    const { branch, category, name, startDate, endDate, specificDate } = req.body;
    const page = 1, limit = 200
    try {
      const records = await expenseRecordsModel.fetchExpenses(branch, category, name, startDate, endDate, specificDate, page, limit);
      if (records.length === 0) {
        return res.status(404).json({ message: 'Records not found' });
      }
      return res.status(200).json({ message: 'Expense records successfully retrieved', records: records });
    } catch (error) {
      res.status(500).json({ message: 'Server error while retrieving expense records', error });
    }
};

const getExpensesReport = async (req, res) => {
  const { branch, category, name, startDate, endDate, specificDate } = req.body;
  const page = 1, limit = 200
    try {
      const report = await expenseRecordsModel.expensesReportModel(branch, category, name, startDate, endDate, specificDate, page, limit);
     
      return res.status(200).json({ message: 'Expense report successfully generated', report: report });
    } catch (error) {
      res.status(500).json({ message: 'Server error while generating expenses report', error });
    }
}

module.exports = {getExpensesRecords, deleteExpense, createExpense, editExpense, getExpensesReport};