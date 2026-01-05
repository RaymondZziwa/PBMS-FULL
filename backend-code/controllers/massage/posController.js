const massageSalesModel = require('../../models/massage/massagePosModel')

const saveProductsSale = async (req, res) => {
    const {branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId} = req.body;
    try {
        const saveStatus = await massageSalesModel.recordProductSale(branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId)

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

const saveServicesSale = async (req, res) => {
    const {branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId} = req.body;
    console.log('id', transactionId)
    try {
        const saveStatus = await massageSalesModel.recordServiceSale(branch, items, receiptNumber, total, additionalInfo, paymentMethod, paymentStatus, balance, customerNames, customerContact, date, transactionId)
        console.log('req', req.body)
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

module.exports = {
    saveProductsSale,
    saveServicesSale
}