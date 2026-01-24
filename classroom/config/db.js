import mongoose from "mongoose";
import { config } from "shared";

const connectDB = async () => {
    try {
        const uri = config.db.classroom;
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host} and Database Name: ${conn.connection.name}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB (classroom): ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;