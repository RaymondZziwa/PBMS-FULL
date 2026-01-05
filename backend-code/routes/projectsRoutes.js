const express = require('express');
const projectsController = require('../controllers/projectsController')
const router = express.Router();

router.post('/register-project', projectsController.registerNewProject);
router.post('/delete-project', projectsController.deleteProject);
router.post('/edit-project', projectsController.editProject);
router.get('/find-projects', projectsController.findProject);
router.post('/get-all-projects', projectsController.getAllProjects);
router.post('/projects-stock-taking', projectsController.projectsStockTaking)
module.exports = router;
