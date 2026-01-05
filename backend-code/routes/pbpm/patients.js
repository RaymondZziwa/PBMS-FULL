
const express = require('express');
const patientController = require('../../controllers/pbpm/patientController');
//const authMiddleware = require('../middleware/auth');

const router = express.Router();

// router.use(authMiddleware);

router.get('/', patientController.getPatients);
router.get('/:id', patientController.getPatient);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

module.exports = router;
