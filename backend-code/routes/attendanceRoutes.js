const express = require('express');
const attendanceFuncs = require('../controllers/attendanceController')
const multer = require('multer')
const upload = multer({dest: 'attendance_uploads/'})
const router = express.Router();

router.post('/clockin', upload.single('physical_proof_in'), attendanceFuncs.clockIn);
router.post('/clockout', upload.single('physical_proof_out'), attendanceFuncs.clockOut);
router.get('/logs', attendanceFuncs.attendanceLogs);

module.exports = router;
