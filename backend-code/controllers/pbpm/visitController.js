const Patient = require('../../models/pbpm/Patient');
const Visit = require('../../models/pbpm/Visit');

const visitController = {
  // Get all visits for a patient
  getVisitsByPatient: async (req, res) => {
    try {
      const { patientId } = req.params;
      
      // Verify patient belongs to user
      const patient = await Patient.findById(patientId, req.user.id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found or unauthorized'
        });
      }

      const visits = await Visit.findByPatientId(patientId, req.user.id);

      res.json({
        success: true,
        data: visits
      });
    } catch (error) {
      console.error('Get visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch visits',
        error: error.message
      });
    }
  },

  // Get single visit
  getVisit: async (req, res) => {
    try {
      const { id } = req.params;
      const visit = await Visit.findById(id, req.user.id);

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found'
        });
      }

      res.json({
        success: true,
        data: visit
      });
    } catch (error) {
      console.error('Get visit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch visit',
        error: error.message
      });
    }
  },

  // Create visit
  createVisit: async (req, res) => {
    try {
      const { patientId } = req.params;

      // Verify patient belongs to user
      const patient = await Patient.findById(patientId, req.params.patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found or unauthorized'
        });
      }

      const visitData = {
        ...req.body,
        patient_id: patientId,
        created_by: 16
      };


      const visit = await Visit.create(visitData);

      res.status(201).json({
        success: true,
        message: 'Visit created successfully',
        data: visit
      });
    } catch (error) {
      console.error('Create visit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create visit',
        error: error.message
      });
    }
  },

  // Update visit
  updateVisit: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await Visit.update(id, req.body, req.user.id);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Visit updated successfully'
      });
    } catch (error) {
      console.error('Update visit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update visit',
        error: error.message
      });
    }
  },

  // Delete visit
  deleteVisit: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Visit.delete(id, req.user.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Visit deleted successfully'
      });
    } catch (error) {
      console.error('Delete visit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete visit',
        error: error.message
      });
    }
  },

  // Get all visits (for dashboard/analytics)
  getAllVisits: async (req, res) => {
    try {
      const visits = await Visit.findAll(req.user.id);

      res.json({
        success: true,
        data: visits
      });
    } catch (error) {
      console.error('Get all visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch visits',
        error: error.message
      });
    }
  }
};

module.exports = visitController;
