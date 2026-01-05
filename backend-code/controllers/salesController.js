const shopSalesModel = require('../models/salesModel')

const saveSale = async (req, res) => {
    const {branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId} = req.body;
    console.log('id', transactionId)
    try {
        const saveStatus = await shopSalesModel.recordSale(branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId)

        if(saveStatus.status === 403) {
            return res.status(403).json({message: saveStatus.message})
        }else if (saveStatus.status === 500) {
            return res.status(500).json({message: saveStatus.message})
        }else {
            return res.status(200).json({message: saveStatus.message})
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error while saving sale', error });
        console.log(error)
    }
}

const saveProjectsSale = async (req, res) => {
    const {branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId} = req.body;
    console.log('id', transactionId)
    try {
        const saveStatus = await shopSalesModel.recordProjectsSale(branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId)

        if(saveStatus.status === 403) {
            return res.status(403).json({message: saveStatus.message})
        }else if (saveStatus.status === 500) {
            return res.status(500).json({message: saveStatus.message})
        }else {
            return res.status(200).json({message: saveStatus.message})
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error while saving sale', error });
        console.log(error)
    }
}

const updateShopSale = async (req, res) => {
    const {receiptNo, amountPaid, date, paymentMethod, transactionId} = req.body

    try {
       const updateSale = await shopSalesModel.updateShopSale(receiptNo, amountPaid, date, paymentMethod, transactionId);

       if(updateSale.code === 200){
        return res.status(200).json({message: updateSale.message})
       }else{
        return res.status(500).json({message: 'Error while updating sale'})
       }
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating sale', error });
        console.log(error)
    }
}

const updateShopSaleInfoController = async (req, res) => {
    const { branch, receiptNumber, saleDate, totalAmount, balance, paymentStatus, paymentMethod, transactionId, itemsSold } = req.body;
    console.log('Model Payload', receiptNumber, totalAmount, balance, totalAmount-balance, saleDate, paymentMethod, itemsSold, transactionId)

    try {
       const updateSale = await shopSalesModel.updateSaleInfo(branch, receiptNumber, totalAmount, balance, totalAmount-balance, saleDate, paymentMethod, itemsSold, transactionId);

       if(updateSale.code === 200){
        return res.status(200).json({message: updateSale.message})
       }else{
        return res.status(500).json({message: 'Error while updating sale'})
       }
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating sale', error });
        console.log(error)
    }
}

module.exports = {
    updateShopSaleInfoController,
    saveSale,
    saveProjectsSale,
    updateShopSale
}