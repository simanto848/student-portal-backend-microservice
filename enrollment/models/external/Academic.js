import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const courseSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    credit: {
        type: Number,
        required: true
    },
    departmentId: {
        type: String,
        required: true
    },
    courseType: {
        type: String,
        default: "theory"
    },
    deletedAt: {
        type: Date
    }
});

courseSchema.pre(/^find/, function () {
    this.where({ deletedAt: null });
});

export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);
