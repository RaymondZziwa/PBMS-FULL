const db = require('../config/db_connection')

const findUserModel = async (username) => {
    const query = 'SELECT * FROM users WHERE username = ?';
    try {
        const [rows] = await db.query(query, [username]);
        return rows;
    } catch (error) {
        console.log('error occured in the findUser model function', error)
    }
}

const updatePasswordModel = async (newPassword, username) => {
    const query = 'UPDATE users SET password = ? WHERE username = ?';
    try {
        await db.query(query, [newPassword, username]);
    } catch (error) {
        console.log('error occured in the updatePassword model function')
    }
}

module.exports = {
    findUserModel,
    updatePasswordModel,
}