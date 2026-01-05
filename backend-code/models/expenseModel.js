const db = require('../config/db_connection');
const expenseRecordsModel  = require('../models/expenseRecordsModel')

const createExpense = async (branch, date, category, name, desc, cost, amountPaid, balance, paymentMethod, paymentStatus) => {
    try {
        const query = `INSERT INTO ${branch}shopexpenditure (date, expenditurecategory, expenditurename, expendituredescription, expenditurecost, amountspent, balance, paymentmethod, paymentstatus, createdat) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`;
        await db.execute(query, [date, category, name, desc, cost, amountPaid, balance, paymentMethod, paymentStatus, new Date ()]);
        const updatedList = expenseRecordsModel.fetchExpenses(branch);
        return updatedList;
    } catch (error) {
        console.log(error)
        throw error 
    }
}
const editExpense = async (branch, id, category, name, desc, cost, amountPaid, balance, paymentMethod, paymentStatus) => {
    const page = 1, limit = 20
    try {
        let query = `UPDATE ${branch}shopexpenditure SET`;
        const queryParams = [];

        if (category) {
            query += ' expenditurecategory = ?,';
            queryParams.push(category);
        }
        
        if (name) {
            query += ' expenditurename = ?,';
            queryParams.push(name);
        }

        if (desc) {
            query += ' expendituredescription = ?,'
            queryParams.push(desc);
        }

        if (cost) {
            query += ' expenditurecost = ?,'
            queryParams.push(cost);
        }

        if (amountPaid) {
            query += ' amountspent = ?,'
            queryParams.push(amountPaid);
        }

        if (balance) {
            query += ' balance = ?,'
            queryParams.push(balance);
        }

        if (paymentMethod) {
            query += ' paymentmethod = ?,'
            queryParams.push(paymentMethod);
        }

        if (paymentStatus) {
            query += ' paymentStatus = ?'
            queryParams.push(balance);
        }

        query += ' WHERE expenditureid = ?';
        queryParams.push(id);

        // Execute the update query
        await db.execute(query, queryParams);

        // Fetch the updated list of products
        const updatedList = await expenseRecordsModel.fetchExpenses(branch, page, limit);
        return updatedList;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
}

const deleteExpense = async (branch, id) => {
    const page = 1, limit = 20
    try {
        const query = `DELETE FROM ${branch}shopexpenditure WHERE expenditureid = ?`;
        await db.execute(query, [id]);
        const updatedList = expenseRecordsModel.fetchExpenses(branch, page, limit);
        return updatedList;
    } catch (error) {
        console.log(error)
        throw error 
    }
}

module.exports = {
    createExpense,
    editExpense,
    deleteExpense
}