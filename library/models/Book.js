import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        title: {
            type: String,
            required: [true, 'Book title is required'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
            trim: true,
        },
        author: {
            type: String,
            required: [true, 'Author name is required'],
            maxlength: [100, 'Author name cannot exceed 100 characters'],
            trim: true,
        },
        isbn: {
            type: String,
            unique: true,
            sparse: true,
            maxlength: [20, 'ISBN cannot exceed 20 characters'],
            trim: true,
        },
        publisher: {
            type: String,
            maxlength: [100, 'Publisher name cannot exceed 100 characters'],
            trim: true,
        },
        publicationYear: {
            type: Number,
            min: [1000, 'Publication year must be valid'],
            max: [new Date().getFullYear() + 1, 'Publication year cannot be in the future'],
        },
        edition: {
            type: String,
            maxlength: [50, 'Edition cannot exceed 50 characters'],
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            maxlength: [50, 'Category cannot exceed 50 characters'],
            trim: true,
        },
        subject: {
            type: String,
            maxlength: [100, 'Subject cannot exceed 100 characters'],
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        language: {
            type: String,
            required: true,
            default: 'English',
            maxlength: [30, 'Language cannot exceed 30 characters'],
            trim: true,
        },
        pages: {
            type: Number,
            min: [1, 'Pages must be at least 1'],
        },
        price: {
            type: Number,
            min: [0, 'Price cannot be negative'],
        },
        status: {
            type: String,
            enum: {
                values: ['active', 'inactive', 'archived'],
                message: 'Status must be active, inactive, or archived',
            },
            default: 'active',
        },
        libraryId: {
            type: String,
            required: [true, 'Library ID is required'],
            ref: 'Library',
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
bookSchema.index({ deletedAt: 1 });
bookSchema.index({ title: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ category: 1 });
bookSchema.index({ subject: 1 });
bookSchema.index({ status: 1 });
bookSchema.index({ libraryId: 1 });
bookSchema.index({ title: 1, author: 1, libraryId: 1 }, { unique: true, name: 'unique_book_per_library' });


bookSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

bookSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

// Cascade delete
bookSchema.pre('save', async function(next) {
    if (this.isModified('deletedAt') && this.deletedAt !== null) {
        const BookCopy = mongoose.model('BookCopy');
        const BookTakenHistory = mongoose.model('BookTakenHistory');

        await BookCopy.updateMany(
            { bookId: this._id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );

        await BookTakenHistory.updateMany(
            { bookId: this._id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        );
    }
    next();
});

const Book = mongoose.model("Book", bookSchema);

export default Book;