const express = require('express');
const router = express.Router();
const {
    saveData,
    getDataStructure,
    getDataById,
    updateData,
    deleteData
} = require('../controllers/dataController');

// Save extracted data
router.post('/', saveData);

// Get hierarchical structure (Sector -> Company -> Year)
router.get('/structure', getDataStructure);

// Get specific record
router.get('/:id', getDataById);

// Update specific record
router.put('/:id', updateData);

// Delete specific record
router.delete('/:id', deleteData);

module.exports = router;
