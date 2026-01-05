const {
    registerNewExhibitionModel,
    findExhibitionByName,
    fetchAllExhibitionsModel,
    deleteExhibitionModel,
    updateExhibitionModel
} = require('../../models/exhibition/exhibitionModel');

const {recordSale, getExpoSales, getExpoSalesReport} = require('../../models/exhibition/exhibitionSales')
const {stockTakingModel,expoStockMvtModel, fetchAllTransactionsModel} = require('../../models/exhibition/exhibitionInventoryModel')
const {formatDateForMySQL} = require('../../utils/dateConverter')

const registerNewExhibition = async (req, res) => {
    const { name, location, date } = req.body;

    if (!name || !location || !date) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const exhibitions = await registerNewExhibitionModel(name, location, date);
        res.status(201).json({ message: 'Exhibition registered successfully.', exhibitions });
    } catch (error) {
        res.status(500).json({ message: 'Failed to register exhibition', error: error.message });
    }
};

const getAllExhibitions = async (req, res) => {
    try {
        const exhibitions = await fetchAllExhibitionsModel();
        res.status(200).json(exhibitions);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch exhibitions', error: error.message });
    }
};

const searchExhibitionsByName = async (req, res) => {
    const { name } = req.query;
    try {
        const exhibitions = await findExhibitionByName(name);
        res.status(200).json(exhibitions);
    } catch (error) {
        res.status(500).json({ message: 'Search failed', error: error.message });
    }
};

const deleteExhibition = async (req, res) => {
    const { id } = req.body;

    try {
        const exhibitions = await deleteExhibitionModel(id);
        res.status(200).json({ message: 'Exhibition deleted successfully.', exhibitions });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete exhibition', error: error.message });
    }
};

const updateExhibition = async (req, res) => {
    const { id } = req.params;
    const { name, location, date } = req.body;

    try {
        const exhibitions = await updateExhibitionModel(id, name, location, date);
        res.status(200).json({ message: 'Exhibition updated successfully.', exhibitions });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update exhibition', error: error.message });
    }
};


//inventory
const moveStock = async (req, res) => {
    const {expoId, date, category, items, source, notes} = req.body;
    //console.log('mvt', expoId, date, branch, category, items, source, notes)
    try {
        const newStockLevels = await expoStockMvtModel(expoId, new Date(date), category, items, source, notes)

        return res.status(200).json({message: 'Stock moved successfully', data: newStockLevels})
    } catch (error) {
        res.status(500).json({ message: 'Server error while moving stock', error });
        console.log(error)
    }
}

const stockTaking = async (req, res) => {
    try {
        const {expoId} = req.body
        const data = await stockTakingModel(expoId)
        if(!data.length){
            return res.status(400).json({message: 'Error while taking stock'})
        }else{
            return res.status(200).json({message: 'Stock taken successfully', data: data})
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error while stock taking', error });
    }
}

const fetchStockMovementRecords = async (req, res) => {
    try {
        const {expoId} = req.body
        const data = await fetchAllTransactionsModel(expoId)
        return res.status(200).json({message: 'Records fetched successfully', data: data})
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching records', error });
    }
}

//sales
const recordExpoSale = async (req, res) => {
  try {
    const saleData = req.body;
    await recordSale(saleData);
    res.status(201).json({ message: "Sale recorded successfully." });
  } catch (error) {
    console.error("Error recording sale:", error);
    res.status(500).json({ message: "Failed to record sale", error: error.message });
  }
};

const getAllExpoSales = async (req, res) => {
  const { expoId } = req.body;

  try {
    const sales = await getExpoSales(expoId);
    res.status(200).json(sales);
  } catch (error) {
    console.error("Error getting expo sales:", error);
    res.status(500).json({ message: "Failed to get sales", error: error.message });
  }
};

const getAllExpoSalesReport = async (req, res) => {
  try {
    const report = await getExpoSalesReport();
    res.status(200).json(report);
  } catch (error) {
    console.error("Error getting sales report:", error);
    res.status(500).json({ message: "Failed to get sales report", error: error.message });
  }
};


module.exports = {
    moveStock,
    stockTaking,
    fetchStockMovementRecords,
    registerNewExhibition,
    getAllExhibitions,
    searchExhibitionsByName,
    deleteExhibition,
    updateExhibition,
    getAllExpoSalesReport,
    getAllExpoSales,
    recordExpoSale,
    getExpoSalesReport
};
