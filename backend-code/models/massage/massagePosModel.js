const db = require('../../config/db_connection');

const recordProductSale = async (
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
                    `SELECT quantityinstock FROM ${branch}MassageInventory WHERE productId = ?`,
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
            `INSERT INTO ${branch}MassageSales 
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
                    `UPDATE ${branch}MassageInventory SET quantityinstock = quantityinstock - ? WHERE productId = ?`,
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
        console.error("❌ Fatal Error in recording sale:", error);
        return { status: 500, message: 'Server error while saving sale' };
    }
};

const recordServiceSale = async (
    branch, items, receiptNumber, total, additionalInfo, paymentMethod, 
    paymentStatus, balance, customerNames, customerContact, date, transactionId 
) => {
    console.log("🟢 STARTING SALE RECORDING...");

    try {
        // 2️⃣ **Insert Sale Record**
        console.log("📥 Inserting sale record...");
        await db.execute(
            `INSERT INTO ${branch}MassageServicesRecords
            (receiptNumber, saleDate, customerNames, customerContact, servicesOffered, totalAmount, balance, paymentStatus, paymentMethod, additionalinfo, transactionID) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [receiptNumber, date, customerNames, customerContact, items, total, balance, paymentStatus, paymentMethod, additionalInfo, transactionId]
        );
        
        console.log("✅ Sale record inserted successfully.");
        
        return { status: 200, message: 'Sale recorded successfully' };

    } catch (error) {
        console.error("❌ Fatal Error in recording sale:", error);
        return { status: 500, message: 'Server error while saving sale' };
    }
};

module.exports = { recordProductSale, recordServiceSale };
