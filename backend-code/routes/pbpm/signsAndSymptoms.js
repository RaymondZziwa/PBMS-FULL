
const express = require('express');
const userController = require('../../controllers/pbpm/signsAndSymptomsController');
//const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
//router.use(authMiddleware);

router.get('/signs', userController.getSigns);
router.get('/symptoms', userController.getSymptoms);

module.exports = router;
