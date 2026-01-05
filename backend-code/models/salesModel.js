const db = require('../config/db_connection');

const recordSale = async (
    branch, items, receiptNumber, total, additionalInfo, paymentMethod, 
    paymentStatus, balance, customerNames, customerContact, date, transactionId 
) => {
    console.log(branch, items, receiptNumber, total, additionalInfo, paymentMethod, 
    paymentStatus, balance, customerNames, customerContact, date, transactionId )
    console.log("🟢 STARTING SALE RECORDING...");

    try {
        const insufficientStockItems = [];
        console.log("📦 Raw Items:", items);

        const itemsSold = JSON.parse(items);
        console.log("✅ Parsed Items:", itemsSold);

        // 1️⃣ **Check Stock Availability**
        console.log("🔍 Checking stock...");
        const stockCheckPromises = itemsSold.map(async (item) => {
            try {
                console.log(`🔎 Checking stock for Item: ${item.id}`);
                
                const [results] = await db.execute(
                    `SELECT quantityinstock FROM ${branch}ShopInventory WHERE productId = ?`,
                    [item.id]
                );
        
                console.log(`📊 Raw DB Response for ${item.id}:`, results);
        
                if (!results || results.length === 0) {
                    console.warn(`⚠️ No stock record found for Item ${item.id}, treating as out of stock.`);
                    insufficientStockItems.push(item.id);
                    return;
                }
        
                const quantityInStock = results[0].quantityinstock;
                console.log(`✅ Item: ${item.id} | In Stock: ${quantityInStock} | Needed: ${item.quantity}`);
        
                if (quantityInStock < item.quantity) {
                    insufficientStockItems.push(item.id);
                }
            } catch (error) {
                console.error(`❌ Error checking stock for ${item.id}:`, error);
            }
        });
        
        // Ensure all stock checks complete
        await Promise.all(stockCheckPromises);        
        
        if (insufficientStockItems.length > 0) {
            console.log("🚨 Insufficient stock for:", insufficientStockItems);
            return { status: 403, message: `Insufficient stock for items: ${insufficientStockItems.join(', ')}` };
        }

        console.log("✅ Stock verified, proceeding with sale...");

        // 2️⃣ **Insert Sale Record**
        console.log("📥 Inserting sale record...");
        await db.execute(
            `INSERT INTO ${branch}ShopSales 
            (receiptNumber, saleDate, customerNames, customerContact, itemsSold, totalAmount, balance, paymentStatus, paymentMethod, additionalinfo, transactionID) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [receiptNumber, date, customerNames, customerContact, items, total, balance, paymentStatus, paymentMethod, additionalInfo, transactionId]
        );
        
        console.log("✅ Sale record inserted successfully.");
        

        // 3️⃣ **Update Stock Quantities**
        console.log("📦 Updating stock quantities...");
        const updateStockPromises = itemsSold.map(item => {
            if (item.type !== 'service') {
                return db.execute(
                    `UPDATE ${branch}ShopInventory SET quantityinstock = quantityinstock - ? WHERE productId = ?`,
                    [item.quantity, item.id]
                )
                .then(() => {
                    console.log(`✅ Stock updated for Item: ${item.id}`);
                })
                .catch(error => {
                    console.error("❌ Error updating stock:", error);
                    throw error; // Propagate the error
                });
            }
            return Promise.resolve(); // Services don't require stock updates
        });
        
        // Ensure all stock updates complete
        await Promise.all(updateStockPromises);        
        console.log("🎉 Sale recorded successfully!");

        return { status: 200, message: 'Sale recorded successfully' };

    } catch (error) {
        console.error("❌ Fatal Error in recordSale:", error);
        return { status: 500, message: 'Server error while saving sale' };
    }
};


const recordProjectsSale = async (
    branch, items, receiptNumber, total, additionalInfo, paymentMethod, 
    paymentStatus, balance, customerNames, customerContact, date, transactionId 
) => {
    console.log("🟢 STARTING SALE RECORDING...");

    try {
        const insufficientStockItems = [];
        console.log("📦 Raw Items:", items);

        const itemsSold = JSON.parse(items);
        console.log("✅ Parsed Items:", itemsSold);

        // 1️⃣ **Check Stock Availability**
        console.log("🔍 Checking stock...");
        const stockCheckPromises = itemsSold.map(async (item) => {
            try {
                console.log(`🔎 Checking stock for Item: ${item.id}`);
                
                const [results] = await db.execute(
                    `SELECT quantityinstock FROM ${branch}ProjectsInventory WHERE productId = ?`,
                    [item.id]
                );
        
                console.log(`📊 Raw DB Response for ${item.id}:`, results);
        
                if (!results || results.length === 0) {
                    console.warn(`⚠️ No stock record found for Item ${item.id}, treating as out of stock.`);
                    insufficientStockItems.push(item.id);
                    return;
                }
        
                const quantityInStock = results[0].quantityinstock;
                console.log(`✅ Item: ${item.id} | In Stock: ${quantityInStock} | Needed: ${item.quantity}`);
        
                if (quantityInStock < item.quantity) {
                    insufficientStockItems.push(item.id);
                }
            } catch (error) {
                console.error(`❌ Error checking stock for ${item.id}:`, error);
            }
        });
        
        // Ensure all stock checks complete
        await Promise.all(stockCheckPromises);        
        
        if (insufficientStockItems.length > 0) {
            console.log("🚨 Insufficient stock for:", insufficientStockItems);
            return { status: 403, message: `Insufficient stock for items: ${insufficientStockItems.join(', ')}` };
        }

        console.log("✅ Stock verified, proceeding with sale...");

        // 2️⃣ **Insert Sale Record**
        console.log("📥 Inserting sale record...");
        await db.execute(
            `INSERT INTO ${branch}ProjectsSales 
            (receiptNumber, saleDate, customerNames, customerContact, itemsSold, totalAmount, balance, paymentStatus, paymentMethod, additionalinfo, transactionID) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [receiptNumber, date, customerNames, customerContact, items, total, balance, paymentStatus, paymentMethod, additionalInfo, transactionId]
        );
        
        console.log("✅ Sale record inserted successfully.");
        

        // 3️⃣ **Update Stock Quantities**
        console.log("📦 Updating stock quantities...");
        const updateStockPromises = itemsSold.map(item => {
            if (item.type !== 'service') {
                return db.execute(
                    `UPDATE ${branch}ProjectsInventory SET quantityinstock = quantityinstock - ? WHERE productId = ?`,
                    [item.quantity, item.id]
                )
                .then(() => {
                    console.log(`✅ Stock updated for Item: ${item.id}`);
                })
                .catch(error => {
                    console.error("❌ Error updating stock:", error);
                    throw error; // Propagate the error
                });
            }
            return Promise.resolve(); // Services don't require stock updates
        });
        
        // Ensure all stock updates complete
        await Promise.all(updateStockPromises);        
        console.log("🎉 Sale recorded successfully!");

        return { status: 200, message: 'Sale recorded successfully' };

    } catch (error) {
        console.error("❌ Fatal Error in recordSale:", error);
        return { status: 500, message: 'Server error while saving sale' };
    }
}

const updateSaleInfo = async (
    branch,
    receiptNumber,
    totalAmount,
    balance,
    amountPaid,
    date,
    paymentMethod,
    itemsSold,
    transactionId
  ) => {
    try {
      // Fetch the existing sale details (optional, for verification/logging)
      const [results] = await db.execute(
        `SELECT * FROM ${branch}ShopSales WHERE receiptNumber = ?`,
        [receiptNumber]
      );
  
      if (results.length === 0) {
        console.log(`No sale found with receiptNumber ${receiptNumber} in ${branch}ShopSales`);
        return;
      }
  
      // Update the sale record
      await db.execute(
        `UPDATE ${branch}ShopSales 
         SET 
           totalAmount = ?, 
           balance = ?,
           paymentMethod = ?, 
           itemsSold = ?, 
           transactionId = ?
         WHERE receiptNumber = ?`,
        [
          totalAmount,
          balance,
          paymentMethod,
          itemsSold,
          transactionId ?? '',
          receiptNumber
        ]
      );
  
        console.log(`Sale with receiptNumber ${receiptNumber} successfully updated.`);
        return { code: 200, message: 'Sale updated successfully' };
    } catch (error) {
        console.error("Error updating sale info:", error.message);
        return { code: 500, message: 'Sale update failed' };
    }
  };
  

const updateShopSale = async (receiptNo, amountPaid, date, paymentMethod,  transactionId) => {
    try {
        // Fetch the existing sale details
        const [results] = await db.execute(
            'SELECT totalAmount, balance, paymentstatus FROM equatorialShopSales WHERE receiptNumber = ?',
            [receiptNo]
        );
        
        if (results.length === 0) {
            throw new Error('Sale record not found');
        }

        const { balance } = results[0];
        const newBalance = balance - parseFloat(amountPaid);
        const paymentStatus = newBalance === 0 ? 'Fully paid' : 'Partially paid';

        // Insert payment record
        await db.execute(
            'INSERT INTO equatorialshopsalespayments (receiptNumber, paymentdate, amountPaid, paymentMethod, transactionId) VALUES (?, ?, ?, ?, ?)',
            [receiptNo, date, amountPaid, paymentMethod, transactionId]
        );

        // Update sale record with new balance and payment status
        await db.execute(
            'UPDATE equatorialShopSales SET balance = ?, paymentstatus = ? WHERE receiptNumber = ?',
            [newBalance, paymentStatus, receiptNo]
        );

        return { code: 200, message: 'Sale payment updated successfully' };
    } catch (error) {
        console.error('Error updating sale:', error);
        throw error;
    }
};

module.exports = { recordSale, recordProjectsSale, updateShopSale, updateSaleInfo };
