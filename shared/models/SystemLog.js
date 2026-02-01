const systemLogSchemaDef = {
    level: {
        type: String,
        enum: ["info", "warn", "error"],
        required: true,
        default: "info"
    },
    message: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    },
    user: {
        type: String,
        default: "system"
    },
    meta: {
        type: Object,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true // Index for time-range queries
    }
};

const systemLogOptions = {
    timestamps: true
};

import mongoose from "mongoose";
// Default export for backward compatibility within 'shared' context or if user upgrade happens
const systemLogSchema = new mongoose.Schema(systemLogSchemaDef, systemLogOptions);

export { systemLogSchemaDef, systemLogOptions };
export default systemLogSchema;
