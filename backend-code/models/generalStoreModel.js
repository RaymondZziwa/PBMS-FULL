const db = require('../config/db_connection')

const gsStockMvtModel = async (date, branch, category, items, source, notes) => {
    try {
      const moveStock = async (date, category, quantity, source, notes, productId) => {
        const insertRecordQuery = `INSERT INTO ${branch}generalstorerestockrecords (date, recordcategory, itemid, quantityin, munits, restocksource, externalsourcedetails, notes) VALUES (?, ?, ?, ?, ?, ?, ?,?);`;
        if(category === 'outgoing') {
          const [item] = await db.execute(`SELECT * FROM ${branch}generalstoreinventory WHERE productId = ?;`, [productId]);

          if (item.length === 0) {
            console.log('item not in store')
          }else {
            let newStockCount = parseFloat(item[0].quantityinstock) - parseFloat(quantity);
            const updateStockCount = `UPDATE ${branch}generalstoreinventory SET quantityinstock = ? WHERE productId = ?`;
            await db.execute(updateStockCount, [newStockCount, productId]);
            const [updatedStockLevels] = await stockTakingModel(branch);
            await db.execute(insertRecordQuery, [date, category, productId, quantity, 'Pcs', source, '', notes]);
            return updatedStockLevels;
          }
        }else if (category === 'incoming') {
            const [item] = await db.execute(`SELECT * FROM ${branch}generalstoreinventory WHERE productId = ?;`, [productId]);

          if (item.length === 0) {
            try {
              const insertNewQuery = `INSERT INTO ${branch}generalstoreinventory (productId, quantityinstock , munits ) VALUES (?,?,?)`;
              await db.execute(insertNewQuery, [productId, quantity, 'Pcs']);
              await db.execute(insertRecordQuery, [date, category, productId, quantity, 'Pcs', source, '', notes]);
            } catch (error) {
              console.log(error)
            }
          }else {
            try {
              let newStockCount = parseFloat(item[0].quantityinstock) + parseFloat(quantity);
              const updateStockCount = `UPDATE ${branch}generalstoreinventory SET quantityinstock = ? WHERE productId = ?`;
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

      JSON.parse(items).forEach((item) => {
        moveStock(date, category, item.quantity, source, notes, item.productId);
      });
    } catch (error) {
        console.error('Error moving stock prod:', error);
        throw error;
    }
};

const fetchAllTransactionsModel = async (branch, productId, startDate, endDate) => {
  const limit = 100;
  try {
      // Query for incoming transactions
      let incomingQuery = `SELECT * FROM ${branch}generalstorerestockrecords 
                           JOIN shopProducts ON ${branch}generalstorerestockrecords.itemid = shopProducts.productId`;
      
      // Query for outgoing transactions
      let outgoingQuery = `SELECT * FROM ${branch}custodianreleasedinventory
                           JOIN shopProducts ON ${branch}custodianreleasedinventory.itemreleasedId = shopProducts.productId`;
      
      // Add filters based on the provided criteria
      if (productId) {
          incomingQuery += ` AND itemid = ?`;
          outgoingQuery += ` AND itemreleasedId = ?`;
      }

      if (startDate && endDate) {
          incomingQuery += ` AND date BETWEEN ? AND ?`;
          outgoingQuery += ` AND releasedate BETWEEN ? AND ?`;
      }

      incomingQuery += ` ORDER BY date DESC LIMIT ?`;
      outgoingQuery += ` ORDER BY releasedate DESC LIMIT ?`;
      
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
       const query = `SELECT * FROM ${branch}generalstoreinventory JOIN shopProducts ON ${branch}generalstoreinventory.productId = shopProducts.productId`;
       const [results] = await db.execute(query);
       return results;
    } catch (error) {
        throw error
    }
}

module.exports = {
    gsStockMvtModel,
    fetchAllTransactionsModel,
    stockTakingModel,
}