
const express = require('express');
const visitController = require('../../controllers/pbpm/visitController');
//const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
//router.use(authMiddleware);

router.get('/', visitController.getAllVisits);
router.get('/patient/:patientId', visitController.getVisitsByPatient);
router.get('/:id', visitController.getVisit);
router.post('/patient/:patientId', visitController.createVisit);
router.put('/:id', visitController.updateVisit);
router.delete('/:id', visitController.deleteVisit);

module.exports = router;
