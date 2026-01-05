const db = require('../config/db_connection')

const registerNewProductModel = async (name, price) => {
    try {
      const query = 'INSERT INTO shopProducts (productName, unitPrice) VALUES (?, ?)';
      await db.execute(query, [name, price]);
      const updatedList = fetchAllProductsModel()
      return updatedList;
    } catch (error) {
        console.error('Error registering products:', error);
        throw error;
    }
};

const findProductByName = async (name) => {
    try {
        let query = 'SELECT * FROM shopProducts WHERE 1=1';

        if (name) {
            query += ` AND LOWER(productName) LIKE ?`;
        }

        const params = [];
        if (name) params.push(`%${name.toLowerCase()}%`);

        const [product] = await db.query(query, params);

        return product;
    } catch (error) {
        console.error('Error finding product:', error);
        throw error;
    }
}

const fetchAllProductsModel = async (id) => {
    try {
        let query = `
            SELECT sp.*, esi.quantityInStock
            FROM shopProducts sp
            LEFT JOIN equatorialShopInventory esi ON sp.productId = esi.productId
            WHERE 1=1
        `;

        if (id) {
            query += ` AND sp.productId = ?`;
        }

        const params = [];
        if (id) params.push(id);
        
        const [products] = await db.query(query, params);

        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        throw new Error('Unable to fetch products');
    }
}


const deleteProductModel = async (productId) => {
    try {
      const query = 'DELETE FROM shopProducts WHERE productId = ?';
      await db.execute(query, [productId]);
      const updatedList = fetchAllProductsModel()
      return updatedList;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
};

const updateProductModel = async (productId, name, price) => {
    try {
        let query = 'UPDATE shopProducts SET';
        const queryParams = [];
        
        if (name) {
            query += ' productName = ?';
            queryParams.push(name);
        }

        if (price) {
            query += name ? ', unitPrice = ?' : ' unitPrice = ?';
            queryParams.push(price);
        }

        query += ' WHERE productId = ?';
        queryParams.push(productId);

        // Execute the update query
        await db.execute(query, queryParams);

        // Fetch the updated list of products
        const updatedList = await fetchAllProductsModel();
        return updatedList;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
};

const fetchProductPerformanceReport = async (branch, startDate, endDate) => {
    try {
      let query = `SELECT itemsSold FROM ${branch}ShopSales`;
      const params = [];
  
      // Apply date filtering if both dates are provided
      if (startDate && endDate) {
        query += `
          WHERE STR_TO_DATE(saleDate, '%e/%c/%Y') 
          BETWEEN STR_TO_DATE(?, '%Y-%m-%d') 
          AND STR_TO_DATE(?, '%Y-%m-%d')
        `;
        params.push(startDate, endDate);
      }
  
      const [results] = await db.query(query, params);
  
      // Aggregate product data
      const productMap = {};
  
      results.forEach(row => {
        let items = [];
  
        try {
          items = JSON.parse(row.itemsSold);
        } catch (err) {
          console.warn("Invalid JSON in itemsSold:", row.itemsSold);
          return; // skip this row
        }
  
        items.forEach(item => {
          const {
            name,
            unitCost,
            quantity,
            totalCost,
            discount = 0
          } = item;
  
          const parsedUnitCost = parseFloat(unitCost) || 0;
          const parsedQuantity = parseInt(quantity) || 0;
          const parsedDiscount = parseFloat(discount) || 0;
  
          // Handle missing or NaN totalCost
          let parsedTotalCost = parseFloat(totalCost);
          if (isNaN(parsedTotalCost)) {
            parsedTotalCost = parsedUnitCost * parsedQuantity - parsedDiscount;
          }
  
          if (!productMap[name]) {
            productMap[name] = {
              productName: name,
              unitCost: parsedUnitCost,
              totalUnitsSold: 0,
              totalAmountGenerated: 0
            };
          }
  
          productMap[name].totalUnitsSold += parsedQuantity;
          productMap[name].totalAmountGenerated += parsedTotalCost;
          productMap[name].unitCost = parsedUnitCost; // latest seen cost
        });
      });
  
      return Object.values(productMap); // ✅ moved outside forEach
    } catch (error) {
      console.error("Error generating product performance report:", error);
      throw new Error("Unable to generate product performance report");
    }
  };
  

module.exports = {
    registerNewProductModel,
    fetchAllProductsModel,
    deleteProductModel,
    updateProductModel,
    findProductByName,
    fetchProductPerformanceReport
}