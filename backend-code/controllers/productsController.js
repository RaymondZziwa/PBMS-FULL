const productsModel = require('../models/productsModel')

const registerNewProduct = async (req, res) => {
    const { name, price } = req.body;
  
    try {
      const existingProduct = await productsModel.findProductByName(name)
      if (existingProduct.length > 0) {
        return res.status(400).json({ message: 'Product already exists' });
      }
      const result = await productsModel.registerNewProductModel(name, price);
      res.status(201).json({ message: 'Product successfully registered', products: result }); 
    } catch (error) {
      res.status(500).json({ message: 'Server error while registering the product', error });
    }
};

const editProduct = async (req, res) => {
    const { id, name, price } = req.body;

    try {
        const products = await productsModel.updateProductModel(id, name, price);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ products: products, message: 'Product data has been updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating product', error }); 
    }
}

const deleteProduct = async (req, res) => {
    const { id } = req.body;

    try {
        const products = await productsModel.deleteProductModel(id);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ message: 'Product deleted successfully', products: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting product', error }); 
    }
}

const findProducts = async (req, res) => {
    const { id } = req.body;

    try {
        const products = await productsModel.fetchAllProductsModel(id);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        return res.status(200).json({ message: 'Products fetched succssfully', products: products });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding product', error }); 
    }
}

const productPerformanceReport = async (req, res) => {
    const { branch, startDate, endDate } = req.body;

    try {
        const report = await productsModel.fetchProductPerformanceReport(branch, startDate, endDate);
        console.log(report)
        if (report.length === 0) {
            return res.status(404).json({ message: 'No performance data found for this product' });
        }
        return res.status(200).json({ message: 'Product performance report fetched successfully', report: report });
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching product performance report', error });
    }
}

module.exports = { findProducts, deleteProduct, registerNewProduct, editProduct, productPerformanceReport };