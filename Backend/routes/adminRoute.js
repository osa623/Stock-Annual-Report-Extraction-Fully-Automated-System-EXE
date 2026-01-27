const express = require('express');
const router = express.Router();
const { registerAdmin, loginAdmin, getAdmin } = require('../controllers/adminController');

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/:id', getAdmin);

module.exports = router;
