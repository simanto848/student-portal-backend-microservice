import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const courseSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4,
    },
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    credit: {
        type: Number,
        required: true,
    },
    departmentId: {
        type: String,
        required: true,
    },
    courseType: {
        type: String,
        default: "theory",
    },
    deletedAt: {
        type: Date,
    },
});

courseSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

export const Course =
    mongoose.models.Course || mongoose.model("Course", courseSchema);

const batchSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4,
    },
    name: {
        type: String,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    shift: {
        type: String,
        enum: ["day", "evening"],
        required: true,
        default: "day",
    },
    programId: {
        type: String,
        required: true,
    },
    departmentId: {
        type: String,
        required: true,
    },
    sessionId: {
        type: String,
        required: true,
    },
    currentStudents: {
        type: Number,
        default: 0,
    },
    deletedAt: {
        type: Date,
    },
});

batchSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

export const Batch =
    mongoose.models.Batch || mongoose.model("Batch", batchSchema);

const departmentSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4,
    },
    name: {
        type: String,
        required: true,
    },
    shortName: {
        type: String,
        required: true,
    },
    departmentHeadId: {
        type: String,
    },
    deletedAt: {
        type: Date,
    },
});

departmentSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

export const Department =
    mongoose.models.Department || mongoose.model("Department", departmentSchema);
