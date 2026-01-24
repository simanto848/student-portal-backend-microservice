import mongoose from "mongoose";
import { config } from "shared";

const connectDB = async () => {
    try {
        const uri = config.db.user;
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database Name: ${conn.connection.name}`);
    } catch (error) {
        console.error(`Error in connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;