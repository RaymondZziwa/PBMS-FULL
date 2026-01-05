const db = require('../../config/db_connection');

const fetchProductSalesModel = async (branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit) => {
    try {
        let query = `SELECT * FROM ${branch}MassageSales WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) AS total FROM ${branch}MassageSales WHERE 1=1`;

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
        console.error('Error fetching product sales:', error);
        throw new Error('Unable to fetch product sales');
    }
};

const fetchServiceSalesModel = async (branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit) => {
    try {
        let query = `SELECT * FROM ${branch}MassageServicesRecords WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) AS total FROM ${branch}MassageServicesRecords WHERE 1=1`;

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
        console.error('Error fetching service sales:', error);
        throw new Error('Unable to fetch service sales');
    }
};

const getProductSalesReport = async (branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit) => {
  try {
      const productSalesData = await fetchProductSalesModel(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);
      const serviceSalesData = await fetchServiceSalesModel(branch, receiptNumber, clientName, startDate, endDate, specificDate, page, limit);

      // Extract sales data from response
      const { data: productSales } = productSalesData;
      const { data: serviceSales } = serviceSalesData;

      // Initialize metrics
      let totalTransactionAmount = 0;
      let totalServiceAmount = 0;
      let totalBalanceAmount = 0;
      const dailySalesData = {}; // Object to store daily sales data

      // Initialize income for last 30 days, 7 days, and 1 day
      let incomeLast30Days = 0;
      let incomeLast7Days = 0;
      let incomeLast1Day = 0;

      // Get current date and calculate date ranges
      const currentDate = new Date();
      const last30DaysDate = new Date(currentDate);
      last30DaysDate.setDate(currentDate.getDate() - 30);

      const last7DaysDate = new Date(currentDate);
      last7DaysDate.setDate(currentDate.getDate() - 7);

      const last1DayDate = new Date(currentDate);
      last1DayDate.setDate(currentDate.getDate() - 1);

      // Helper function to process sales data (both products & services)
      const processSalesData = (sales, isService = false) => {
          sales.forEach((sale) => {
              const saleDate = new Date(sale.createdAt);
              const saleAmount = parseFloat(sale.totalAmount);
              const balanceAmount = parseFloat(sale.balance);

              // Calculate total transaction amounts
              if (isService) {
                  totalServiceAmount += saleAmount;
              } else {
                  totalTransactionAmount += saleAmount;
              }

              // Calculate total balance
              totalBalanceAmount += balanceAmount;

              // Format date for grouping
              const saleDateString = saleDate.toISOString().split('T')[0];

              // Initialize daily data if not existing
              if (!dailySalesData[saleDateString]) {
                  dailySalesData[saleDateString] = {
                      totalSales: 0,
                      totalServiceSales: 0,
                      totalAmount: 0,
                      totalServiceAmount: 0,
                      transactions: 0,
                      balance: 0,
                  };
              }

              // Update daily sales data
              if (isService) {
                  dailySalesData[saleDateString].totalServiceSales += 1;
                  dailySalesData[saleDateString].totalServiceAmount += saleAmount;
              } else {
                  dailySalesData[saleDateString].totalSales += 1;
                  dailySalesData[saleDateString].totalAmount += saleAmount;
              }
              
              dailySalesData[saleDateString].balance += balanceAmount;
              dailySalesData[saleDateString].transactions += 1;

              // Calculate income for last 30 days, 7 days, and 1 day
              if (saleDate >= last30DaysDate) incomeLast30Days += saleAmount;
              if (saleDate >= last7DaysDate) incomeLast7Days += saleAmount;
              if (saleDate >= last1DayDate) incomeLast1Day += saleAmount;
          });
      };

      // Process both product and service sales
      processSalesData(productSales, false); // Products
      processSalesData(serviceSales, true); // Services

      // Convert daily sales data to an array
      const dailySalesArray = Object.keys(dailySalesData).map((date) => ({
          date,
          totalSales: dailySalesData[date].totalSales,
          totalServiceSales: dailySalesData[date].totalServiceSales,
          totalAmount: dailySalesData[date].totalAmount,
          totalServiceAmount: dailySalesData[date].totalServiceAmount,
          transactions: dailySalesData[date].transactions,
          balance: dailySalesData[date].balance,
      }));

      // Calculate additional metrics
      const numberOfTransactions = productSales.length + serviceSales.length;
      const averageTransactionValue = (totalTransactionAmount + totalServiceAmount) / numberOfTransactions;
      const percentagePaid = ((totalTransactionAmount + totalServiceAmount - totalBalanceAmount) / (totalTransactionAmount + totalServiceAmount)) * 100;

      // Generate the report
      const report = {
          totalTransactionAmount,
          totalServiceAmount,
          totalBalanceAmount,
          numberOfTransactions,
          averageTransactionValue,
          percentagePaid,
          incomeLast30Days,
          incomeLast7Days,
          incomeLast1Day,
          dailySales: dailySalesArray,
          rawData: [...productSales, ...serviceSales], // Include raw data
      };

      return report;
  } catch (error) {
      console.error('Error generating product sales report:', error);
      throw new Error('Unable to generate product reports');
  }
};

module.exports = { 
    fetchProductSalesModel, 
    fetchServiceSalesModel,
    getProductSalesReport,
}