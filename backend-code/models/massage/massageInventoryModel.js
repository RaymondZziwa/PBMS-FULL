const db = require('../../config/db_connection')

const productStockMvtModel = async (date, branch, category, items, source, notes) => {
    try {
      const moveStock = async (date, category, quantity, source, notes, productId) => {
        const insertRecordQuery = `INSERT INTO ${branch}massageinventoryrecords (date, recordcategory, itemid, quantityin, munits, restocksource, externalsourcedetails, notes) VALUES (?, ?, ?, ?, ?, ?, ?,?);`;
        if(category === 'outgoing') {
          const [item] = await db.execute(`SELECT * FROM ${branch}MassageInventory WHERE productid = ?;`, [productId]);

          if (item.length === 0) {
            console.log('item not in store')
          }else {
            let newStockCount = parseFloat(item[0].quantityinstock) - parseFloat(quantity);
            const updateStockCount = `UPDATE ${branch}MassageInventory SET quantityinstock = ? WHERE productid = ?`;
            await db.execute(updateStockCount, [newStockCount, productId]);
            const [updatedStockLevels] = await stockTakingModel(branch);
            await db.execute(insertRecordQuery, [date, category, productId, quantity, 'Pcs', source, '', notes]);
            return updatedStockLevels;
          }
        }else if (category === 'incoming') {
            const [item] = await db.execute(`SELECT * FROM ${branch}MassageInventory WHERE productid = ?;`, [productId]);

          if (item.length === 0) {
            try {
              const insertNewQuery = `INSERT INTO ${branch}MassageInventory (productid, quantityinstock , munits ) VALUES (?,?,?)`;
              await db.execute(insertNewQuery, [productId, quantity, 'Pcs']);
              await db.execute(insertRecordQuery, [date, category, productId, quantity, 'Pcs', source, '', notes]);
            } catch (error) {
              console.log(error)
            }
          }else {
            try {
              let newStockCount = parseFloat(item[0].quantityinstock) + parseFloat(quantity);
              const updateStockCount = `UPDATE ${branch}MassageInventory SET quantityinstock = ? WHERE productid = ?`;
              await db.execute(updateStockCount, [newStockCount, productId]);
              const [updatedStockLevels] = await stockTakingModel(branch);
              await db.execute(insertRecordQuery, [date, category, productId, quantity, 'Pcs', source, '', notes]);
              return updatedStockLevels;
            } catch (error) {
              console.log(error)
            }
          }
        }
      }

      console.log('massage-restock', items)
      JSON.parse(items).forEach((item) => {
        moveStock(date, category, item.quantity, source, notes, item.productId);
      });
    } catch (error) {
        console.error('Error moving stock products:', error);
        throw error;
    }
};

const fetchAllTransactionsModel = async (branch, productId, startDate, endDate) => {
  const limit = 100;
  try {
      // Query for incoming transactions
      let incomingQuery = `SELECT * FROM ${branch}massageinventoryrecords
                           JOIN shopProducts ON ${branch}massageinventoryrecords.itemid = shopProducts.productId 
                           WHERE recordcategory = 'incoming'`;
      
      // Query for outgoing transactions
      let outgoingQuery = `SELECT * FROM ${branch}massageinventoryrecords
                           JOIN shopProducts ON ${branch}massageinventoryrecords.itemid = shopProducts.productId 
                           WHERE recordcategory = 'outgoing'`;
      
      // Add filters based on the provided criteria
      if (productId) {
          incomingQuery += ` AND itemid = ?`;
          outgoingQuery += ` AND itemid = ?`;
      }

      if (startDate && endDate) {
          incomingQuery += ` AND date BETWEEN ? AND ?`;
          outgoingQuery += ` AND date BETWEEN ? AND ?`;
      }

      incomingQuery += ` ORDER BY date DESC LIMIT ?`;
      outgoingQuery += ` ORDER BY date DESC LIMIT ?`;
      
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


const stockTakingModel = async (branch) => {
    try {
       const query = `SELECT * FROM ${branch}MassageInventory JOIN shopProducts ON ${branch}MassageInventory.productId = shopProducts.productId`;
       const [results] = await db.execute(query);
       return results;
    } catch (error) {
        throw error
    }
}

const fetchMassageProductsModel = async (id) => {
    try {
        let query = `
            SELECT sp.*, esi.quantityInStock
            FROM shopProducts sp
            LEFT JOIN equatorialMassageInventory esi ON sp.productId = esi.productId
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

module.exports = {
    productStockMvtModel,
    fetchAllTransactionsModel,
    stockTakingModel,
    fetchMassageProductsModel
}