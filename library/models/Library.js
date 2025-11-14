import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const librarySchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: Text,
        },
        address: {
            type: Text,
        },
        phone: {
            type: String,
            unique: true,
        },
        email: {
            type: String,
            unique: true,
        },
        operatingHours: {
            type: Number,
        },
        maxBorrowLimit: {
            type: Number,
            required: true,
            default: 5,
        },
        finePerDay: {
            type: Number,
            required: true,
            default: 50,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "maintenance"],
        },
        deletedAt: {
            type: Date,
            default: null,
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
    }
);

librarySchema.index({ deletedAt: 1 });
librarySchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

librarySchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

librarySchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Library = mongoose.model("Library", librarySchema);

export default Library;