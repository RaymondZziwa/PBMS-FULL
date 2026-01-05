const db = require('../config/db_connection')

const productStockMvtModel = async (date, branch, category, items, source, notes) => {
    try {
      const moveStock = async (date, category, quantity, source, notes, productId) => {
        const insertRecordQuery = `INSERT INTO ${branch}shopinventoryrecords (date, recordcategory, itemid, quantityin, munits, restocksource, externalsourcedetails, notes) VALUES (?, ?, ?, ?, ?, ?, ?,?);`;
        if(category === 'outgoing') {
          const [item] = await db.execute(`SELECT * FROM ${branch}ShopInventory WHERE productid = ?;`, [productId]);

          if (item.length === 0) {
            console.log('item not in store')
          }else {
            let newStockCount = parseFloat(item[0].quantityinstock) - parseFloat(quantity);
            const updateStockCount = `UPDATE ${branch}ShopInventory SET quantityinstock = ? WHERE productid = ?`;
            await db.execute(updateStockCount, [newStockCount, productId]);
            const [updatedStockLevels] = await stockTakingModel(branch);
            await db.execute(insertRecordQuery, [date, category, productId, quantity, 'Pcs', source, '', notes]);
            return updatedStockLevels;
          }
        }else if (category === 'incoming') {
            const [item] = await db.execute(`SELECT * FROM ${branch}ShopInventory WHERE productid = ?;`, [productId]);

          if (item.length === 0) {
            try {
              const insertNewQuery = `INSERT INTO ${branch}ShopInventory (productid, quantityinstock , munits ) VALUES (?,?,?)`;
              await db.execute(insertNewQuery, [productId, quantity, 'Pcs']);
              await db.execute(insertRecordQuery, [date, category, productId, quantity, 'Pcs', source, '', notes]);
            } catch (error) {
              console.log(error)
            }
          }else {
            try {
              let newStockCount = parseFloat(item[0].quantityinstock) + parseFloat(quantity);
              const updateStockCount = `UPDATE ${branch}ShopInventory SET quantityinstock = ? WHERE productid = ?`;
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
        console.error('Error moving stock products:', error);
        throw error;
    }
};

const fetchAllTransactionsModel = async (branch, productId, startDate, endDate) => {
  const limit = 500;

  try {
    // Base queries for incoming and outgoing transactions
    let incomingQuery = `SELECT * FROM ${branch}shopinventoryrecords 
                         JOIN shopProducts ON ${branch}shopinventoryrecords.itemid = shopProducts.productId 
                         WHERE recordcategory = 'incoming'`;

    let outgoingQuery = `SELECT * FROM ${branch}shopinventoryrecords 
                         JOIN shopProducts ON ${branch}shopinventoryrecords.itemid = shopProducts.productId 
                         WHERE recordcategory = 'outgoing'`;

    // Initialize parameters
    const incomingParams = [];
    const outgoingParams = [];

    // Filter by productId
    if (productId) {
      incomingQuery += ` AND itemid = ?`;
      outgoingQuery += ` AND itemid = ?`;
      incomingParams.push(productId);
      outgoingParams.push(productId);
    }

    // Filter by date range — converting text date to SQL DATE
    if (startDate && endDate) {
      incomingQuery += ` AND STR_TO_DATE(date, '%e/%c/%Y') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')`;
      outgoingQuery += ` AND STR_TO_DATE(date, '%e/%c/%Y') BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')`;
      incomingParams.push(startDate, endDate);
      outgoingParams.push(startDate, endDate);
    }

    // Sort by most recent first and limit results
    incomingQuery += ` ORDER BY STR_TO_DATE(date, '%e/%c/%Y') DESC LIMIT ?`;
    outgoingQuery += ` ORDER BY STR_TO_DATE(date, '%e/%c/%Y') DESC LIMIT ?`;

    incomingParams.push(limit);
    outgoingParams.push(limit);

    // Execute both queries
    const [incomingResults] = await db.query(incomingQuery, incomingParams);
    const [outgoingResults] = await db.query(outgoingQuery, outgoingParams);

    return { incoming: incomingResults, outgoing: outgoingResults };
  } catch (error) {
    console.error('Error fetching records:', error);
    throw new Error('Unable to fetch records');
  }
};


const stockTakingModel = async (branch) => {
    try {
       const query = `SELECT * FROM ${branch}ShopInventory JOIN shopProducts ON ${branch}ShopInventory.productId = shopProducts.productId`;
       const [results] = await db.execute(query);
       return results;
    } catch (error) {
        throw error
    }
}

module.exports = {
    productStockMvtModel,
    fetchAllTransactionsModel,
    stockTakingModel,
}