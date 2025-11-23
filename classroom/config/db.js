import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = process.env.CLASSROOM_DB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/classroom_service';
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected (classroom): ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB (classroom): ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;