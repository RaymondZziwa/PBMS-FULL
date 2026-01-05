const db = require('../config/db_connection')

const clockInModel = async (employee_id, log_date, time_in, proof) => {
    console.log('mod', employee_id, log_date, time_in)
    try {
        const existingEntryQuery = `
            SELECT * 
            FROM attendance_logs 
            WHERE employee_id = ? AND log_date = ? 
            AND time_in IS NOT NULL 
            AND time_out IS NULL`;

        const [rows] = await db.query(existingEntryQuery, [employee_id, log_date]);

        if (rows.length > 0) {
            return {
                code: 400,
                message: 'You have already clocked in for today.',
            };
        }

        const insertQuery = `
            INSERT INTO attendance_logs (employee_id, log_date, time_in, physical_proof_in) 
            VALUES (?, ?, ?, ?)`;

        await db.query(insertQuery, [employee_id, log_date, time_in, proof]);

        return {
            code: 201,
            message: 'Clock-in successful.',
        };
    } catch (error) {
        console.error('Error while processing clock-in: ', error);

        return {
            code: 500,
            message: "Internal server error. Can't perform this action. Contact system support for assistance.",
        };
    }
};


const clockOutModel = async (employee_id, log_date, time_out, proof) => {
    console.log('mod', employee_id, log_date, time_out, proof)
    const existingEntryQuery = `
        SELECT * 
        FROM attendance_logs 
        WHERE employee_id = ? 
        AND log_date = ? 
        AND time_in IS NOT NULL 
        AND time_out IS NULL`;

    try {
        const [rows] = await db.query(existingEntryQuery, [employee_id, log_date]);

        if (rows.length === 0) {
            return { code: 404, message: 'You did not clock in today' };
        }

        if (rows[0].time_out) {
            return { code: 404, message: 'You have already clocked out' };
        }

        const timeIn = new Date(`${log_date}T${rows[0].time_in}`);
        const timeOut = new Date(`${log_date}T${time_out}`);

        console.log("timeIn:", timeIn, rows[0].time_in, "timeOut:", timeOut);

        if (isNaN(timeIn.getTime()) || isNaN(timeOut.getTime())) {
            return { code: 400, message: "Invalid time format" };
        }

        const timeDifference = timeOut.getTime() - timeIn.getTime();
        let hrs_wrked = (timeDifference / (1000 * 60 * 60)).toFixed(1);
        let hrs_msd = (10 - parseFloat(hrs_wrked)).toFixed(1);

        console.log("Hours Worked:", hrs_wrked, "Hours Missed:", hrs_msd);

        const updateQuery = `
            UPDATE attendance_logs 
            SET time_out = ?, physical_proof_out = ?, hours_worked = ?, hours_missed = ? 
            WHERE employee_id = ? 
            AND log_date = ? 
            AND time_in IS NOT NULL 
            AND time_out IS NULL`;

        const [result] = await db.query(updateQuery, [time_out, proof, hrs_wrked, hrs_msd, employee_id, log_date]);
        return result;
    } catch (error) {
        console.error('Error in clockOutModel:', error);
        throw error;
    }
};

const getAttendanceLogsModel = async () => {
    const query = 'SELECT attendance_logs.*, employees.first_name, employees.last_name FROM attendance_logs JOIN employees ON attendance_logs.employee_id = employees.employee_id ORDER BY attendance_logs.log_date DESC, attendance_logs.createdAt DESC;';
    try {
        const [rows] = await db.query(query);
        console.log(rows)
        return rows
    } catch (error) {
        console.log(error)
        console.log('error occured in the fetch attendance logs model function')
    }
}

module.exports = {
    clockInModel,
    clockOutModel,
    getAttendanceLogsModel
}