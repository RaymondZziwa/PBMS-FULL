const namungoonaModel = require('../../models/namungoona/inventoryModel')

const fetchProcessedStockMovementRecords = async (req, res) => {
    try {
        const {branch} = req.body
        const data = await namungoonaModel.fetchProcessedTransactionsModel()
        return res.status(200).json({message: 'Records fetched successfully', data: data})
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching records', error });
    }
}

const processedStockTaking = async (req, res) => {
    try {
        const {branch} = req.body
        const data = await namungoonaModel.processedStockTakingModel()
        if(!data.length){
            return res.status(400).json({message: 'Error while taking stock'})
        }else{
            return res.status(200).json({message: 'Stock taken successfully', data: data})
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error while stock taking', error });
    }
}

const moveProcessedStock = async (req, res) => {
    const { date, branch, category, items, source, notes } = req.body;
  
    try {
      const result = await namungoonaModel.processedStockMvtModel(date, category, items, source, notes);
  
      if (result.success) {
        return res.status(200).json({
          message: result.message,
          success: true
        });
      } else {
        // Partial failure (some items not processed)
        return res.status(207).json({
          message: result.message,
          success: false,
          failedItems: result.failedItems
        });
      }
    } catch (error) {
      console.error('Server error while moving stock:', error);
      return res.status(500).json({
        message: 'Server error while moving stock',
        success: false,
        error: error.message
      });
    }
  };

const moveStock = async (req, res) => {
    const { date, branch, category, items, source, notes } = req.body;
  
    try {
      const result = await namungoonaModel.productStockMvtModel(date, category, items, source, notes);
  
      if (result.success) {
        return res.status(200).json({
          message: result.message,
          success: true
        });
      } else {
        // Partial failure (some items not processed)
        return res.status(207).json({
          message: result.message,
          success: false,
          failedItems: result.failedItems
        });
      }
    } catch (error) {
      console.error('Server error while moving stock:', error);
      return res.status(500).json({
        message: 'Server error while moving stock',
        success: false,
        error: error.message
      });
    }
  };
  
  

const stockTaking = async (req, res) => {
    try {
        const {branch} = req.body
        const data = await namungoonaModel.stockTakingModel()
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
        const data = await namungoonaModel.fetchAllTransactionsModel()
        return res.status(200).json({message: 'Records fetched successfully', data: data})
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching records', error });
    }
}

const saveNewItem = async (req, res) => {
    const { name } = req.body;
  
    try {
      const result = await  namungoonaModel.saveItem(name);
      res.status(201).json({ message: 'Item successfully registered', products: result }); 
    } catch (error) {
      res.status(500).json({ message: 'Server error while registering the item', error });
    }
};

const deleteItem = async (req, res) => {
    const { id } = req.body;

    try {
        const products = await namungoonaModel.deleteItem(id);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        return res.status(200).json({ message: 'Product deleted successfully', products: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting product', error }); 
    }
}

const findItems = async (req, res) => {
    const { id } = req.body;

    try {
        const products = await namungoonaModel.fetchAllItems(id)
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ message: 'Items fetched succssfully', products: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding product', error }); 
    }
}


module.exports = {
    saveNewItem,
    deleteItem,
    findItems,
    moveStock,
    stockTaking,
    fetchStockMovementRecords,
    processedStockTaking,
    moveProcessedStock,
    fetchProcessedStockMovementRecords,
}