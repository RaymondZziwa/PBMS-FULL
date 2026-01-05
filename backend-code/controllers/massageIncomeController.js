const model = require('../models/massage/otherMassageModel')

const getEntries = (req, res) => {
    const {status, startDate, endDate} = req.body
    try {
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error while fetching entries', error });
    }
}

const approveEntry = (req, res)  => {
    try {
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error while approving entry', error });
    }
}

const rejectEntry = (req, res) => {
    try {
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error while rejecting entry', error });
    }
}

const submitEntry = (req, res) => {
    try {
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error while submitting entry', error });
    }
}

const editEntry = (req, res) => {
    try {
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error while editing entry', error });
    }
}

const deleteEntry = (req, res) => {
    try {
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error while deleting entry', error });
    }
}

module.exports = {
    getEntries,
    approveEntry,
    rejectEntry,
    submitEntry,
    editEntry,
    deleteEntry
}