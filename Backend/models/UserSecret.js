const mongoose = require('mongoose');

const userSecretSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    secret: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UserSecret', userSecretSchema);
