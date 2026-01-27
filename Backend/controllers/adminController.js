const generateToken = require('../utils/generateToken');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

// @desc    Register a new admin
// @route   POST /api/admin/register
// @access  Public
const registerAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if admin already exists
        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin
        const admin = await Admin.create({
            email,
            password: hashedPassword,
        });

        if (admin) {
            res.status(201).json({
                _id: admin.id,
                email: admin.email,
                token: generateToken(admin._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid admin data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate a admin
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login Attempt: ${email}`);

        // Check for admin email
        const admin = await Admin.findOne({ email });
        console.log(`User found: ${!!admin}`);

        if (admin && (await bcrypt.compare(password, admin.password))) {
            res.json({
                _id: admin.id,
                email: admin.email,
                token: generateToken(admin._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAdmin = async (req, res) => {
    try {
        const response = await Admin.findById(req.params.id);
        res.status(200).json(response);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    registerAdmin,
    loginAdmin,
    getAdmin
};
