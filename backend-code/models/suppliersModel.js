const db = require('../config/db_connection')

const registerNewSupplierModel = async (firstName, lastName, email, phone, address) => {
    try {
        const query = 'INSERT INTO suppliers (firstName, lastName, email, phone, address) VALUES (?, ?, ?, ?, ?)';
        
        // Convert empty strings to null
        const values = [
            firstName || null,
            lastName || null,
            email && email.trim() !== '' ? email : null,  // Convert empty email to null
            phone && phone.trim() !== '' ? phone : null,  // Convert empty phone to null
            address && address.trim() !== '' ? address : null  // Convert empty address to null
        ];
        
        await db.execute(query, values);
        const updatedList = await fetchAllSuppliersModel(); // Ensure fetchAllsuppliersModel() is awaited
        return updatedList;
    } catch (error) {
        console.error('Error registering supplier:', error);
        throw new Error("Server error while registering the supplier");
    }
};


// const findsupplierByName = async (name) => {
//     try {
//         let query = 'SELECT * FROM suppliers WHERE 1=1';

//         if (name) {
//             query += ` AND LOWER(firstName) LIKE ?`;
//         }

//         const params = [];
//         if (name) params.push(`%${name.toLowerCase()}%`);

//         const [product] = await db.query(query, params);

//         return product;
//     } catch (error) {
//         console.error('Error finding product:', error);
//         throw error;
//     }
// }

const fetchAllSuppliersModel = async (supplierId) => {
    try {
        let query = 'SELECT * FROM suppliers WHERE 1=1';

        if (supplierId) {
            query += ` AND supplierId = ?`;
        }

        const params = [];
        if (supplierId) params.push(supplierId);
        
        const [suppliers] = await db.query(query, params);

        return suppliers;
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        throw new Error('Unable to fetch suppliers');
    }
}

const deleteSupplierModel = async (supplierId) => {
    try {
      const query = 'DELETE FROM suppliers WHERE supplierId = ?';
      await db.execute(query, [supplierId]);
      const updatedList = fetchAllSuppliersModel()
      return updatedList;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
};

const updateSupplierModel = async (supplierId, firstName, lastName, email, phone, address) => {
    try {
        let query = 'UPDATE suppliers SET';
        const queryParams = [];
        const updates = [];

        if (firstName) {
            updates.push(' firstName = ?');
            queryParams.push(firstName);
        }

        if (lastName) {
            updates.push(' lastName = ?');
            queryParams.push(lastName);
        }

        if (email) {
            updates.push(' email = ?');
            queryParams.push(email);
        }

        if (phone) {
            updates.push(' phone = ?');
            queryParams.push(phone);
        }

        if (address) {
            updates.push(' address = ?');
            queryParams.push(address);
        }

        // Ensure there is at least one field to update
        if (updates.length === 0) {
            throw new Error('No fields provided for update');
        }

        // Join updates with commas
        query += updates.join(',');

        query += ' WHERE supplierId = ?';
        queryParams.push(supplierId);

        // Execute the update query
        await db.execute(query, queryParams);

        // Fetch the updated list of suppliers
        const updatedList = await fetchAllSuppliersModel();
        return updatedList;
    } catch (error) {
        console.error('Error updating supplier info:', error);
        throw error;
    }
};


module.exports = {
    registerNewSupplierModel,
    //findsupplierByName,
    fetchAllSuppliersModel,
    deleteSupplierModel,
    updateSupplierModel
}