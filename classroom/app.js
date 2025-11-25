import express from "express";
import cookieParser from "cookie-parser";
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from "./routes/index.js";
import { ApiResponse, ApiError } from 'shared';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use("/", apiRoutes);

app.get("/health", (req, res) => {
    return res.status(200).json({ message: "Classroom Service Healthy", status: true, statusCode: 200 });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return ApiResponse.error(res, err.message, err.statusCode, err.errors);
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return ApiResponse.validationError(res, 'Validation failed', errors);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return ApiResponse.conflict(res, `${field} already exists`);
    }

    if (err.name === 'CastError') {
        return ApiResponse.badRequest(res, 'Invalid ID format');
    }

    console.error('Unhandled error:', err);
    return ApiResponse.serverError(res, process.env.NODE_ENV === 'development' ? err.message : 'Internal server error');
});

export default app;