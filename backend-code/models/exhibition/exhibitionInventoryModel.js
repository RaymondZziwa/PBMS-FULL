const db = require('../../config/db_connection')

const expoStockMvtModel = async (expoId, date, category, items, source, notes) => {
  try {
    const moveStock = async (expoId, date, category, productId, quantity, source, notes) => {
      const insertRecordQuery = `INSERT INTO exhibitionInventoryRecords 
        (expoId, date, recordcategory, itemid, quantityin, munits, restocksource, externalsourcedetails, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      console.log('log22', expoId, date, category, productId, quantity, source, notes);

      if (category === 'outgoing') {
        // Removed semicolon from the query
        const [item] = await db.execute(
          `SELECT * FROM exhibitionInventory WHERE productid = ? AND expoId = ?`, 
          [productId, expoId]
        );

        if (item.length === 0) {
          console.log('item not in store');
        } else {
          let newStockCount = parseFloat(item[0].quantityinstock) - parseFloat(quantity);
          const updateStockCount = `UPDATE exhibitionInventory SET quantityinstock = ? WHERE productid = ? AND expoId = ?`;
          await db.execute(updateStockCount, [newStockCount, productId, expoId]);
          const [updatedStockLevels] = await stockTakingModel(expoId);
          
          // Fixed parameter order and count (9 parameters)
          await db.execute(insertRecordQuery, [
            expoId, 
            date, 
            category, 
            productId, 
            quantity, 
            'Pcs', 
            source, 
            '', 
            notes
          ]);
          
          return updatedStockLevels;
        }
      } else if (category === 'incoming') {
        const [item] = await db.execute(
          `SELECT * FROM exhibitionInventory WHERE productid = ? AND expoId = ?`, 
          [productId, expoId]
        );

        if (item.length === 0) {
          try {
            const insertNewQuery = `INSERT INTO exhibitionInventory 
              (expoId, productid, quantityinstock, munits) 
              VALUES (?, ?, ?, ?)`;
            await db.execute(insertNewQuery, [expoId, productId, quantity, 'Pcs']);
            
            // Fixed parameter order and count (9 parameters)
            await db.execute(insertRecordQuery, [
              expoId, 
              date, 
              category, 
              productId, 
              quantity, 
              'Pcs', 
              source, 
              '', 
              notes
            ]);
          } catch (error) {
            console.log(error);
          }
        } else {
          try {
            let newStockCount = parseFloat(item[0].quantityinstock) + parseFloat(quantity);
            const updateStockCount = `UPDATE exhibitionInventory SET quantityinstock = ? WHERE productid = ? AND expoId = ?`;
            await db.execute(updateStockCount, [newStockCount, productId, expoId]);
            const [updatedStockLevels] = await stockTakingModel(expoId);
            
            // Fixed parameter order and count (9 parameters)
            await db.execute(insertRecordQuery, [
              expoId, 
              date, 
              category, 
              productId, 
              quantity, 
              'Pcs', 
              source, 
              '', 
              notes
            ]);
            
            return updatedStockLevels;
          } catch (error) {
            console.log(error);
          }
        }
      }
    };

    // Fixed parameter order when calling moveStock
    const itemsArray = JSON.parse(items);
    for (const item of itemsArray) {
      console.log(expoId, date, category, item.productId, item.quantity, source, notes);
      await moveStock(expoId, date, category, item.productId, item.quantity, source, notes);
    }

  } catch (error) {
    console.error('Error moving stock products:', error);
    throw error;
  }
};

const fetchAllTransactionsModel = async (expoId, productId, startDate, endDate) => {
  const limit = 100;
  try {
      // Query for incoming transactions
      let incomingQuery = `SELECT * FROM exhibitionInventoryRecords 
                           JOIN shopProducts ON exhibitionInventoryRecords.itemid = shopProducts.productId 
                           WHERE recordcategory = 'incoming' AND expoId = ${expoId}`;
      
      // Query for outgoing transactions
      let outgoingQuery = `SELECT * FROM exhibitionInventoryRecords
                           JOIN shopProducts ON exhibitionInventoryRecords.itemid = shopProducts.productId 
                           WHERE recordcategory = 'outgoing' AND expoId = ${expoId}`;
      
      // Add filters based on the provided criteria
      if (productId) {
          incomingQuery += ` AND itemid = ?`;
          outgoingQuery += ` AND itemid = ?`;
      }

      if (startDate && endDate) {
          incomingQuery += ` AND date BETWEEN ? AND ?`;
          outgoingQuery += ` AND date BETWEEN ? AND ?`;
      }

      incomingQuery += ` ORDER BY date DESC LIMIT ? `;
      outgoingQuery += ` ORDER BY date DESC LIMIT ? `;
      
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


const stockTakingModel = async (expoId) => {
  try {
    const query = `
      SELECT *
      FROM exhibitionInventory
      JOIN shopProducts ON exhibitionInventory.productId = shopProducts.productId
      WHERE exhibitionInventory.expoId = ?
    `;
    const [results] = await db.execute(query, [expoId]);
    return results;
  } catch (error) {
    console.error("Error fetching exhibition stock:", error);
    throw new Error("Failed to fetch stock data.");
  }
};


module.exports = {
    expoStockMvtModel,
    fetchAllTransactionsModel,
    stockTakingModel,
}