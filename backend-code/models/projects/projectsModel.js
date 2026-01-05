const db = require('../../config/db_connection')

const registerNewProjectModel = async (name, price) => {
    try {
      const projectId = `PJ-${Math.floor(Math.random()*10000)}`
      const query = 'INSERT INTO ProjectsItems (productId, productName, unitPrice) VALUES (?, ?, ?)';
      await db.execute(query, [projectId, name, price]);
      const updatedList = fetchAllProjectsModel()
      return updatedList;
    } catch (error) {
        console.error('Error registering project:', error);
        throw error;
    }
};

const findProjectByName = async (name) => {
    try {
        let query = 'SELECT * FROM ProjectsItems WHERE 1=1';

        if (name) {
            query += ` AND LOWER(productName) LIKE ?`;
        }

        const params = [];
        if (name) params.push(`%${name.toLowerCase()}%`);

        const [product] = await db.query(query, params);

        return product;
    } catch (error) {
        console.error('Error finding project:', error);
        throw error;
    }
}

const fetchAllProjectsModel = async (id) => {
    try {
        let query = `
            SELECT sp.*, esi.quantityInStock
            FROM ProjectsItems sp
            LEFT JOIN equatorialProjectsInventory esi ON sp.productId = esi.productId
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
        console.error('Error fetching projects:', error);
        throw new Error('Unable to fetch projects');
    }
}


const deleteProjectModel = async (productId) => {
    try {
      const query = 'DELETE FROM ProjectsItems WHERE productId = ?';
      await db.execute(query, [productId]);
      const updatedList = fetchAllProjectsModel()
      return updatedList;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
};

const updateProjectModel = async (productId, name, price) => {
    try {
        let query = 'UPDATE ProjectsItems SET';
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

        // Fetch the updated list of products
        const updatedList = await fetchAllProjectsModel();
        return updatedList;
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
};

  

module.exports = {
    registerNewProjectModel,
    fetchAllProjectsModel,
    deleteProjectModel,
    updateProjectModel,
    findProjectByName
}