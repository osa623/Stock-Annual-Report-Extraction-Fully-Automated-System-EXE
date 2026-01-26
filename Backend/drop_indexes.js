const mongoose = require('mongoose');
const dotenv = require('dotenv');
const UserSecret = require('./models/UserSecret');

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const dropIndexes = async () => {
    await connectDB();
    try {
        console.log('Dropping indexes for usersecrets...');
        await UserSecret.collection.dropIndexes();
        console.log('Indexes dropped successfully.');
    } catch (error) {
        console.error('Error dropping indexes:', error.message);
    } finally {
        mongoose.connection.close();
    }
};

dropIndexes();
