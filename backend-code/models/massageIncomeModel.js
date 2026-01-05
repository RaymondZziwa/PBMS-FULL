const db = require('../config/db_connection');

const approveEntry = async (branch, id) => {
    try {
        const newStatus = 'received'
        const query = `UPDATE ${branch}massagemoneysubmission SET submissionstatus = ? WHERE submissionId = ?`
        await db.execute(query, [newStatus, id])
    } catch (error) {
        console.error('Error while receiving income:', error);
        throw new Error('Unable to confirm income:');
    }
}

const denyEntry = async (branch, id) => {
    try {
        const newStatus = 'received'
        const query = `UPDATE ${branch}massagemoneysubmission SET submissionstatus = ? WHERE submissionId = ?`
        await db.execute(query, [newStatus, id])
    } catch (error) {
        console.error('Error while declining income:', error);
        throw new Error('Unable to decline income:');
    }
}

const submitIncomeEntry = async (branch, date, submittedBy, submissionStatus, amountSubmitted, productsAmount, receivedBy) => {
    try {
        const timestamp = Date.now().toString().slice(-6);
        const submissionId = `SM-${timestamp}-${Math.floor(Math.random() * 1000)}`
        const query = `INSERT INTO ${branch}massagemoneysubmission (submissionId, submissionDate, massageamount, productamount, submittedBy, receivedBy, submissionstatus) VALUES (?, ?, ?, ?, ?, ?, ?)`
        await db.execute(query, [submissionId, date, amountSubmitted, productsAmount, submittedBy, receivedBy, submissionStatus])
    } catch (error) {
        console.error('Error while submitting income:', error);
        throw new Error('Unable to submit income:');
    }
}

const fetchAllEntries = async (branch, startDate, endDate, specificDate) => {
    const page = 1, limit = 200;
    try {
        let query = `SELECT * FROM ${branch}massagemoneysubmission WHERE 1=1`;

        if (startDate && endDate) {
            query += ` AND createdat BETWEEN ? AND ?`;
        }

        if (specificDate) {
            query += ` AND DATE(createdat) = ?`;
        }

        query += ` ORDER BY createdat DESC LIMIT ? OFFSET ?`;

        // Construct query parameters
        const params = [];
        if (startDate && endDate) {
            params.push(startDate, endDate);
        }
        if (specificDate) params.push(specificDate);

        const offset = (page - 1) * limit;
        params.push(parseInt(limit), parseInt(offset));

        // Execute the query with parameters
        const [records] = await db.query(query, params);

        return records;
    } catch (error) {
        console.error('Error fetching submission entries:', error);
        throw new Error('Unable to fetch submission entries');
    }
}

module.exports = {
    approveEntry,
    denyEntry,
    submitIncomeEntry,
    fetchAllEntries
}