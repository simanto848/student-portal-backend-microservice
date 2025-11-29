import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGO_URI : process.env.MONGODB_URI;
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}.cyan.underline.bold`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;

