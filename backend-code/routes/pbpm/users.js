
const express = require('express');
const userController = require('../../controllers/pbpm/userController');
//const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
// router.use(authMiddleware);

router.put('/profile', userController.updateProfile);
router.put('/password', userController.changePassword);

module.exports = router;
