// routes/authRoutes.js
const express = require('express');
const { login, updatePassword, resetPassword } = require('../controllers/authController');
const verifyToken = require('../middlewares/jwt_token_verification')
const router = express.Router();

router.post('/login', login);
router.post('/reset-password', resetPassword);
router.post('/update-password', verifyToken, updatePassword);

module.exports = router;
