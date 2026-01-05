const salesRecordsModel  = require('../models/salesRecordsModel')

const getSalesRecords = async (req, res) => {
    const { startDate, endDate, specificDate, clientName, receiptNumber, branch } = req.body;
    const page = 1, limit = 200
    try {
      const records = await salesRecordsModel.fetchSalesModel(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);
      if (records.length === 0) {
        return res.status(404).json({ message: 'Records not found' });
      }
      return res.status(200).json({ message: 'Sales records successfully retrieved', records: records });
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Server error while retrieving sales records', error });
    }
};

const getSalesReport = async (req, res) => {
  const { startDate, endDate, specificDate, clientName, receiptNumber, branch } = req.body;
  const page = 1, limit = 1000;
  try {
    const report = await salesRecordsModel.salesReportModel(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);
    return res.status(200).json({ message: 'Sales report generated Successfully', report: report });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error while generating sales report', error });
  }
  
}
module.exports = {getSalesRecords, getSalesReport}