const equatorialLegacyModel = require('../models/equatorialLegacyModel')
const convertDateFormat = require('../utils/dateConverter')

const getExpensesRecords = async (req, res) => {
    const {
        startDate,
        endDate
    } = req.query;
    try {
        const records = await equatorialLegacyModel.fetchLegacyExpenses(startDate, endDate);
        if (records.length === 0) {
            return res.status(404).json({
                message: 'Records not found'
            });
        }
        return res.status(200).json({
            message: 'Expense records successfully retrieved',
            data: records
        });
    } catch (error) {
        res.status(500).json({
            message: 'Server error while retrieving expense records',
            error
        });
    }
};

const getShopSales = async (req, res) => {
    const {
        startDate,
        endDate
    } = req.query;

    try {
        const report = await equatorialLegacyModel.fetchLegacyShopSales(startDate, endDate);

        return res.status(200).json({
            message: 'Shop sales successfully fetched',
            report: report
        });
    } catch (error) {
        res.status(500).json({
            message: 'Server error while generating shop Sales report',
            error
        });
    }
}

const getMassageSales = async (req, res) => {
    const {
        startDate,
        endDate
    } = req.query;

    try {
        const report = await equatorialLegacyModel.fetchLegacyMassageSales(startDate, endDate);

        return res.status(200).json({
            message: 'Massage sales successfully fetched',
            report: report
        });
    } catch (error) {
        res.status(500).json({
            message: 'Server error while generating massage Sales report',
            error
        });
    }
}

module.exports = {
    getExpensesRecords,
    getShopSales,
    getMassageSales
};