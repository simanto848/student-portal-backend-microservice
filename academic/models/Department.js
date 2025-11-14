import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const departmentSchema = new mongoose.Schema(
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
        shortName: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            unique: true,
            required: true,
        },
        phone: {
            type: String,
            unique: true,
        },
        facultyId: {
            type: String,
            required: true,
            ref: "Faculty",
        },
        departmentHeadId: {
            type: String,
            ref: "User"
        },
        isActingHead: {
            type: Boolean,
            default: false,
        },
        status: {
            type: Boolean,
            default: true,
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

departmentSchema.index({ deletedAt: 1 });
departmentSchema.pre(/^find/, function (next) {
    this.where({ deletedAt: null });
    next();
});

departmentSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

departmentSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const Department = mongoose.model("Department", departmentSchema);

export default Department;