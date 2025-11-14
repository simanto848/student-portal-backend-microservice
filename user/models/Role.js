// const mongoose = require('mongoose');
// const { v4: uuidv4 } = require('uuid');

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const roleSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        name: {
            type: String,
            required: [true, 'Role name is required.'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
            },
        },
    },
);

const Role = mongoose.model('Role', roleSchema);

export default Role;
