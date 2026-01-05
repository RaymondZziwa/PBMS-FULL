const db = require('../config/db_connection')

const fetchExpenses = async (branch, category, name, startDate, endDate ,specificDate) => {
    const page = 1, limit = 200;
    try {
        // Start building the base query
        let query = `SELECT expenditureid, date, expenditurecategory, expenditurename, expendituredescription, expenditurecost, balance, createdat FROM ${branch}shopexpenditure WHERE 1=1`;

        // Add filters based on the provided criteria
        if (category) {
            query += ` AND LOWER(expenditurecategory) LIKE ?`;
        }

        if (name) {
            query += ` AND LOWER(expenditurename) LIKE ?`;
        }

        if (startDate && endDate) {
            query += ` AND createdat BETWEEN ? AND ?`;
        }

        if (specificDate) {
            query += ` AND DATE(createdat) = ?`;
        }

        query += ` ORDER BY createdat DESC LIMIT ? OFFSET ?`;

        // Construct query parameters
        const params = [];
        if (category) params.push(category);
        if (name) params.push(`%${name.toLowerCase()}%`);
        if (startDate && endDate) {
            params.push(startDate, endDate);
        }
        if (specificDate) params.push(specificDate);

        const offset = (page - 1) * limit;
        params.push(parseInt(limit), parseInt(offset));

        // Execute the query with parameters
        const [expenses] = await db.query(query, params);

        return expenses;
    } catch (error) {
        console.error('Error fetching expenses:', error);
        throw new Error('Unable to fetch expenses');
    }
}

const expensesReportModel = async (branch, category, name, startDate, endDate, specificDate, page, limit) => {
    try {
      // Fetch filtered expenses data
      const data = await fetchExpenses(branch, category, name, startDate, endDate, specificDate, page, limit);
  
      // Initialize metrics
      let totalExpensesAmount = 0;
      let totalBalanceAmount = 0;
      const dailyExpensesData = {}; // Object to store daily expenses data
  
      // Initialize metrics for last 30 days, 7 days, and 1 day
      let expensesLast30Days = 0;
      let expensesLast7Days = 0;
      let expensesLast1Day = 0;
  
      // Get the current date and calculate the dates for the last 30, 7, and 1 day
      const currentDate = new Date();
      const last30DaysDate = new Date(currentDate);
      last30DaysDate.setDate(currentDate.getDate() - 30);
  
      const last7DaysDate = new Date(currentDate);
      last7DaysDate.setDate(currentDate.getDate() - 7);
  
      const last1DayDate = new Date(currentDate);
      last1DayDate.setDate(currentDate.getDate() - 1);
  
      // Process expenses data
      data.forEach((expense) => {
        const expenseDate = new Date(expense.createdat); // Convert to Date object
        const expenseAmount = parseFloat(expense.expenditurecost) || 0;
        const balanceAmount = parseFloat(expense.balance) || 0;
  
        // Calculate totals
        totalExpensesAmount += expenseAmount;
        totalBalanceAmount += balanceAmount;
  
        // Group expenses by day
        const expenseDateString = expenseDate.toISOString().split('T')[0]; // Extract date (YYYY-MM-DD)
        if (!dailyExpensesData[expenseDateString]) {
          dailyExpensesData[expenseDateString] = {
            totalExpenses: 0,
            totalAmount: 0,
            transactions: 0,
            balance: 0,
          };
        }
  
        dailyExpensesData[expenseDateString].totalExpenses += 1;
        dailyExpensesData[expenseDateString].totalAmount += expenseAmount;
        dailyExpensesData[expenseDateString].balance += balanceAmount;
        dailyExpensesData[expenseDateString].transactions += 1;
  
        // Calculate expenses for last 30 days, 7 days, and 1 day
        if (expenseDate >= last30DaysDate) {
          expensesLast30Days += expenseAmount;
        }
        if (expenseDate >= last7DaysDate) {
          expensesLast7Days += expenseAmount;
        }
        if (expenseDate >= last1DayDate) {
          expensesLast1Day += expenseAmount;
        }
      });
  
      // Convert daily expenses data to an array for easier use
      const dailyExpensesArray = Object.keys(dailyExpensesData).map((date) => ({
        date,
        totalExpenses: dailyExpensesData[date].totalExpenses,
        totalAmount: dailyExpensesData[date].totalAmount,
        transactions: dailyExpensesData[date].transactions,
        balance: dailyExpensesData[date].balance,
      }));
  
      // Calculate additional metrics
      const numberOfTransactions = data.length;
      const averageTransactionValue = numberOfTransactions > 0 ? totalExpensesAmount / numberOfTransactions : 0;
      const percentagePaid = totalExpensesAmount > 0 ? ((totalExpensesAmount - totalBalanceAmount) / totalExpensesAmount) * 100 : 0;
  
      // Generate the report
      const report = {
        totalExpensesAmount,
        totalBalanceAmount,
        numberOfTransactions,
        averageTransactionValue,
        percentagePaid,
        expensesLast30Days,
        expensesLast7Days,
        expensesLast1Day,
        dailyExpenses: dailyExpensesArray,
        rawData: data, // Include raw data for reference
      };
  
      return report;
    } catch (error) {
      console.error('Error deriving expenses report', error);
      throw new Error('Unable to derive expenses report');
    }
};

module.exports = {
  fetchExpenses,
  expensesReportModel
};