const userModel = require('../models/authModel')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const login = async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const users = await userModel.findUserModel(username);
      if (users.length === 0) {
        return res.status(404).json({ message: 'There is no account associated with the username you provided.' });
      }
  
      const user = users[0];
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const token = jwt.sign({ username: user.username, role: user.role, branch: user.branch }, 'SECRETKEY', {expiresIn: '9h'});
      res.status(200).json({ token, username: user.username, department: user.department, role: user.role, branch:user.branch, message: 'login successful' });
    } catch (error) {
      res.status(500).json({ message: 'Server error while signing you in', error });
    }
};

const updatePassword = async (req, res) => {
    const { newPassword } = req.body;
    const username = req.user.username;

    try {
        const users = await userModel.findUser(username);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userModel.updatePasswordModel(hashedPassword, username);
        return res.status(200).json({ message: 'Password has been successfully updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating your password', error }); 
    }
}

const resetPassword = async (req, res) => {
    const { username, newPassword } = req.body;

    try {
        const users = await userModel.findUser(username);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await userModel.updatePasswordModel(hashedPassword, username);
        return res.status(200).json({ message: 'Password has been successfully reset' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while reseting your password', error }); 
    }
}

module.exports = { login, updatePassword, resetPassword };