
const db = require('../../config/db_connection');

class Visit {
  static async create(visitData) {
    console.log('dt', visitData)
    const { patient_id, created_by, signs, symptoms, diagnosis, prescriptions, additionalNotes } = visitData;
    
    const [result] = await db.execute(
      'INSERT INTO visits (patientId, created_by, signs, symptoms, diagnosis, prescriptions, additional_notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [patient_id, created_by, JSON.stringify(signs), JSON.stringify(symptoms), diagnosis, JSON.stringify(prescriptions), additionalNotes]
    );
    
    return { id: result.insertId, ...visitData };
  }

  static async findByPatientId(patient_id, created_by) {
    const [rows] = await db.execute(
      'SELECT v.*, p.name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.patient_id = ? AND v.created_by = ? ORDER BY v.visit_date DESC',
      [patient_id, created_by]
    );
    
    return rows.map(row => ({
      ...row,
      signs: JSON.parse(row.signs || '[]'),
      symptoms: JSON.parse(row.symptoms || '[]'),
      prescriptions: JSON.parse(row.prescriptions || '[]')
    }));
  }

  static async findById(id, created_by) {
    const [rows] = await db.execute(
      'SELECT v.*, p.name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = ? AND v.created_by = ?',
      [id, created_by]
    );
    
    if (rows[0]) {
      return {
        ...rows[0],
        signs: JSON.parse(rows[0].signs || '[]'),
        symptoms: JSON.parse(rows[0].symptoms || '[]'),
        prescriptions: JSON.parse(rows[0].prescriptions || '[]')
      };
    }
    return null;
  }

  static async findAll(created_by) {
    const [rows] = await db.execute(
      'SELECT v.*, p.name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.created_by = ? ORDER BY v.visit_date DESC',
      [created_by]
    );
    
    return rows.map(row => ({
      ...row,
      signs: JSON.parse(row.signs || '[]'),
      symptoms: JSON.parse(row.symptoms || '[]'),
      prescriptions: JSON.parse(row.prescriptions || '[]')
    }));
  }

  static async update(id, visitData, created_by) {
    const { signs, symptoms, diagnosis, prescriptions, additional_notes } = visitData;
    
    const [result] = await db.execute(
      'UPDATE visits SET signs = ?, symptoms = ?, diagnosis = ?, prescriptions = ?, additional_notes = ? WHERE id = ? AND created_by = ?',
      [JSON.stringify(signs), JSON.stringify(symptoms), diagnosis, JSON.stringify(prescriptions), additional_notes, id, created_by]
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id, created_by) {
    const [result] = await db.execute(
      'DELETE FROM visits WHERE id = ? AND created_by = ?',
      [id, created_by]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Visit;
