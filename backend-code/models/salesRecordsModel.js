const db = require('../config/db_connection');

const fetchSalesModel = async (branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit) => {
    try {
        let query = `SELECT * FROM ${branch}ShopSales WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) AS total FROM ${branch}ShopSales WHERE 1=1`;

        if (receiptNumber) {
            query += ` AND receiptNumber = ?`;
            countQuery += ` AND receiptNumber = ?`;
        }

        if (clientName) {
            query += ` AND LOWER(customerNames) LIKE ?`;
            countQuery += ` AND LOWER(customerNames) LIKE ?`;
        }

        if (startDate && endDate) {
            query += ` AND createdAt BETWEEN ? AND ?`;
            countQuery += ` AND createdAt BETWEEN ? AND ?`;
        }

        if (specificDate) {
            query += ` AND DATE(createdAt) = ?`; 
            countQuery += ` AND DATE(createdAt) = ?`;
        }

        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

        const params = [];
        if (receiptNumber) params.push(receiptNumber);
        if (clientName) params.push(`%${clientName.toLowerCase()}%`);
        if (startDate && endDate) params.push(startDate, endDate);
        if (specificDate) params.push(specificDate);

        const offset = (page - 1) * limit;
        params.push(parseInt(limit), parseInt(offset));

        const [sales] = await db.query(query, params);
        const [countResult] = await db.query(countQuery, params.slice(0, -2)); // Remove LIMIT and OFFSET from count params

        return { data: sales, total: countResult[0].total };
    } catch (error) {
        console.error('Error fetching sales:', error);
        throw new Error('Unable to fetch sales');
    }
};

const salesReportModel = async (branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit) => {
    try {
      // Fetch filtered sales data
      const data = await fetchSalesModel(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);
      const { data: sales } = data;
  
      // Initialize metrics
      let totalTransactionAmount = 0;
      let totalBalanceAmount = 0;
      const dailySalesData = {}; // Object to store daily sales data
  
      // Initialize metrics for last 30 days, 7 days, and 1 day
      let incomeLast30Days = 0;
      let incomeLast7Days = 0;
      let incomeLast1Day = 0;
  
      // Get the current date and calculate the dates for the last 30, 7, and 1 day
      const currentDate = new Date();
      const last30DaysDate = new Date(currentDate);
      last30DaysDate.setDate(currentDate.getDate() - 30);
  
      const last7DaysDate = new Date(currentDate);
      last7DaysDate.setDate(currentDate.getDate() - 7);
  
      const last1DayDate = new Date(currentDate);
      last1DayDate.setDate(currentDate.getDate() - 1);
  
      // Process sales data
      sales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt); // Convert to Date object
        const saleAmount = parseFloat(sale.totalAmount);
        const balanceAmount = parseFloat(sale.balance);
  
        // Calculate total transaction amount
        totalTransactionAmount += saleAmount;
  
        // Calculate total balance amount
        totalBalanceAmount += balanceAmount;
  
        // Group sales by day
        const saleDateString = saleDate.toISOString().split('T')[0]; // Extract date (YYYY-MM-DD)
        if (!dailySalesData[saleDateString]) {
          dailySalesData[saleDateString] = {
            totalSales: 0,
            totalAmount: 0,
            transactions: 0,
            balance: 0,
          };
        }
        dailySalesData[saleDateString].totalSales += 1;
        dailySalesData[saleDateString].totalAmount += saleAmount;
        dailySalesData[saleDateString].balance += balanceAmount;
        dailySalesData[saleDateString].transactions += 1;
  
        // Calculate income for last 30 days, 7 days, and 1 day
        if (saleDate >= last30DaysDate) {
          incomeLast30Days += saleAmount;
        }
        if (saleDate >= last7DaysDate) {
          incomeLast7Days += saleAmount;
        }
        if (saleDate >= last1DayDate) {
          incomeLast1Day += saleAmount;
        }
      });
  
      // Convert daily sales data to an array for easier use
      const dailySalesArray = Object.keys(dailySalesData).map((date) => ({
        date,
        totalSales: dailySalesData[date].totalSales,
        totalAmount: dailySalesData[date].totalAmount,
        transactions: dailySalesData[date].transactions,
        balance: dailySalesData[date].balance
      }));
  
      // Calculate additional metrics
      const numberOfTransactions = sales.length;
      const averageTransactionValue = totalTransactionAmount / numberOfTransactions;
      const percentagePaid = ((totalTransactionAmount - totalBalanceAmount) / totalTransactionAmount) * 100;
  
      // Generate the report
      const report = {
        totalTransactionAmount,
        totalBalanceAmount,
        numberOfTransactions,
        averageTransactionValue,
        percentagePaid,
        incomeLast30Days,
        incomeLast7Days,
        incomeLast1Day,
        dailySales: dailySalesArray,
        rawData: sales, // Include raw data for reference
      };
  
      return report;
    } catch (error) {
      console.error('Error deriving sales report', error);
      throw new Error('Unable to derive sales report');
    }
};

module.exports = {
    fetchSalesModel,
    salesReportModel
}