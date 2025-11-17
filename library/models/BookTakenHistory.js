import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookTakenHistorySchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        userType: {
            type: String,
            enum: ["student", "teacher", "staff", "admin"],
            required: [true, 'User type is required'],
        },
        borrowerId: {
            type: String,
            required: [true, 'Borrower ID is required'],
        },
        copyId: {
            type: String,
            required: [true, 'Copy ID is required'],
            ref: 'BookCopy',
        },
        libraryId: {
            type: String,
            required: [true, 'Library ID is required'],
            ref: 'Library',
        },
        borrowDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },
        returnDate: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: {
                values: ['borrowed', 'returned', 'overdue', 'lost'],
                message: 'Status must be borrowed, returned, overdue, or lost',
            },
            default: 'borrowed',
        },
        fineAmount: {
            type: Number,
            required: true,
            default: 0.00,
            min: [0, 'Fine amount cannot be negative'],
        },
        finePaid: {
            type: Boolean,
            required: true,
            default: false,
        },
        notes: {
            type: String,
            default: '',
        },
        processedById: {
            type: String,
            default: null,
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

// Indexes
bookTakenHistorySchema.index({ deletedAt: 1 });
bookTakenHistorySchema.index({ borrowerId: 1 });
bookTakenHistorySchema.index({ copyId: 1 });
bookTakenHistorySchema.index({ libraryId: 1 });
bookTakenHistorySchema.index({ status: 1 });
bookTakenHistorySchema.index({ borrowDate: 1 });
bookTakenHistorySchema.index({ dueDate: 1 });
bookTakenHistorySchema.index({ returnDate: 1 });
bookTakenHistorySchema.index({ copyId: 1 }, { unique: true, sparse: true, name: 'unique_copy_borrowing' });


bookTakenHistorySchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

bookTakenHistorySchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const BookTakenHistory = mongoose.model("BookTakenHistory", bookTakenHistorySchema);

export default BookTakenHistory;