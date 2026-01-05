const servicesModel = require('../../models/massage/massageServices')

const registerNewService = async (req, res) => {
    const { name, price } = req.body;
  
    try {
      const existingProduct = await servicesModel.findServiceByName(name)
      if (existingProduct.length > 0) {
        return res.status(400).json({ message: 'Service already exists' });
      }
      const result = await servicesModel.registerNewServiceModel(name, price);
      res.status(201).json({ message: 'Service successfully registered', services: result }); 
    } catch (error) {
      res.status(500).json({ message: 'Server error while registering the service', error });
    }
};

const editService = async (req, res) => {
    const { id, name, price } = req.body;

    try {
        const services = await servicesModel.updateServiceModel(id, name, price);
        if (services.length === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        return res.status(200).json({ services : services, message: 'Service data has been updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating service', error }); 
    }
}

const deleteService = async (req, res) => {
    const { id } = req.body;

    try {
        const services = await servicesModel.deleteServiceModel(id);
        if (services.length === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        return res.status(200).json({ message: 'Service deleted successfully', services: services });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting service', error }); 
    }
}

const findServices = async (req, res) => {
    const { id } = req.body;

    try {
        const services = await servicesModel.fetchAllServicesModel(id);
        if (services.length === 0) {
            return res.status(404).json({ message: 'Service not found' });
        }
        return res.status(200).json({ message: 'Services fetched succssfully', services: services });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding service', error }); 
    }
}

module.exports = { findServices, deleteService, editService, registerNewService };