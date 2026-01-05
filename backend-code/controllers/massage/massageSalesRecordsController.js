const massageSalesRecordsModel  = require('../../models/massage/massageSalesRecordsModel')

const getProductSalesRecords = async (req, res) => {
    const { startDate, endDate, specificDate, clientName, receiptNumber, branch } = req.body;
    const page = 1, limit = 200
    try {
      const records = await massageSalesRecordsModel.fetchProductSalesModel(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);
      if (records.length === 0) {
        return res.status(404).json({ message: 'Records not found' });
      }
      return res.status(200).json({ message: 'Product sales records successfully retrieved', records: records });
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Server error while retrieving sales records', error });
    }
};

const getServicesSalesRecords = async (req, res) => {
    const { startDate, endDate, specificDate, clientName, receiptNumber, branch } = req.body;
    const page = 1, limit = 200
    try {
      const records = await massageSalesRecordsModel.fetchServiceSalesModel(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);
      if (records.length === 0) {
        return res.status(404).json({ message: 'Records not found' });
      }
      return res.status(200).json({ message: 'Service sales records successfully retrieved', records: records });
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: 'Server error while retrieving sales records', error });
    }
};

const getProductSalesReport = async (req, res) => {
  const { startDate, endDate, specificDate, clientName, receiptNumber, branch } = req.body;
  const page = 1, limit = 200
  try {
    const records = await massageSalesRecordsModel.getProductSalesReport(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);
    if (records.length === 0) {
      return res.status(404).json({ message: 'Records not found' });
    }
    return res.status(200).json({ message: 'Product sales report successfully generated', report: records });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error while generating report', error });
  }
};


module.exports = {getProductSalesRecords, getServicesSalesRecords, getProductSalesReport}