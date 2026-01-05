const projectsModel = require('../models/projects/projectsModel')
const projectsInventoryModel = require('../models/projects/projectStockMvtModel')

const registerNewProject = async (req, res) => {
    const { name, price } = req.body;
    try {
      const result = await projectsModel.registerNewProjectModel(name, price);
      res.status(201).json({ message: 'Project successfully registered', projects: result }); 
    } catch (error) {
        console.log(error)
      res.status(500).json({ message: 'Server error while registering the project', error });
    }
};

const editProject = async (req, res) => {
    const { id, name, price } = req.body;

    try {
        const products = await projectsModel.updateProjectModel(id, name, price);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        return res.status(200).json({ projects: products, message: 'Project data has been updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating project', error }); 
    }
}

const deleteProject = async (req, res) => {
    const { id } = req.body;

    try {
        const products = await projectsModel.deleteProjectModel(id);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        return res.status(200).json({ message: 'Project deleted successfully', projects: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting project', error }); 
    }
}

const findProject = async (req, res) => {
    const { id } = req.body;

    try {
        const products = await projectsModel.findProjectByName(id);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }
        return res.status(200).json({ message: 'Projects fetched succssfully', products: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding project', error }); 
    }
}

const getAllProjects = async (req, res) => {
    try {
        const products = await projectsModel.fetchAllProjectsModel();
        if (products.length === 0) {
            return res.status(404).json({ message: 'Projects not found' });
        }
        return res.status(200).json({ message: 'Projects fetched succssfully', projects: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching project', error }); 
    }
}

const projectsStockTaking = async (req, res) => {
    try {
        const products = await projectsInventoryModel.stockTakingModel(req.body.branch);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Projects not found' });
        }
        return res.status(200).json({ message: 'Projects fetched succssfully', projects: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching project', error }); 
    }
}

module.exports = { findProject, deleteProject, registerNewProject, editProject, getAllProjects, projectsStockTaking};