const { end } = require('../config/db_connection');
const adminModel = require('../models/adminModel')

const registerNewEmployee = async (req, res) => {
    console.log(req.body)
    const {first_name, last_name, gender, nin_number, email, branch, department, role, salary, dob, contact1, contact2} = req.body;
    try {
      const existingEmployee = await adminModel.getEmployees(email)
      if (existingEmployee.length > 0) {
        res.status(403).json({ message: 'Email is already associated with an employee'}); 
      }
      const result = await adminModel.registerEmployee(first_name, last_name, gender, nin_number, email, branch, department, role, salary, dob, contact1, contact2);
      if(result.statusCode === 201) {
        res.status(201).json({ message: 'Employee successfully registered', data: result.data }); 
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error while registering the employee', error });
    }
};

const editEmployee = async (req, res) => {
    try {
        const employees = await adminModel.getEmployees(req.body.email)
        if (employees.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        const updatedList = await adminModel.updateEmployee(req.body);
        return res.status(200).json({ employees: updatedList, message: 'Employee data has been updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while updating employee', error }); 
    }
}

const deleteEmployee = async (req, res) => {
    const { email } = req.body;

    try {
        const employees = await adminModel.getEmployees(email)
        if (employees.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        await adminModel.deleteEmployee(email);
        return res.status(200).json({ message: 'Employee deleted successfully', employees: employees });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting employees', error }); 
    }
}

const getEmployees = async (req, res) => {
    const { email } = req.body;

    try {
        const employees = await adminModel.getEmployees(email);
        if (employees.length === 0) {
            return res.status(404).json({ message: 'Employees not found' });
        }
        return res.status(200).json({ message: 'Employees fetched succssfully', employees: employees });
    } catch (error) {
        res.status(500).json({ message: 'Server error while finding employees', error }); 
    }
}

const generatePayroll = async (req, res) => {
    const {startDate, endDate, records} = req.body
    try {
        await adminModel.savePayroll(startDate, endDate, records);
        return res.status(201).json({ message: 'Payroll saved succssfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error while saving payroll', error }); 
    }
}

const getSalaryDetails = async (req, res) => {
    const {startDate, endDate} = req.body
    console.log('cont', startDate, endDate)
    try {
        const results = await adminModel.getSalaryDetails(startDate, endDate)
        return res.status(200).json({ message: 'Salary details succssfully', data: results});
    } catch (error) {
        res.status(500).json({ message: 'Error while fetching salary details', error }); 
    }
}

const editSalaryPaymentRecords = async (req, res) => {}

const filterSalaryPaymentRecords = async (req, res) => {
    const {startDate, endDate} = req.body
    console.log('cont34', startDate, endDate)
    try {
        const results = await adminModel.filterPaymentRecords(startDate, endDate)
        return res.status(200).json({ message: 'Payment records fetched successfully', data: results});
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error while filtering salary payment records', error }); 
    }
}

module.exports = { registerNewEmployee, getEmployees, getSalaryDetails, deleteEmployee, editEmployee, generatePayroll, filterSalaryPaymentRecords, editSalaryPaymentRecords };