const supplierModel = require('../models/suppliersModel')

const registerNewsupplier = async (req, res) => {
    const { firstName, lastName, email, phone, address } = req.body;
  
    try {
      const updatedList = await supplierModel.registerNewSupplierModel(firstName, lastName, email, phone, address)
      res.status(201).json({ message: 'supplier successfully registered', customers: updatedList }); 
    } catch (error) {
      res.status(500).json({ message: 'Server error while registering the supplier', error });
    }
};

const editsupplier = async (req, res) => {
    const { supplierId, firstName, lastName, email, phone, address } = req.body;

    try {
        const suppliers = await supplierModel.updateSupplierModel(supplierId, firstName, lastName, email, phone, address)
       
        return res.status(200).json({ customers: suppliers, message: 'supplier data has been updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating supplier', error }); 
    }
}

const deletesupplier = async (req, res) => {
    const { supplierId } = req.body;

    try {
        const suppliers = await supplierModel.deleteSupplierModel(supplierId);
       
        return res.status(200).json({ message: 'supplier deleted successfully', customers: suppliers });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting supplier', error }); 
    }
}

const getsuppliers = async (req, res) => {
    const { supplierId } = req.body;

    try {
        const suppliers = await supplierModel.fetchAllSuppliersModel(supplierId);
        return res.status(200).json({ message: 'suppliers fetched succssfully', customers: suppliers });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding supplier', error }); 
    }
}

module.exports = { editsupplier, registerNewsupplier, deletesupplier, getsuppliers };