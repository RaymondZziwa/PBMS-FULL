
const Patient = require('../../models/pbpm/Patient');

const patientController = {
  getPatients: async (req, res) => {
    try {
      const { search } = req.query;
      let patients;

      if (search) {
        patients = await Patient.search(search, req.user.id);
      } else {
        patients = await Patient.findAll(req.user.id);
      }

      res.json({
        success: true,
        data: patients
      });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch patients',
        error: error.message
      });
    }
  },

  // Get single patient
  getPatient: async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await Patient.findById(id, req.user.id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      res.json({
        success: true,
        data: patient
      });
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch patient',
        error: error.message
      });
    }
  },

  // Create patient
  createPatient: async (req, res) => {
    try {
      const patientData = {
        ...req.body,
        created_by: req.user.id
      };

      const patient = await Patient.create(patientData);

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: patient
      });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create patient',
        error: error.message
      });
    }
  },

  // Update patient
  updatePatient: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await Patient.update(id, req.body, req.user.id);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Patient updated successfully'
      });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update patient',
        error: error.message
      });
    }
  },

  // Delete patient
  deletePatient: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Patient.delete(id, req.user.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Patient deleted successfully'
      });
    } catch (error) {
      console.error('Delete patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete patient',
        error: error.message
      });
    }
  }
};

module.exports = patientController;
