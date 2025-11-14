import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const facultySchema = new mongoose.Schema(
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
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            unique: true,
        },
        deanId: {
            type: String,
            ref: "Teacher",
        },
        establishedAt: {
            type: Date,
        },
        status: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
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

facultySchema.index({ deletedAt: 1 });
facultySchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

facultySchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

facultySchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Faculty = mongoose.model("Faculty", facultySchema);

export default Faculty;