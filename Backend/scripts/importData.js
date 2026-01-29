const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const ExtractedData = require('../models/ExtractedData');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
};

const DATA_DIR = path.resolve(__dirname, '../../annual-report-backend/data/processed');

function traverseDirectores(dir, callback) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            traverseDirectores(fullPath, callback);
        } else if (file.endsWith('.json')) {
            callback(fullPath);
        }
    });
}

function deriveMetadata(filePath) {
    // Relative path from data/processed
    // e.g. investor_relations\Banking\NDB\2024\file.json
    const relativePath = path.relative(DATA_DIR, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length >= 4) {
        // Assumption: Category / Sector / Company / Year / Filename
        return {
            type: parts[0],
            sector: parts[1],
            company: parts[2],
            year: parts[3],
            valid: true
        };
    }
    
    // Fallback for shallow files like statement_jsons/abl_ABL.json
    // Trying to parse from filename if path depth is insufficient
    const fileName = path.basename(filePath, '.json');
    const nameParts = fileName.split('_');
    if(nameParts.length >= 2) {
         return {
            type: parts[0] || 'other',
            sector: 'Uncategorized',
            company: nameParts[0], // Best guess
            year: '2024', // Default or need better heuristic
            valid: true
        };
    }

    return {
        type: 'other',
        sector: 'Uncategorized',
        company: 'Unknown',
        year: 'Unknown',
        valid: true
    };
}

const importData = async () => {
    await connectDB();

    console.log(`Scanning ${DATA_DIR}...`);

    let count = 0;
    
    traverseDirectores(DATA_DIR, (filePath) => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(content);
            const metadata = deriveMetadata(filePath);

            console.log(`Importing: ${path.relative(DATA_DIR, filePath)} -> ${metadata.company}/${metadata.year}`);

            // Upsert
            ExtractedData.findOneAndUpdate(
                { 
                    sector: metadata.sector,
                    company: metadata.company, 
                    year: metadata.year, 
                    type: metadata.type 
                },
                {
                    data: jsonData,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            ).then(() => {
                process.stdout.write('.');
            }).catch(err => {
                console.error(`\nFailed to import ${filePath}:`, err.message);
            });
            
            count++;
        } catch (err) {
            console.error(`\nError processing ${filePath}:`, err.message);
        }
    });

    // Give some time for async mongo ops to finish (simplistic)
    setTimeout(() => {
        console.log(`\n\nTriggered import for ${count} files.`);
        console.log('Press Ctrl+C to exit if it hangs, or wait for operations to complete.');
    }, 2000);
};

importData();
