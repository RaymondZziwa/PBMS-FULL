const db = require('../../config/db_connection');

const registerNewExhibitionModel = async (name, location, date) => {
    try {
        const query = 'INSERT INTO exhibitions (name, location, date) VALUES (?, ?, ?)';
        await db.execute(query, [name, location, date]);
        return await fetchAllExhibitionsModel(); // Await fetch
    } catch (error) {
        console.error('Error registering exhibition:', error);
        throw error;
    }
};

const findExhibitionByName = async (name) => {
    try {
        let query = 'SELECT * FROM exhibitions WHERE 1=1';
        const params = [];

        if (name) {
            query += ' AND LOWER(name) LIKE ?';
            params.push(`%${name.toLowerCase()}%`);
        }

        const [results] = await db.query(query, params);
        return results;
    } catch (error) {
        console.error('Error finding exhibitions:', error);
        throw error;
    }
};

const fetchAllExhibitionsModel = async () => {
    try {
        const query = 'SELECT * FROM exhibitions ORDER BY createdAt DESC';
        const [exhibitions] = await db.query(query);
        return exhibitions;
    } catch (error) {
        console.error('Error fetching exhibitions:', error);
        throw new Error('Unable to fetch exhibitions');
    }
};

const deleteExhibitionModel = async (id) => {
    try {
        const query = 'DELETE FROM exhibitions WHERE id = ?';
        await db.execute(query, [id]);
        return await fetchAllExhibitionsModel();
    } catch (error) {
        console.error('Error deleting exhibition:', error);
        throw error;
    }
};

const updateExhibitionModel = async (id, name, location, date) => {
    try {
        let query = 'UPDATE exhibitions SET';
        const queryParams = [];
        const setStatements = [];

        if (name) {
            setStatements.push('name = ?');
            queryParams.push(name);
        }

        if (location) {
            setStatements.push('location = ?');
            queryParams.push(location);
        }

        if (date) {
            setStatements.push('date = ?');
            queryParams.push(date);
        }

        if (setStatements.length === 0) {
            throw new Error('No fields provided to update');
        }

        query += ` ${setStatements.join(', ')} WHERE id = ?`;
        queryParams.push(id);

        await db.execute(query, queryParams);

        return await fetchAllExhibitionsModel();
    } catch (error) {
        console.error('Error updating exhibition:', error);
        throw error;
    }
};

module.exports = {
    registerNewExhibitionModel,
    findExhibitionByName,
    fetchAllExhibitionsModel,
    deleteExhibitionModel,
    updateExhibitionModel,
};
