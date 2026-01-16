import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const examScheduleSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    batchId: { type: String, required: true },
    courseId: { type: String, required: true },
    semester: { type: Number, required: true },
    examType: {
        type: String,
        enum: ['MIDTERM', 'FINAL', 'IMPROVEMENT'], // Add other types as needed
        required: true
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // Format: "HH:mm"
    endTime: { type: String, required: true },   // Format: "HH:mm"
    roomNo: { type: String, required: true },
    invigilators: [{ type: String }], // Array of Teacher IDs
    createdBy: { type: String, required: true }, // Exam Controller ID
    status: {
        type: String,
        enum: ['DRAFT', 'PUBLISHED'],
        default: 'DRAFT'
    }
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

examScheduleSchema.index({ batchId: 1, semester: 1 });
examScheduleSchema.index({ date: 1 });

const ExamSchedule = mongoose.model('ExamSchedule', examScheduleSchema);
export default ExamSchedule;
