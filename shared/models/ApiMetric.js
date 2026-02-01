import mongoose from "mongoose";

const apiMetricSchema = new mongoose.Schema({
    path: {
        type: String,
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    },
    statusCode: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // in milliseconds
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Index for time-range queries and expiration
    }
}, {
    timestamps: true,
    expireAfterSeconds: 60 * 60 * 24 * 30 // Auto-delete metrics after 30 days
});

export default apiMetricSchema;
