import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const bookReservationSchema = new mongoose.Schema(
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
        userId: {
            type: String,
            required: [true, 'User ID is required'],
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
        reservationDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        expiryDate: {
            type: Date,
            required: [true, 'Expiry date is required'],
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'fulfilled', 'expired', 'cancelled'],
                message: 'Status must be pending, fulfilled, expired, or cancelled',
            },
            default: 'pending',
        },
        pickupById: {
            type: String,
            default: null,
        },
        fulfilledAt: {
            type: Date,
            default: null,
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
bookReservationSchema.index({ deletedAt: 1 });
bookReservationSchema.index({ userId: 1 });
bookReservationSchema.index({ copyId: 1 });
bookReservationSchema.index({ libraryId: 1 });
bookReservationSchema.index({ status: 1 });
bookReservationSchema.index({ reservationDate: 1 });
bookReservationSchema.index({ expiryDate: 1 });

// Partial unique index: only one active reservation per copy (pending status)
bookReservationSchema.index(
    { copyId: 1 },
    { 
        unique: true,
        partialFilterExpression: {
            status: 'pending',
            deletedAt: null
        },
        name: 'unique_active_reservation'
    }
);

// Compound index for user's active reservations
bookReservationSchema.index({ userId: 1, status: 1 });

bookReservationSchema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
};

bookReservationSchema.methods.restore = function () {
    this.deletedAt = null;
    return this.save();
};

const BookReservation = mongoose.model("BookReservation", bookReservationSchema);

export default BookReservation;
