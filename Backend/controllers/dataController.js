const ExtractedData = require('../models/ExtractedData');

// 1. Save Data (Create or Update)
exports.saveData = async (req, res) => {
    try {
        const { sector, company, year, type, data, pdfId } = req.body;

        if (!sector || !company || !year || !type || !data) {
            return res.status(400).json({ error: "Missing required fields: sector, company, year, type, data" });
        }

        // Upsert: Update if exists, Create if not
        const result = await ExtractedData.findOneAndUpdate(
            { sector, company, year, type },
            {
                data,
                pdfId,
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        res.json({ success: true, message: "Data saved successfully", result });
    } catch (error) {
        console.error("Save Data Error:", error);
        res.status(500).json({ error: "Failed to save data" });
    }
};

// 2. Get Folder Structure (Hierarchy for Frontend)
exports.getDataStructure = async (req, res) => {
    try {
        // Aggregate unique Sectors -> Companies -> Years
        const structure = await ExtractedData.aggregate([
            {
                $group: {
                    _id: {
                        sector: "$sector",
                        company: "$company",
                        year: "$year"
                    },
                    types: { $push: { type: "$type", id: "$_id" } }
                }
            },
            {
                $group: {
                    _id: { sector: "$_id.sector", company: "$_id.company" },
                    years: {
                        $push: {
                            year: "$_id.year",
                            files: "$types"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.sector",
                    companies: {
                        $push: {
                            company: "$_id.company",
                            years: "$years"
                        }
                    }
                }
            },
            { $sort: { _id: 1 } } // Sort by Sector
        ]);

        console.log("Aggregation Result:", JSON.stringify(structure, null, 2));
        res.json(structure);
    } catch (error) {
        console.error("Get Structure Error:", error);
        res.status(500).json({ error: "Failed to fetch structure" });
    }
};

// 3. Get Single Record by ID
exports.getDataById = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await ExtractedData.findById(id);

        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }

        res.json(record);
    } catch (error) {
        console.error("Get Data Error:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

// 4. Update Data (Manual Edit)
exports.updateData = async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = req.body; // Only allowing data content update for now

        const updated = await ExtractedData.findByIdAndUpdate(
            id,
            { data, updatedAt: new Date() },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: "Record not found" });
        }

        res.json({ success: true, message: "Data updated", result: updated });
    } catch (error) {
        console.error("Update Data Error:", error);
        res.status(500).json({ error: "Failed to update data" });
    }
};

// 5. Delete Data
exports.deleteData = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ExtractedData.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ error: "Record not found" });
        }

        res.json({ success: true, message: "Record deleted" });
    } catch (error) {
        console.error("Delete Data Error:", error);
        res.status(500).json({ error: "Failed to delete data" });
    }
};
