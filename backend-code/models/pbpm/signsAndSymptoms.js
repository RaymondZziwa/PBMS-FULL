
const db = require('../../config/db_connection');


class SignsAndSymptoms {

  static async findAllSigns() {
    const [rows] = await db.query(
      'SELECT * FROM signs',
    );
    return rows;
  }
    
  static async findAllSymptoms() {
    const [rows] = await db.query(
      'SELECT * FROM symptoms',
    );
    return rows;
  }

}

module.exports = SignsAndSymptoms
