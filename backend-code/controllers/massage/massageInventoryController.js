const massageStoreModel = require('../../models/massage/massageInventoryModel')

const moveStock = async (req, res) => {
    const {date, branch, category, items, source, notes} = req.body;
    try {
        console.log('test', req.body)
        const newStockLevels = await massageStoreModel.productStockMvtModel(date, branch, category, items, source, notes)

        return res.status(200).json({message: 'Stock moved successfully', data: newStockLevels})
    } catch (error) {
        res.status(500).json({ message: 'Server error while moving stock', error });
        console.log(error)
    }
}

const stockTaking = async (req, res) => {
    try {
        const {branch} = req.body
        const data = await massageStoreModel.stockTakingModel(branch)
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
        const data = await massageStoreModel.fetchAllTransactionsModel(branch)
        return res.status(200).json({message: 'Records fetched successfully', data: data})
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching records', error });
    }
}

const findMassageProducts = async (req, res) => {
    const { id } = req.body;

    try {
        const products = await massageStoreModel.fetchMassageProductsModel(id);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ message: 'Products fetched succssfully', products: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding product', error }); 
    }
}

module.exports = {
    moveStock,
    stockTaking,
    fetchStockMovementRecords,
    findMassageProducts
}