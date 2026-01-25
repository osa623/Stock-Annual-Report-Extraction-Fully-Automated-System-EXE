const express = require('express');
const router = express.Router();
const { setupMFA, verifyAndLogin } = require('../controllers/authController');

router.post('/setup', setupMFA);
router.post('/login', verifyAndLogin);

module.exports = router;