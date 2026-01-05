const db = require('../../config/db_connection')

const processedStockMvtModel = async (date, category, items, source, notes, dnQuantity = 0) => {
    try {
      const failedItems = [];
  
      const moveStock = async (item, itemId, quantity) => {
        const insertRecordQuery = `
          INSERT INTO processedStockInventoryRecords 
          (date, recordCategory, itemId, quantityIn, dnQuantity, munits, restockSource, externalSourceDetails, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
  
        // Get product name (either from item or fetch from shopProducts)
        let productName = item.name || '';
        if (!productName) {
          const [productRes] = await db.execute(`SELECT productName FROM shopProducts WHERE productId = ?`, [itemId]);
          productName = productRes.length > 0 ? productRes[0].name : `Product ID ${itemId}`;
        }
  
        const [result] = await db.execute(`SELECT * FROM processedStockInventory WHERE itemId = ?`, [itemId]);
  
        if (category === 'outgoing') {
          if (result.length === 0) {
            failedItems.push({ itemId, productName, reason: 'Item not found in store' });
            return;
          }
  
          const inStock = parseFloat(result[0].quantityInStock);
          const qtyToRemove = parseFloat(quantity);
  
          if (qtyToRemove <= 0) {
            failedItems.push({ itemId, productName, reason: 'Invalid depletion quantity (<= 0)' });
            return;
          }
  
          if (qtyToRemove > inStock) {
            failedItems.push({
              itemId,
              productName,
              reason: `Insufficient stock. In stock: ${inStock}, Tried to remove: ${qtyToRemove}`
            });
            return;
          }
  
          const newStock = inStock - qtyToRemove;
          await db.execute(`UPDATE processedStockInventory SET quantityInStock = ? WHERE itemId = ?`, [newStock, itemId]);
          await db.execute(insertRecordQuery, [date, category, itemId, qtyToRemove, dnQuantity, 'Pcs', source, '', notes]);
        }
  
        if (category === 'incoming') {
          const qtyToAdd = parseFloat(quantity);
  
          if (result.length === 0) {
            await db.execute(`INSERT INTO processedStockInventory (itemId, quantityInStock, munits) VALUES (?, ?, ?)`, [itemId, qtyToAdd, 'Pcs']);
          } else {
            const currentStock = parseFloat(result[0].quantityInStock);
            const newStock = currentStock + qtyToAdd;
            await db.execute(`UPDATE processedStockInventory SET quantityInStock = ? WHERE itemId = ?`, [newStock, itemId]);
          }
  
          await db.execute(insertRecordQuery, [date, category, itemId, qtyToAdd, dnQuantity, 'Pcs', source, '', notes]);
        }
      };
  
      const parsedItems = JSON.parse(items);
  
      for (const item of parsedItems) {
        const itemId = item.productId;
        const quantity = item.quantity;
        try {
          await moveStock(item, itemId, quantity);
        } catch (err) {
          console.error(`Failed to process item ${itemId}:`, err);
          failedItems.push({
            itemId,
            productName: item.name || `Product ID ${itemId}`,
            reason: 'Unexpected error during processing'
          });
        }
      }
  
      if (failedItems.length > 0) {
        const errorSummary = failedItems
          .map((f) => `• ${f.productName}: ${f.reason}`)
          .join('\n');
  
        return {
          success: false,
          message: `Some items failed to process:\n${errorSummary}`,
          failedItems,
        };
      }
  
      await processedStockTakingModel(); // Optional
      return {
        success: true,
        message: 'All items processed successfully.',
      };
    } catch (error) {
      console.error('Error moving stock products:', error);
      throw error;
    }
  };

const productStockMvtModel = async (date, category, items, source, notes, dnQuantity = 0) => {
    try {
      const failedItems = [];
  
      const moveStock = async (item, itemId, quantity) => {
        const insertRecordQuery = `
          INSERT INTO namungoonaInventoryRecords 
          (date, recordCategory, itemId, quantityIn, dnQuantity, munits, restockSource, externalSourceDetails, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
  
        // Get product name (either from item or fetch from shopProducts)
        let productName = item.name || '';
        if (!productName) {
          const [productRes] = await db.execute(`SELECT name FROM inventoryItems WHERE id = ?`, [itemId]);
          productName = productRes.length > 0 ? productRes[0].name : `Product ID ${itemId}`;
        }
  
        const [result] = await db.execute(`SELECT * FROM namungoonastore WHERE itemId = ?`, [itemId]);
  
        if (category === 'outgoing') {
          if (result.length === 0) {
            failedItems.push({ itemId, productName, reason: 'Item not found in store' });
            return;
          }
  
          const inStock = parseFloat(result[0].quantityInStock);
          const qtyToRemove = parseFloat(quantity);
  
          if (qtyToRemove <= 0) {
            failedItems.push({ itemId, productName, reason: 'Invalid depletion quantity (<= 0)' });
            return;
          }
  
          if (qtyToRemove > inStock) {
            failedItems.push({
              itemId,
              productName,
              reason: `Insufficient stock. In stock: ${inStock}, Tried to remove: ${qtyToRemove}`
            });
            return;
          }
  
          const newStock = inStock - qtyToRemove;
          await db.execute(`UPDATE namungoonastore SET quantityInStock = ? WHERE itemId = ?`, [newStock, itemId]);
          await db.execute(insertRecordQuery, [date, category, itemId, qtyToRemove, dnQuantity, 'Pcs', source, '', notes]);
        }
  
        if (category === 'incoming') {
          const qtyToAdd = parseFloat(quantity);
  
          if (result.length === 0) {
            await db.execute(`INSERT INTO namungoonastore (itemId, quantityInStock, munits) VALUES (?, ?, ?)`, [itemId, qtyToAdd, 'Pcs']);
          } else {
            const currentStock = parseFloat(result[0].quantityInStock);
            const newStock = currentStock + qtyToAdd;
            await db.execute(`UPDATE namungoonastore SET quantityInStock = ? WHERE itemId = ?`, [newStock, itemId]);
          }
  
          await db.execute(insertRecordQuery, [date, category, itemId, qtyToAdd, dnQuantity, 'Pcs', source, '', notes]);
        }
      };
  
      const parsedItems = JSON.parse(items);
  
      for (const item of parsedItems) {
        const itemId = item.productId;
        const quantity = item.quantity;
        try {
          await moveStock(item, itemId, quantity);
        } catch (err) {
          console.error(`Failed to process item ${itemId}:`, err);
          failedItems.push({
            itemId,
            productName: item.name || `Product ID ${itemId}`,
            reason: 'Unexpected error during processing'
          });
        }
      }
  
      if (failedItems.length > 0) {
        const errorSummary = failedItems
          .map((f) => `• ${f.productName}: ${f.reason}`)
          .join('\n');
  
        return {
          success: false,
          message: `Some items failed to process:\n${errorSummary}`,
          failedItems,
        };
      }
  
      await stockTakingModel(); // Optional
      return {
        success: true,
        message: 'All items processed successfully.',
      };
    } catch (error) {
      console.error('Error moving stock products:', error);
      throw error;
    }
  };
  
  const fetchProcessedTransactionsModel = async (productId, startDate, endDate) => {
    const limit = 100;
    try {
        // Query for incoming transactions
        let incomingQuery = `SELECT * FROM processedStockInventoryRecords
                             JOIN shopProducts ON processedStockInventoryRecords.itemId = shopProducts.productId
                             WHERE recordcategory = 'incoming'`;
        
        // Query for outgoing transactions
        let outgoingQuery = `SELECT * FROM processedStockInventoryRecords
                             JOIN shopProducts ON processedStockInventoryRecords.itemId = shopProducts.productId
                             WHERE recordcategory = 'outgoing'`;
        
        // Add filters based on the provided criteria
        if (productId) {
            incomingQuery += ` AND itemId = ?`;
            outgoingQuery += ` AND itemId = ?`;
        }
  
        if (startDate && endDate) {
            incomingQuery += ` AND createdAt BETWEEN ? AND ?`;
            outgoingQuery += ` AND createdAt BETWEEN ? AND ?`;
        }
  
        incomingQuery += ` ORDER BY processedStockInventoryRecords.createdAt DESC LIMIT ?`;
       outgoingQuery += ` ORDER BY processedStockInventoryRecords.createdAt DESC LIMIT ?`;
        
        // Construct query parameters
        const params = [];
        if (productId) params.push(productId);
        if (startDate && endDate) {
            params.push(startDate, endDate);
        }
        
        // Execute the queries with parameters
        const [incomingResults] = await db.query(incomingQuery, [...params, parseInt(limit)]);
        const [outgoingResults] = await db.query(outgoingQuery, [...params, parseInt(limit)]);
  
        return { incoming: incomingResults, outgoing: outgoingResults };
    } catch (error) {
        console.error('Error fetching records:', error);
        throw new Error('Unable to fetch records');
    }
  }
  

const fetchAllTransactionsModel = async (productId, startDate, endDate) => {
  const limit = 100;
  try {
      // Query for incoming transactions
      let incomingQuery = `SELECT * FROM namungoonaInventoryRecords
                           JOIN inventoryItems ON namungoonaInventoryRecords.itemId = inventoryItems.id 
                           WHERE recordcategory = 'incoming'`;
      
      // Query for outgoing transactions
      let outgoingQuery = `SELECT * FROM namungoonaInventoryRecords
                           JOIN inventoryItems ON namungoonaInventoryRecords.itemId = inventoryItems.id 
                           WHERE recordcategory = 'outgoing'`;
      
      // Add filters based on the provided criteria
      if (productId) {
          incomingQuery += ` AND itemId = ?`;
          outgoingQuery += ` AND itemId = ?`;
      }

      if (startDate && endDate) {
          incomingQuery += ` AND createdAt BETWEEN ? AND ?`;
          outgoingQuery += ` AND createdAt BETWEEN ? AND ?`;
      }

      incomingQuery += ` ORDER BY namungoonaInventoryRecords.createdAt DESC LIMIT ?`;
      outgoingQuery += ` ORDER BY namungoonaInventoryRecords.createdAt DESC LIMIT ?`;
      
      // Construct query parameters
      const params = [];
      if (productId) params.push(productId);
      if (startDate && endDate) {
          params.push(startDate, endDate);
      }
      
      // Execute the queries with parameters
      const [incomingResults] = await db.query(incomingQuery, [...params, parseInt(limit)]);
      const [outgoingResults] = await db.query(outgoingQuery, [...params, parseInt(limit)]);

      return { incoming: incomingResults, outgoing: outgoingResults };
  } catch (error) {
      console.error('Error fetching records:', error);
      throw new Error('Unable to fetch records');
  }
}

const processedStockTakingModel = async () => {
    try {
       const query = `SELECT * FROM processedStockInventory JOIN  shopProducts ON processedStockInventory.itemId = shopProducts.productId`;
       const [results] = await db.execute(query);
       return results;
    } catch (error) {
        throw error
    }
}


const stockTakingModel = async () => {
    try {
       const query = `SELECT * FROM namungoonastore JOIN inventoryItems ON namungoonastore.itemId = inventoryItems.id`;
       const [results] = await db.execute(query);
       return results;
    } catch (error) {
        throw error
    }
}

const saveItem = async (name) => {
    try {
      const query = 'INSERT INTO inventoryItems (name) VALUES (?)';
      await db.execute(query, [name.toUpperCase()]);
      const updatedList = fetchAllItems()
      return updatedList;
    } catch (error) {
        console.error('Error registering item:', error);
        throw error;
    }
};

const fetchAllItems = async (id) => {
    try {
        let query = `
            SELECT sp.*, esi.quantityInStock
            FROM inventoryItems sp
            LEFT JOIN namungoonastore esi ON sp.id = esi.itemId
            WHERE 1=1
        `;

        if (id) {
            query += ` AND sp.itemId = ?`;
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


const deleteItem = async (id) => {
    try {
      const query = 'DELETE FROM inventoryItems WHERE id = ?';
      await db.execute(query, [id]);
      const updatedList = fetchAllItems()
      return updatedList;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
};

module.exports = {
    saveItem,
    deleteItem,
    fetchAllItems,
    productStockMvtModel,
    fetchAllTransactionsModel,
    stockTakingModel,
    fetchProcessedTransactionsModel,
    processedStockMvtModel,
    processedStockTakingModel
}