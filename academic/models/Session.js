import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const sessionSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        name: {
            type: String,
            required: true,
            unique: true,
        },
        year: {
            type: Number,
            required: true,
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
        }
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
)

sessionSchema.index({ deletedAt: 1 });
sessionSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

sessionSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

sessionSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Session = mongoose.model("Session", sessionSchema);

export default Session;