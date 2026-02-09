const db = require('../config/dbConfig');

const fetchLegacyShopSales = async (startDate, endDate) => {
    console.log(startDate, endDate);
    console.log("🟢 FETCHING LEGACY SALES...");

    try {
        let query = 'SELECT * FROM equatorialShopSales';
        const params = [];

        // Only add date filter if both startDate and endDate are provided
        if (startDate && endDate) {
            query += ' WHERE createdAt BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Always sort descending by createdat
        query += ' ORDER BY createdAt DESC';

        const [rows] = await db.query(query, params);
        return rows;

    } catch (error) {
        console.error("❌ Fatal Error in fetchLegacyShopSales:", error);
        return {
            status: 500,
            message: 'Server error while fetching shop sales'
        };
    }
}

const fetchLegacyMassageSales = async (startDate, endDate) => {
    console.log(startDate, endDate);
    console.log("🟢 FETCHING LEGACY SALES...");

    try {
        let query = 'SELECT * FROM equatorialMassageSales';
        const params = [];

        // Only add date filter if both startDate and endDate are provided
        if (startDate && endDate) {
            query += ' WHERE createdAt BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Always sort descending by createdat
        query += ' ORDER BY createdAt DESC';

        const [rows] = await db.query(query, params);
        return rows;

    } catch (error) {
        console.error("❌ Fatal Error in fetchLegacyMassageales:", error);
        return {
            status: 500,
            message: 'Server error while fetching massage sales'
        };
    }
}

const fetchLegacyExpenses = async (startDate, endDate) => {
    console.log(startDate, endDate);
    console.log("🟢 FETCHING LEGACY EXPENSES...");

    try {
        let query = 'SELECT * FROM equatorialshopexpenditure';
        const params = [];

        // Only add date filter if both startDate and endDate are provided
        if (startDate && endDate) {
            query += ' WHERE createdat BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        // Always sort descending by createdat
        query += ' ORDER BY createdat DESC';

        const [rows] = await db.query(query, params);
        return rows;

    } catch (error) {
        console.error("❌ Fatal Error in fetchLegacyExpenses:", error);
        return {
            status: 500,
            message: 'Server error while fetching expenses'
        };
    }
};

module.exports = {
    fetchLegacyShopSales,
    fetchLegacyMassageSales,
    fetchLegacyExpenses
};