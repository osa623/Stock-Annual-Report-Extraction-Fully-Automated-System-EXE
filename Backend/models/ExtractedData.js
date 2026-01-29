const mongoose = require('mongoose');

const extractedDataSchema = new mongoose.Schema({
    sector: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['investor_relations', 'financial_statements', 'subsidiary_chart', 'other'],
        default: 'other'
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // Flexible structure for different extraction types
        required: true
    },
    pdfId: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure uniqueness of a specific report type for a company/year unique
// e.g. One Investor Relations report per Company per Year
// Remove this if multiple versions are allowed
extractedDataSchema.index({ sector: 1, company: 1, year: 1, type: 1 });

module.exports = mongoose.model('ExtractedData', extractedDataSchema);
