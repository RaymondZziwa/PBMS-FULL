const express = require('express');
const clientController = require('../controllers/customerController')
const router = express.Router();

router.post('/save-client', clientController.registerNewClient);
router.post('/delete-client', clientController.deleteClient);
router.post('/edit-client', clientController.editClient);
router.get('/get-clients', clientController.getClients);

module.exports = router;
