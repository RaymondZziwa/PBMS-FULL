const db = ('../../config/db_connection.js')

const registerParticipant = async (username, firstname, lastname, gender, dateofregistration, password) => {
    try {
        const findQuery = 'SELECT * FROM saphroneparticipants WHERE username = ?;';
        const [result] = await db.query(findQuery, [username]);
        if (result.length > 0) {
            return { code: 403, message: 'Username already exists' };
        }else{
            const insertQuery = 'INSERT INTO saphroneparticipants (username, firstname, lastname, gender, dateofregistration, password) VALUES (?, ?, ?, ?, ?, ?);';
            await db.query(insertQuery, [username, firstname, lastname, gender, dateofregistration, password]);

            const [list] = fetchAllParticipants()
            return { code: 200, message: 'Participant registered successfully', data: list };
        }
    } catch (error) {
        console.log('error while registering participant', error)
        throw error
    }
}

const fetchAllParticipants = async () => {
    try {
        const query = `
            SELECT * FROM saphroneparticipants
        `;
        const [results] = await db.execute(query);
        return results
    } catch (error) {
        console.error('Error while fetching participants:', error);
        throw error;   
    }
}

const getSaphroneSales = async () => {
    try {
        const query = `
            SELECT * FROM saphroneperformancerecords JOIN saphroneparticipants
        `;
        const [results] = await db.execute(query);
        return results
    } catch (error) {
        console.error('Error while getting saffron sales:', error);
        throw error;   
    }
}

const getPerformance = async () => {
    try {
        const query = `
                        SELECT * FROM saphroneparticipantperformance 
                        JOIN saphroneparticipants 
                        ON saphroneparticipantperformance.employeeId = saphroneparticipants.employeeId
                    `;
        const [results] = await db.execute(query);
        return results
    } catch (error) {
        console.error('Error while getting saffron performance:', error);
        throw error;   
    }
}

const saveParticipantSale = async (employeeId, date, merchandisesold, points) => {
    try {
      // Step 1: Insert into saphroneperformancerecords table
      await db.query(
        'INSERT INTO saphroneperformancerecords (employeeId, date, merchandisesold) VALUES (?, ?, ?);',
        [employeeId, date, merchandisesold]
      );
  
      // Step 2: Check if the employee exists in saphroneparticipantperformance table
      const [employeeResults] = await db.query(
        'SELECT * FROM saphroneparticipantperformance WHERE employeeId = ?;',
        [employeeId]
      );
  
      if (employeeResults.length > 0) {
        // Employee exists, update the existing record
        const existingQty = employeeResults[0].merchandisesold;
        const existingPoints = employeeResults[0].points;
  
        // Calculate new values
        const newPoints = existingPoints + points;
        const newQty = isNaN(existingQty) || isNaN(merchandisesold)
          ? 0
          : parseFloat(existingQty) + parseFloat(merchandisesold);
  
        // Update the record
        await db.query(
          'UPDATE saphroneparticipantperformance SET merchandisesold = ?, points = ? WHERE employeeId = ?;',
          [newQty, newPoints, employeeId]
        );
      } else {
        // Employee doesn't exist, insert a new record
        await db.query(
          'INSERT INTO saphroneparticipantperformance (employeeId, merchandisesold, points) VALUES (?, ?, ?);',
          [employeeId, merchandisesold, points]
        );
      }
  
      // Return success response
      return { status: 200, msg: 'success' };
    } catch (error) {
      console.error('Error while saving participant sale:', error);
      throw error; // Re-throw the error for handling in the calling function
    }
};

module.exports = {
    registerParticipant,
    fetchAllParticipants,
    getPerformance,
    getSaphroneSales,
    saveParticipantSale
}