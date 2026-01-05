const attendanceModel = require('../models/attendanceModel');

const clockIn = async (req, res) => {
    const { employee_id, log_date, time_in } = req.body;
    console.log('cont', employee_id, log_date, time_in)
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Proof image is required.' });
        }

        const proof = `/attendance_uploads/proofs/${file.filename}`;

        const result = await attendanceModel.clockInModel(employee_id, log_date, time_in, proof);

        if (result.code === 400) {
            return res.status(400).json({ message: result.message });
        }

        if (result.code === 201) {
            return res.status(201).json({ message: result.message });
        }

        return res.status(500).json({ message: 'Unexpected error occurred.' });
    } catch (error) {
        console.error('Error in clockIn controller:', error);
        return res.status(500).json({ message: 'Server error while clocking in', error });
    }
};


const clockOut = async (req, res) => {
    const { employee_id, log_date, time_out } = req.body;
    console.log('cont', employee_id, log_date, time_out)
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Proof image is required.' });
        }

        const proof = `/attendance_uploads/proofs/${file.filename}`;

        const result = await attendanceModel.clockOutModel(employee_id, log_date, time_out, proof);

        if (result.code === 404) {
            return res.status(404).json({ message: result.message });
        }

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Clock-out successful', result });
        }

        return res.status(404).json({ message: 'No matching attendance record found for clock-out' });
    } catch (error) {
        console.error('Error occurred while clocking out:', error);
        return res.status(500).json({ message: 'Server error while clocking out', error });
    }
};


const attendanceLogs = async (req, res) => {
    try {
        const logs = await attendanceModel.getAttendanceLogsModel()
        if (logs.length === 0) {
            return res.status(404).json({ message: 'Logs not found' });
        }
        return res.status(200).json({ logs: logs, message: 'Attendance logs retrieved successfully'})
    } catch (error) {
        res.status(500).json({ message: 'Server error while getting attendance logs', error }); 
    }
}

module.exports = { clockIn, clockOut, attendanceLogs };