const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const UserSecret = require('../models/UserSecret'); // Use Mongoose Model

// 1. Setup MFA
exports.setupMFA = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const secret = authenticator.generateSecret();

        // Store secret in DB for this user using updateOne with upsert
        await UserSecret.findOneAndUpdate(
            { email },
            { secret, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        const otpauth = authenticator.keyuri(email, 'PrivateApp', secret);
        const qrImage = await qrcode.toDataURL(otpauth);

        res.json({ qrCode: qrImage, message: "Scan this in Google Authenticator" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
};

// 2. Verify Code & Login
exports.verifyAndLogin = async (req, res) => {
    try {
        const { email, token } = req.body;

        const user = await UserSecret.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not set up" });

        const isValid = authenticator.check(token, user.secret);

        if (isValid) {
            const jwtToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '12h' });
            res.json({ success: true, token: jwtToken });
        } else {
            res.status(401).json({ error: "Invalid 6-digit code" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
};