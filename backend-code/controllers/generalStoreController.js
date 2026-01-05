const generalStoreModel = require('../models/generalStoreModel')

const moveStock = async (req, res) => {
    const {date, branch, category, items, source, notes} = req.body;
    try {
        const newStockLevels = await generalStoreModel.gsStockMvtModel(date, branch, category, items, source, notes)

        return res.status(200).json({message: 'Stock moved successfully', data: newStockLevels})
    } catch (error) {
        res.status(500).json({ message: 'Server error while moving stock', error });
        console.log(error)
    }
}

const stockTaking = async (req, res) => {
    try {
        const {branch} = req.body
        const data = await generalStoreModel.stockTakingModel(branch)
        if(!data.length){
            return res.status(400).json({message: 'Error while taking stock'})
        }else{
            return res.status(200).json({message: 'Stock taken successfully', data: data})
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error while stock taking', error });
    }
}

const fetchStockMovementRecords = async (req, res) => {
    try {
        const {branch} = req.body
        const data = await generalStoreModel.fetchAllTransactionsModel(branch)
        return res.status(200).json({message: 'Records fetched successfully', data: data})
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching records', error });
    }
}

module.exports = {
    moveStock,
    stockTaking,
    fetchStockMovementRecords
}