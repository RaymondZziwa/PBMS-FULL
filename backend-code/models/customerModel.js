const db = require('../config/db_connection')

const registerNewClientModel = async (firstName, lastName, email,  contact, address) => {
    console.log('phone',  contact)
    try {
        const query = 'INSERT INTO clients (firstName, lastName, email, phone, address) VALUES (?, ?, ?, ?, ?)';
        
        // Convert empty strings to null
        const values = [
            firstName || null,
            lastName || null,
            email && email.trim() !== '' ? email : null,  // Convert empty email to null
            contact &&  contact.trim() !== '' ?  contact : null,  // Convert empty phone to null
            address && address.trim() !== '' ? address : null  // Convert empty address to null
        ];
        
        await db.execute(query, values);
    } catch (error) {
        console.error('Error registering client:', error);
        throw new Error("Server error while registering the client");
    }
};


// const findClientByName = async (name) => {
//     try {
//         let query = 'SELECT * FROM clients WHERE 1=1';

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

const fetchAllClientsModel = async (clientId) => {
    try {
        let query = `
            SELECT clients.*, visits.*
            FROM clients
            LEFT JOIN visits ON visits.patientId = clients.clientId
            WHERE 1=1
        `;

        const params = [];
        if (clientId) {
            query += ' AND clients.clientId = ?';
            params.push(clientId);
        }

        query += ' ORDER BY clients.createdAt DESC';

        const [rows] = await db.query(query, params);

        // Grouping logic
        const clientMap = {};

        for (const row of rows) {
            const id = row.clientId;

            if (!clientMap[id]) {
                clientMap[id] = {
                    clientId: row.clientId,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    email: row.email,
                    phone: row.phone,
                    address: row.address,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                    visits: []
                };
            }

            // If there's a visit (id might be null for LEFT JOIN without match)
            if (row.id) {
                clientMap[id].visits.push({
                    id: row.id,
                    patientId: row.patientId,
                    created_by: row.created_by,
                    diagnosis: row.diagnosis,
                    additional_notes: row.additional_notes,
                    visit_date: row.visit_date,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    signs: parseJSON(row.signs),
                    symptoms: parseJSON(row.symptoms),
                    prescriptions: parseJSON(row.prescriptions)
                });
            }
        }

        return Object.values(clientMap);
    } catch (error) {
        console.error('Error fetching clients:', error);
        throw new Error('Unable to fetch clients');
    }
};

// Helper to parse JSON safely
function parseJSON(value) {
    try {
        return value ? JSON.parse(value) : [];
    } catch (err) {
        return [];
    }
}



const deleteClientModel = async (clientId) => {
    try {
      const query = 'DELETE FROM clients WHERE clientId = ?';
      await db.execute(query, [clientId]);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
};

const updateClientModel = async (clientId, firstName, lastName, email, phone, address) => {
    try {
        let query = 'UPDATE clients SET';
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

        query += ' WHERE clientId = ?';
        queryParams.push(clientId);

        // Execute the update query
        await db.execute(query, queryParams);

        // Fetch the updated list of clients
        const updatedList = await fetchAllClientsModel();
        return updatedList;
    } catch (error) {
        console.error('Error updating client info:', error);
        throw error;
    }
};


module.exports = {
    registerNewClientModel,
    //findClientByName,
    fetchAllClientsModel,
    deleteClientModel,
    updateClientModel
}