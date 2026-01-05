
const db = require('../../config/db_connection');

class Patient {
  static async create(patientData) {
    const { name, email, phone, age, gender, address, medical_history, created_by } = patientData;
    
    const [result] = await db.execute(
      'INSERT INTO clients (name, email, phone, age, gender, address, medical_history, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, age, gender, address, medical_history, created_by]
    );
    
    return { id: result.insertId, ...patientData };
  }

  static async findAll(created_by) {
    const [rows] = await db.execute(
      'SELECT * FROM clients WHERE created_by = ? ORDER BY created_at DESC',
      [created_by]
    );
    return rows;
  }

  static async findById(id, created_by) {
    console.log('id here', id)
    const [rows] = await db.execute(
      'SELECT * FROM clients WHERE clientId = ?',
      [id]
    );
    return rows[0];
  }

  static async update(id, patientData, created_by) {
    const { name, email, phone, age, gender, address, medical_history } = patientData;
    
    const [result] = await db.execute(
      'UPDATE clients SET name = ?, email = ?, phone = ?, age = ?, gender = ?, address = ?, medical_history = ? WHERE clientId = ? AND created_by = ?',
      [name, email, phone, age, gender, address, medical_history, id, created_by]
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id, created_by) {
    const [result] = await db.execute(
      'DELETE FROM clients WHERE clientId = ? AND created_by = ?',
      [id, created_by]
    );
    return result.affectedRows > 0;
  }

  static async search(query, created_by) {
    const searchTerm = `%${query}%`;
    const [rows] = await db.execute(
      'SELECT * FROM clients WHERE created_by = ? AND (name LIKE ? OR email LIKE ? OR phone LIKE ?) ORDER BY created_at DESC',
      [created_by, searchTerm, searchTerm, searchTerm]
    );
    return rows;
  }
}

module.exports = Patient;
