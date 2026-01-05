const db = require('../../config/db_connection')

const submitIncomeSubmission = async (date, submittedBy, servicesAmount, productsAmount, receivedBy) => {
    const timestamp = Date.now().toString().slice(-6);
    const submissionId = `SM-${timestamp}-${Math.floor(Math.random() * 1000)}`
    try {
        const query = 'INSERT INTO equatorialmassagemoneysubmission (submissionId, submissionDate, massageamount, productamount, submittedBy, receivedBy, submissionstatus) VALUES (?, ?, ?, ?, ?, ?, ?)'
        await db.execute(query, [submissionId, date, servicesAmount, productsAmount, submittedBy, receivedBy, 'pendng'])
        const [records] = await getIncomeRecords("","","", 1, 50)

        return records
    } catch (error) {
        console.error('Error submitting income:', error);
        throw error;
    }
}

const markAsReceived = async (id) => {
    try {
        let query = 'UPDATE equatorialmassagemoneysubmission SET submissionstatus = ? WHERE submissionId = ?';
        await db.execute(query, ['received', id]);
        const [records] = await getIncomeRecords("","","", 1, 5)

        return records
    } catch (error) {
        console.error('Error marking submission as received:', error);
        throw error;
    }
}

const markAsNotReceived = async (id) => {
    try {
        let query = 'UPDATE equatorialmassagemoneysubmission SET submissionstatus = ? WHERE submissionId = ?';
        await db.execute(query, ['not received', id]);
        const [records] = await getIncomeRecords("","","", 1, 5)

        return records
    } catch (error) {
        console.error('Error marking submission as not received:', error);
        throw error;
    }
}

const getIncomeRecords = async (status, specificDate, startDate, endDate, page, limit) => {
    try {
        let query = 'SELECT * FROM equatorialmassagemoneysubmission WHERE 1=1';

        if (startDate && endDate) {
            query += ` AND createdAt BETWEEN ? AND ?`;
        }

        if (specificDate) {
            query += ` AND DATE(createdAt) = ?`; 
        }

        if (status) {
            query += ` AND DATE(createdAt) = ?`; 
        }

        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

        const params = [];
        if (startDate && endDate) params.push(startDate, endDate);
        if (specificDate) params.push(specificDate);

        const offset = (page - 1) * limit;
        params.push(parseInt(limit), parseInt(offset));

        const [records] = await db.query(query, params);

        return { data: records };
    } catch (error) {
        console.error('Error fetching submissions:', error);
        throw error;
    }
}

module.exports = {submitIncomeSubmission, getIncomeRecords, markAsReceived, markAsNotReceived};
