const customerModel = require('../models/customerModel')

const registerNewClient = async (req, res) => {
    const { firstName, lastName, email,  contact, address } = req.body;
    console.log('re', req.body)
  
    try {
      await customerModel.registerNewClientModel(firstName, lastName, email,  contact, address)
      res.status(201).json({ message: 'Client successfully registered' }); 
    } catch (error) {
      res.status(500).json({ message: 'Server error while registering the client', error });
    }
};

const editClient = async (req, res) => {
    const { clientId, firstName, lastName, email,  contact, address } = req.body;

    try {
        const clients = await customerModel.updateClientModel(clientId, firstName, lastName, email,  contact, address)
       
        return res.status(200).json({ customers: clients, message: 'Client data has been updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating client', error }); 
    }
}

const deleteClient = async (req, res) => {
    const { clientId } = req.body;

    try {
        const clients = await customerModel.deleteClientModel(clientId);
       
        return res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting client', error }); 
    }
}

const getClients = async (req, res) => {
    const { clientId } = req.body;

    try {
        const clients = await customerModel.fetchAllClientsModel(clientId);
        return res.status(200).json({ message: 'Clients fetched succssfully', customers: clients });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding client', error }); 
    }
}

module.exports = { editClient, registerNewClient, deleteClient, getClients };