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
            required: [true, 'Library name is required'],
            maxlength: [100, 'Library name cannot exceed 100 characters'],
            trim: true,
        },
        code: {
            type: String,
            required: [true, 'Library code is required'],
            unique: true,
            maxlength: [50, 'Library code cannot exceed 50 characters'],
            trim: true,
            uppercase: true,
        },
        description: {
            type: String,
            default: '',
        },
        address: {
            type: String,
            default: '',
        },
        phone: {
            type: String,
            maxlength: [20, 'Phone number cannot exceed 20 characters'],
            trim: true,
        },
        email: {
            type: String,
            maxlength: [100, 'Email cannot exceed 100 characters'],
            trim: true,
            lowercase: true,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Please provide a valid email address'
            }
        },
        operatingHours: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        maxBorrowLimit: {
            type: Number,
            required: true,
            default: 3,
            min: [1, 'Maximum borrow limit must be at least 1'],
        },
        borrowDuration: {
            type: Number,
            required: true,
            default: 120,
            min: [1, 'Borrow duration must be at least 1 day'],
        },
        finePerDay: {
            type: Number,
            required: true,
            default: 50,
            min: [0, 'Fine per day cannot be negative'],
        },
        status: {
            type: String,
            enum: {
                values: ['active', 'inactive', 'maintenance'],
                message: 'Status must be either active, inactive, or maintenance'
            },
            default: 'active',
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

librarySchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

librarySchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

// Cascade delete
librarySchema.pre('save', async function(next) {
    if (this.isModified('deletedAt') && this.deletedAt !== null) {
        const Book = mongoose.model('Book');
        const BookCopy = mongoose.model('BookCopy');
        const BookTakenHistory = mongoose.model('BookTakenHistory');

        await Book.updateMany(
            { libraryId: this._id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );

        await BookCopy.updateMany(
            { libraryId: this._id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );

        await BookTakenHistory.updateMany(
            { libraryId: this._id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );
    }
    next();
});

const Library = mongoose.model("Library", librarySchema);

export default Library;