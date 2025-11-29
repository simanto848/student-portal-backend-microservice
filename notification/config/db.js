import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGO_URI : process.env.MONGO_URI;
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error in connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;