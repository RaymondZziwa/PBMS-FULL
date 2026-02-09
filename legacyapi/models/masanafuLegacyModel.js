const db = require('../config/dbConfig');

const fetchLegacySales = async (branch, startDate, endDate) => {
    console.log(branch, startDate, endDate);
    console.log("🟢 FETCHING LEGACY SALES...");

    try {
        let query = 'SELECT * FROM masanafuShopSales';
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
        console.error("❌ Fatal Error in fetchLegacySales:", error);
        return {
            status: 500,
            message: 'Server error while fetching sales'
        };
    }
}

const fetchLegacyExpenses = async (startDate, endDate) => {
    try {
        let query = 'SELECT * FROM masanafushopexpenditure';
        const params = [];

        if (startDate && endDate) {
            query += `
        WHERE createdat >= ?
        AND createdat < DATE_ADD(?, INTERVAL 1 DAY)
      `;
            params.push(startDate, endDate);
        }

        query += ' ORDER BY createdat DESC';

        const [rows] = await db.query(query, params);
        console.log(rows);
        return rows;

    } catch (error) {
        console.error('❌ fetchLegacyExpenses error:', error);
        throw error;
    }
};

module.exports = {
    fetchLegacySales,
    fetchLegacyExpenses
};