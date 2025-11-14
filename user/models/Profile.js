import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const addressSchema = new mongoose.Schema(
    {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true },
        isPrimary: { type: Boolean, default: false },
    },
    { _id: false },
);

const profileSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: uuidv4,
        },
        user: {
            type: String,
            ref: 'User',
            required: true,
            unique: true,
        },
        firstName: {
            type: String,
            required: [true, 'First name is required.'],
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required.'],
            trim: true,
        },
        middleName: {
            type: String,
            trim: true,
        },
        dateOfBirth: {
            type: Date,
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other'],
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        avatar: {
            type: String,
        },
        addresses: [addressSchema],
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

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
