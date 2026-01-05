
const User = require('../../models/pbpm/User');

const userController = {
  // Update profile
  updateProfile: async (req, res) => {
    try {
      const { name, email } = req.body;

      if (email !== req.user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({
            success: false,
            message: 'Email is already taken by another user'
          });
        }
      }

      const updated = await User.updateProfile(req.user.id, { name, email });

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update profile'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await User.findById(req.user.id);
      const isValidPassword = await User.verifyPassword(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const updated = await User.updatePassword(req.user.id, newPassword);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update password'
        });
      }

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
};

module.exports = userController;
