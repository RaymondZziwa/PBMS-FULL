const db = require('../../config/db_connection')

const registerNewServiceModel = async (name, price) => {
    try {
      const query = 'INSERT INTO massageServices (productId, productName, unitPrice) VALUES (?, ?, ?)';
       const serviceId = `S-${Math.floor(Math.random()*100)}`
      await db.execute(query, [serviceId, name, price]);
      const updatedList = fetchAllServicesModel()
      return updatedList;
    } catch (error) {
        console.error('Error registering service:', error);
        throw error;
    }
};

const findServiceByName = async (name) => {
    try {
        let query = 'SELECT * FROM massageServices WHERE 1=1';

        if (name) {
            query += ` AND LOWER(productName) LIKE ?`;
        }

        const params = [];
        if (name) params.push(`%${name.toLowerCase()}%`);

        const [product] = await db.query(query, params);

        return product;
    } catch (error) {
        console.error('Error finding service:', error);
        throw error;
    }
}

const fetchAllServicesModel = async (id) => {
    try {
        let query = `
            SELECT * FROM massageServices
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
        console.error('Error fetching services:', error);
        throw new Error('Unable to fetch services');
    }
}


const deleteServiceModel = async (productId) => {
    try {
      const query = 'DELETE FROM massageServices WHERE productId = ?';
      await db.execute(query, [productId]);
      const updatedList = fetchAllServicesModel()
      return updatedList;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
};

const updateServiceModel = async (productId, name, price) => {
    try {
        let query = 'UPDATE massageServices SET';
        const queryParams = [];
        
        if (name) {
            query += ' productName = ?';
            queryParams.push(name);
        }

        if (price) {
            query += name ? ', unitPrice = ?' : ' unitPrice = ?';
            queryParams.push(price);
        }

        query += ' WHERE productId = ?';
        queryParams.push(productId);

        // Execute the update query
        await db.execute(query, queryParams);

        // Fetch the updated list of services
        const updatedList = await fetchAllServicesModel();
        return updatedList;
    } catch (error) {
        console.error('Error updating service:', error);
        throw error;
    }
};

  

module.exports = {
   registerNewServiceModel,
   deleteServiceModel,
   findServiceByName,
   updateServiceModel,
   fetchAllServicesModel
}