import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookCopySchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        copyNumber: {
            type: String,
            required: [true, 'Copy number is required'],
            maxlength: [50, 'Copy number cannot exceed 50 characters'],
            trim: true,
        },
        bookId: {
            type: String,
            required: [true, 'Book ID is required'],
            ref: 'Book',
        },
        libraryId: {
            type: String,
            required: [true, 'Library ID is required'],
            ref: 'Library',
        },
        acquisitionDate: {
            type: Date,
            default: null,
        },
        condition: {
            type: String,
            enum: {
                values: ['excellent', 'good', 'fair', 'poor', 'damaged'],
                message: 'Condition must be excellent, good, fair, poor, or damaged',
            },
            default: 'good',
        },
        location: {
            type: String,
            maxlength: [100, 'Location cannot exceed 100 characters'],
            trim: true,
        },
        status: {
            type: String,
            enum: {
                values: ['available', 'borrowed', 'reserved', 'maintenance', 'lost'],
                message: 'Status must be available, borrowed, reserved, maintenance, or lost',
            },
            default: 'available',
        },
        notes: {
            type: String,
            default: '',
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
bookCopySchema.index({ deletedAt: 1 });
bookCopySchema.index({ copyNumber: 1 });
bookCopySchema.index({ bookId: 1 });
bookCopySchema.index({ libraryId: 1 });
bookCopySchema.index({ status: 1 });
bookCopySchema.index({ condition: 1 });
bookCopySchema.index({ copyNumber: 1, libraryId: 1 }, { unique: true, name: 'unique_copy_number_per_library' });


bookCopySchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

bookCopySchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

// Cascade delete
bookCopySchema.pre('save', async function(next) {
    if (this.isModified('deletedAt') && this.deletedAt !== null) {
        const BookTakenHistory = mongoose.model('BookTakenHistory');
        await BookTakenHistory.updateMany(
            { copyId: this._id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );
    }
    next();
});

const BookCopy = mongoose.model("BookCopy", bookCopySchema);

export default BookCopy;