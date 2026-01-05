
const model = require('../../models/pbpm/signsAndSymptoms');

const signsAndSymptomsController = {
  // Get all signs
  getSigns: async (req, res) => {
    try {
      let signs;

     signs = await model.findAllSigns();

      res.json({
        success: true,
        data: signs
      });
    } catch (error) {
      console.error('Get signs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch signs',
        error: error.message
      });
    }
    },
    
      // Get all symptoms
  getSymptoms: async (req, res) => {
    try {
      let symptoms;

      symptoms = await model.findAllSymptoms();

      res.json({
        success: true,
        data: symptoms
      });
    } catch (error) {
      console.error('Get symptoms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch symptoms',
        error: error.message
      });
    }
  },
};

module.exports = signsAndSymptomsController
