const db = require('../../config/db_connection');

const recordSale = async (saleData) => {
    console.log("🟢 STARTING EXPO SALE RECORDING...");
    try {
        const insufficientStockItems = [];
        console.log("📦 Raw Items:", saleData.items);

        const itemsSold = JSON.parse(saleData.items);
        console.log("✅ Parsed EXPO Items:", itemsSold);

        // 1️⃣ **Check Stock Availability**
        console.log("🔍 Checking stock...");
        const stockCheckPromises = itemsSold.map(async (item) => {
            try {
                console.log(`🔎 Checking stock for Item: ${item.id}`);
                
                const [results] = await db.execute(
                    `SELECT quantityinstock FROM exhibitionInventory WHERE productId = ? AND expoId = ?`,
                    [item.id, saleData.selectedExpo || null] // Use selectedExpo and fallback to null
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
                throw error; // Re-throw to stop the process
            }
        });
        
        await Promise.all(stockCheckPromises);        
        
        if (insufficientStockItems.length > 0) {
            console.log("🚨 Insufficient stock for:", insufficientStockItems);
            return { status: 403, message: `Insufficient stock for items: ${insufficientStockItems.join(', ')}` };
        }

        console.log("✅ Stock verified, proceeding with sale...");

        // 2️⃣ **Insert Sale Record**
        console.log("📥 Inserting sale record...");
        await db.execute(
            `INSERT INTO exhibitionSales 
            (expoId, receiptNumber, saleDate, customerNames, customerContact, itemsSold, totalAmount, balance, paymentStatus, paymentMethod, additionalinfo, transactionID) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Fixed: 12 placeholders
            [
                saleData.selectedExpo || null,
                saleData.receiptNumber || null,
                new Date(saleData.date) || null,
                saleData.customerNames || null,
                saleData.customerContact || null,
                saleData.items || null,
                saleData.total || null,
                saleData.balance || null,
                saleData.paymentStatus || null,
                saleData.paymentMethod || null,
                saleData.additionalInfo || null,
                saleData.transactionId || null
            ]
        );
        
        console.log("✅ Sale record inserted successfully.");

        // 3️⃣ **Update Stock Quantities**
        console.log("📦 Expo Updating stock quantities...");
        const updateStockPromises = itemsSold.map(async item => {
            if (!item.type || item.type !== 'service') { // Default to product if type not specified
               const expoId = Number(saleData.selectedExpo);
                if (isNaN(expoId)) {
                throw new Error(`Invalid exhibition ID: ${saleData.selectedExpo}`);
                }

                console.log(`🔄 Updating stock for Item: ${item.id} | Quantity: ${item.quantity} | Expo ID: ${expoId}`);
                await db.execute(
                `UPDATE exhibitionInventory SET quantityinstock = quantityinstock - ? WHERE productId = ? AND expoId = ?`,
                [item.quantity, item.id, expoId]
                )
                .then(() => {
                    console.log(`✅ Stock updated for Item: ${item.id}`);
                })
                .catch(error => {
                    console.error("❌ Error updating stock:", error);
                    throw error;
                });
            }
            return Promise.resolve();
        });
        
        await Promise.all(updateStockPromises);        
        console.log("🎉 Expo Sale recorded successfully!");

        return { status: 200, message: 'Sale recorded successfully' };

    } catch (error) {
        console.error("❌ Fatal Error in recording expo sale:", error);
        return { status: 500, message: 'Server error while saving sale' };
    }
};

const getExpoSales = async (expoId) => {
  try {
    const query = 'SELECT * FROM exhibitionSales WHERE expoId = ? ORDER BY saleDate DESC';
    const [rows] = await db.execute(query, [expoId]);
    return rows;
  } catch (error) {
    console.error('Error fetching sales for expo:', error);
    throw error;
  }
};

const getExpoSalesReport = async () => {
  try {
    const query = `
      SELECT 
        e.id AS expoId,
        e.name AS exhibitionName,
        e.date AS exhibitionDate,
        COALESCE(SUM(s.totalAmount), 0) AS totalSalesAmount
      FROM exhibitions e
      LEFT JOIN exhibitionSales s ON e.id = s.expoId
      GROUP BY e.id, e.name, e.date
      ORDER BY e.date DESC
    `;
    const [rows] = await db.execute(query);
    return rows;
  } catch (error) {
    console.error('Error generating expo sales report:', error);
    throw error;
  }
};


module.exports = { 
    recordSale,
    getExpoSales,
    getExpoSalesReport
};
