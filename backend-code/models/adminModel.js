const db = require('../config/db_connection');
//const mailService = require('../services/mailService');

const registerEmployee = async (first_name, last_name, gender, nin_number, email, branch, department, role, salary, dob, contact1, contact2) => {
  try {
    const query2 = 'INSERT INTO employees  (first_name, last_name, gender, nin_number, email, branch, department, role, salary, dob, contact1, contact2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);'
    await db.execute(query2, [first_name, last_name, gender, nin_number, email, branch, department, role, salary, dob, contact1, contact2])
    //await mailService.sendWelcomeEmail(data.last_name, data.email, password);

    const updatedUsersList = await getEmployees();
    return {
        statusCode: 201,
        data: updatedUsersList,
    }
  } catch (error) {
    console.error('Error while registering employee:', error);
    return {
        statusCode: 500,
        error: error
    }
  }
};

const deleteEmployee = async (email) => {
  try {
    const query = 'DELETE FROM employees WHERE email = ?';
    await db.execute(query, [email]);
    const updatedUsersList = await getEmployees();
    return updatedUsersList
  } catch (error) {
    console.error('Error while deleting employee:', error);
    return error
  }
};

const getEmployees = async (email) => {
    try {
        let query = 'SELECT employee_id, first_name, last_name, gender, nin_number, email, branch, department, role, salary, dob, contact1, createdAt, status FROM employees WHERE 1=1';

        if (email) {
            query += ` AND email = ?`;
        }

        const params = [];
        if (email) params.push(email);
        
        const [employees] = await db.query(query, params);
        return employees;
    } catch (error) {
        console.error('Error fetching employees:', error);
        throw new Error('Unable to fetch emp;oyees');
    }
};

const updateEmployee = async (data) => {
  try {
    const { employee_id, ...updateData } = data;

    const setParts = Object.entries(updateData)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key} = ${typeof value === 'string' ? `'${value}'` : value}`)
      .join(', ');

    const sql = `UPDATE employees SET ${setParts} WHERE employee_id = ${employee_id}`;
    await db.execute(sql);

    const updatedUserList = await getEmployees();
    return updatedUserList;
  } catch (error) {
    console.error('Error while updating employee:', error);
    return {
      statusCode: 500,
      message: 'Error while updating employee information',
      data: error,
    };
  }
};


const getSalaryDetails = async (startDate, endDate) => {
  try {
    const query = `
      SELECT e.employee_id, e.first_name, e.last_name, e.gender, 
             e.branch, e.department, e.role, e.salary, 
             COALESCE(SUM(al.hours_missed), 0) AS total_hours_missed 
      FROM employees e 
      LEFT JOIN attendance_logs al 
          ON e.employee_id = al.employee_id 
          AND al.log_date BETWEEN ? AND ? 
      GROUP BY e.employee_id, e.first_name, e.last_name, e.gender, 
               e.branch, e.department, e.role, e.salary 
      ORDER BY e.employee_id;`;

    const [results] = await db.execute(query, [startDate, endDate]);
    return results;
  } catch (error) {
    return {
      statusCode: 500,
      message: 'Error while fetching salary details',
      data: error,
    };
  }
}

const savePayroll = async (startDate, endDate, records) => {
  try {
    if (records.length > 0) {
      for (const employee of records) {
        await db.execute(
          `INSERT INTO salary_payments 
          (employee_id, start_date, end_date, amount_paid, balance, deductions, payment_method, transaction_id, cheque_number, cheque_maturity_date, cheque_bank, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            employee.employee_id || null,  // Ensure no undefined values
            startDate || null,
            endDate || null,
            employee.amount_paid ?? 0, // Use 0 if undefined
            employee.balance ?? 0,
            employee.deductions ?? 0,
            employee.payment_method ?? 'Cash', 
            employee.transaction_id ?? null, 
            employee.cheque_number ?? null, 
            employee.cheque_maturity_date ?? null, 
            employee.cheque_bank ?? null, 
            employee.notes ?? null
          ]
        );
      }
    }

    return {
      statusCode: 200,
      message: 'Payroll saved successfully',
    };
  } catch (error) {
    console.error('Error while saving payroll:', error);
    return {
      statusCode: 500,
      message: 'Error while saving payroll',
      data: error.message,
    };
  }
};


const filterPaymentRecords = async (startDate, endDate, payment_status, payment_method) => {
  try {
    let query = `
      SELECT sp.*, u.first_name, u.last_name, u.gender, u.branch, u.department, u.role, u.salary
      FROM salary_payments sp
      JOIN employees u ON sp.employee_id = u.employee_id
      WHERE 1=1`;

    const params = [];

    if (startDate && endDate) {
      query += ` AND sp.created_at BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    if (payment_status) {
      query += ` AND sp.payment_status = ?`;
      params.push(payment_status);
    }

    if (payment_method) {
      query += ` AND sp.payment_method = ?`;
      params.push(payment_method);
    }

    // Log the query and params before executing
    console.log("Executing Query:", query);
    console.log("With Params:", params);

    const [results] = await db.execute(query, params);

    return {
      statusCode: 200,
      message: 'Filtered salary payment records retrieved successfully',
      data: results,
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      message: 'Error while filtering employee payment records',
      data: error,
    };
  }
};


const editPaymentRecord = async (data) => {
  try {
    // Fetch the existing record
    const [record] = await db.execute(
      `SELECT * FROM salary_payments WHERE payment_id = ?`,
      [data.payment_id]
    );

    if (!record || record.length === 0) {
      return {
        statusCode: 404,
        message: 'Payroll record not found',
        data: null,
      };
    }

    const { payment_id, ...newData } = data;

    // Filter out empty values
    const entries = Object.entries(newData).filter(
      ([_, value]) => value !== null && value !== undefined && value !== ''
    );

    if (entries.length === 0) {
      return {
        statusCode: 400,
        message: 'No valid fields provided for update',
        data: null,
      };
    }

    // Construct the SQL update query dynamically
    const setParts = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([_, value]) => value);

    await db.execute(
      `UPDATE salary_payments SET ${setParts} WHERE payment_id = ?`,
      [...values, payment_id]
    );

    return {
      statusCode: 200,
      message: 'Payroll record updated successfully',
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: 'Error while editing payroll record',
      data: error.message,
    };
  }
};

module.exports = {
    registerEmployee,
    deleteEmployee,
    getEmployees,
    updateEmployee,
    editPaymentRecord,
    savePayroll,
    getSalaryDetails,
    filterPaymentRecords
}